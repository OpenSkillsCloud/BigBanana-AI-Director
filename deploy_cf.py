import os, hashlib, json, requests, sys, base64, mimetypes

CF_ACCOUNT = "3c64ce099ec4731ebd1d150c057c6f9c"
CF_API_KEY = "3d510548250d4a9e3983aa3d9f1efd23d6f4e"
CF_EMAIL = "kimhoa642004@gmail.com"
PROJECT = "suk-ai-director"
DIST = "dist"

HEADERS = {
    "X-Auth-Email": CF_EMAIL,
    "X-Auth-Key": CF_API_KEY,
}

# Ensure common MIME types are registered
mimetypes.add_type("text/html", ".html")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/x-icon", ".ico")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("text/xml", ".xml")
mimetypes.add_type("text/plain", ".txt")

def get_content_type(filepath):
    """Get proper Content-Type for a file."""
    ext = os.path.splitext(filepath)[1].lower()
    # Special cases
    special = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".xml": "text/xml; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".ico": "image/x-icon",
        ".svg": "image/svg+xml",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".eot": "application/vnd.ms-fontobject",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
    }
    if ext in special:
        return special[ext]
    ct, _ = mimetypes.guess_type(filepath)
    return ct or "application/octet-stream"

def collect_files(dist_dir):
    files = []
    for root, dirs, filenames in os.walk(dist_dir):
        for f in filenames:
            path = os.path.join(root, f)
            rel = "/" + os.path.relpath(path, dist_dir).replace("\\", "/")
            with open(path, "rb") as fh:
                data = fh.read()
            h = hashlib.sha256(data).hexdigest()[:32]
            ct = get_content_type(path)
            files.append({"key": rel, "data": data, "hash": h, "size": len(data), "content_type": ct})
    return files

def main():
    files = collect_files(DIST)
    total_size = sum(f['size'] for f in files)
    print(f"Collected {len(files)} files ({total_size:,} bytes)")
    
    # Print file types for verification
    for f in sorted(files, key=lambda x: x['key']):
        print(f"  {f['key']} -> {f['content_type']} ({f['size']:,} bytes)")

    # Step 1: Get upload token
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/pages/projects/{PROJECT}/upload-token"
    r = requests.get(url, headers=HEADERS)
    if r.status_code != 200:
        print(f"Failed to get upload token: {r.status_code}")
        print(r.text[:500])
        sys.exit(1)
    jwt = r.json()["result"]["jwt"]
    print("\nGot upload JWT")

    # Step 2: Upload files with correct Content-Type metadata
    BUCKET_SIZE = 50 * 1024 * 1024
    buckets = [[]]
    current_size = 0
    for f in files:
        entry_size = len(f["data"]) + 5120
        if current_size + entry_size > BUCKET_SIZE and buckets[-1]:
            buckets.append([])
            current_size = 0
        buckets[-1].append(f)
        current_size += entry_size

    for bi, bucket in enumerate(buckets):
        payload = []
        for f in bucket:
            b64 = base64.b64encode(f["data"]).decode()
            payload.append({
                "key": f["hash"],
                "value": b64,
                "metadata": {"contentType": f["content_type"]},
                "base64": True,
            })
        upload_url = "https://api.cloudflare.com/client/v4/pages/assets/upload"
        ur = requests.post(upload_url, headers={"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}, json=payload)
        if ur.status_code not in (200, 409):
            print(f"Upload bucket {bi+1} failed: {ur.status_code}")
            print(ur.text[:500])
            sys.exit(1)
        print(f"Uploaded bucket {bi+1}/{len(buckets)} ({len(bucket)} files, {sum(len(f['data']) for f in bucket):,} bytes)")

    # Step 3: Upsert hashes
    hashes_url = "https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes"
    hashes_payload = {"hashes": [f["hash"] for f in files]}
    hr = requests.post(hashes_url, headers={"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}, json=hashes_payload)
    print(f"Registered {len(files)} file hashes (status {hr.status_code})")

    # Step 4: Create deployment using multipart form data
    manifest = {f["key"]: f["hash"] for f in files}
    deploy_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/pages/projects/{PROJECT}/deployments"
    deploy_files = {
        'manifest': (None, json.dumps(manifest), 'application/json'),
        'branch': (None, 'main'),
    }
    dr = requests.post(deploy_url, headers=HEADERS, files=deploy_files)
    if dr.status_code not in (200, 201):
        print(f"Deployment failed: {dr.status_code}")
        print(dr.text[:500])
        sys.exit(1)
    result = dr.json().get("result", {})
    print(f"\nDeployment succeeded!")
    print(f"  ID: {result.get('id')}")
    print(f"  URL: {result.get('url')}")
    print(f"  Production: https://{PROJECT}.pages.dev")
    print(f"  Environment: {result.get('environment')}")

if __name__ == "__main__":
    main()
