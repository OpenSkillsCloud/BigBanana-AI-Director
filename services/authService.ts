/**
 * Authentication Service
 * Provides local-storage-based auth with password hashing.
 * Accounts are persisted in IndexedDB under a dedicated store.
 */

export interface UserAccount {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt: number;
  avatar?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserAccount | null;
}

const AUTH_DB_NAME = 'mua2_auth_db';
const AUTH_DB_VERSION = 1;
const USERS_STORE = 'users';
const SESSION_KEY = 'mua2_session';

/* ---- Simple hash (SHA-256 via SubtleCrypto) ---- */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_mua2_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---- IndexedDB helpers ---- */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUTH_DB_NAME, AUTH_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(USERS_STORE)) {
        const store = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGet<T>(store: IDBObjectStore, key: string | IDBKeyRange): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txGetByIndex<T>(store: IDBObjectStore, indexName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const idx = store.index(indexName);
    const req = idx.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txPut(store: IDBObjectStore, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ---- Public API ---- */

export async function register(email: string, password: string, nickname: string): Promise<UserAccount> {
  if (!email || !password || !nickname) throw new Error('所有字段必填');
  if (password.length < 6) throw new Error('密码长度至少6位');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('邮箱格式不正确');

  // Hash password BEFORE opening IDB transaction (async crypto would kill the tx)
  const pwHash = await hashPassword(password);

  const db = await openDB();
  const tx = db.transaction(USERS_STORE, 'readwrite');
  const store = tx.objectStore(USERS_STORE);

  const existing = await txGetByIndex<UserAccount>(store, 'email', email.toLowerCase());
  if (existing) { db.close(); throw new Error('该邮箱已注册'); }

  const user: UserAccount = {
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    email: email.toLowerCase(),
    nickname,
    passwordHash: pwHash,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  await txPut(store, user);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  // Auto-login after registration
  saveSession(user);
  return user;
}

export async function login(email: string, password: string): Promise<UserAccount> {
  if (!email || !password) throw new Error('请输入邮箱和密码');

  // Hash password BEFORE opening IDB transaction
  const pwHash = await hashPassword(password);

  const db = await openDB();
  const tx = db.transaction(USERS_STORE, 'readwrite');
  const store = tx.objectStore(USERS_STORE);

  const user = await txGetByIndex<UserAccount>(store, 'email', email.toLowerCase());
  if (!user) { db.close(); throw new Error('账号不存在'); }

  if (pwHash !== user.passwordHash) { db.close(); throw new Error('密码错误'); }

  user.lastLoginAt = Date.now();
  await txPut(store, user);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  saveSession(user);
  return user;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

function saveSession(user: UserAccount): void {
  const { passwordHash, ...safe } = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...safe, passwordHash: '***' }));
}

/* ---- Demo account seed ---- */
const DEMO_EMAIL = 'admin@muanworld.com';
const DEMO_PASSWORD = 'muan2026';
const DEMO_NICKNAME = '慕安管理员';
const SEED_FLAG = 'mua2_demo_seeded';

/**
 * Seeds a built-in demo account on first visit.
 * Credentials:
 *   Email:    admin@muanworld.com
 *   Password: muan2026
 */
export async function seedDemoAccount(): Promise<void> {
  // Always attempt to ensure the demo account exists, regardless of flag.
  // The flag only prevents redundant hashing on subsequent visits.
  try {
    // Pre-compute hash BEFORE opening any IDB transaction.
    // (Awaiting crypto.subtle inside an IDB tx causes the tx to auto-close.)
    const demoHash = await hashPassword(DEMO_PASSWORD);

    const db = await openDB();
    const tx = db.transaction(USERS_STORE, 'readwrite');
    const store = tx.objectStore(USERS_STORE);

    const existing = await txGetByIndex<UserAccount>(store, 'email', DEMO_EMAIL);
    if (!existing) {
      const user: UserAccount = {
        id: 'user_demo_admin',
        email: DEMO_EMAIL,
        nickname: DEMO_NICKNAME,
        passwordHash: demoHash,
        createdAt: Date.now(),
        lastLoginAt: 0,
      };
      await txPut(store, user);
    }

    // Wait for the transaction to fully complete before closing
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    localStorage.setItem(SEED_FLAG, '1');
  } catch (e) {
    // Remove the flag so we retry on next visit
    localStorage.removeItem(SEED_FLAG);
    console.warn('Demo account seed failed, will retry next visit:', e);
  }
}
