/**
 * 全局配置组件
 * 包含 API Key 配置和折扣广告
 */

import React, { useState, useEffect } from 'react';
import { Key, Loader2, CheckCircle, AlertCircle, ExternalLink, Gift, Sparkles } from 'lucide-react';
import { getGlobalApiKey, setGlobalApiKey } from '../../services/modelRegistry';
import { verifyApiKey } from '../../services/modelService';

interface GlobalSettingsProps {
  onRefresh: () => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ onRefresh }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');

  useEffect(() => {
    const currentKey = getGlobalApiKey() || '';
    setApiKey(currentKey);
    if (currentKey) {
      setVerifyStatus('success');
      setVerifyMessage('API Key 已配置');
    }
  }, []);

  const handleVerifyAndSave = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus('error');
      setVerifyMessage('请输入 API Key');
      return;
    }

    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyMessage('');

    try {
      const result = await verifyApiKey(apiKey.trim());
      
      if (result.success) {
        setVerifyStatus('success');
        setVerifyMessage('验证成功！API Key 已保存');
        setGlobalApiKey(apiKey.trim());
        onRefresh();
      } else {
        setVerifyStatus('error');
        setVerifyMessage(result.message);
      }
    } catch (error: any) {
      setVerifyStatus('error');
      setVerifyMessage(error.message || '验证过程出错');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveWithoutVerify = () => {
    if (!apiKey.trim()) return;
    setGlobalApiKey(apiKey.trim());
    setVerifyStatus('success');
    setVerifyMessage('API Key 已保存（未验证）');
    onRefresh();
  };

  const handleClearKey = () => {
    setApiKey('');
    setVerifyStatus('idle');
    setVerifyMessage('');
    setGlobalApiKey('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* 折扣广告卡片 */}
      <div className="bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-[var(--text-primary)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--warning-text)]" />
              慕安世界 API
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mb-3 leading-relaxed">
              支持 GPT-5 系列、Claude 4.6 / 4.5、Gemini 3.1 Pro Preview、Gemini-3、Veo 3.1、Sora-2 等多种模型。
              稳定快速，价格优惠。
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://api.antsk.cn" 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold rounded-lg hover:bg-[var(--btn-primary-hover)] transition-colors inline-flex items-center gap-1.5"
              >
                立即购买
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* API Key 配置 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-[var(--accent-text)]" />
          <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
            全局 API Key
          </label>
        </div>
        
        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setVerifyStatus('idle');
              setVerifyMessage('');
            }}
            placeholder="输入 API 令牌（以 sk- 开头，从「令牌管理」获取）..."
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-primary)] px-4 py-3 text-sm rounded-lg focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-hover)] transition-all font-mono placeholder:text-[var(--text-muted)]"
            disabled={isVerifying}
          />
          
          {/* 状态提示 */}
          {verifyMessage && (
            <div className={`flex items-start gap-2 text-xs ${
              verifyStatus === 'success' ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'
            }`}>
              {verifyStatus === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                {verifyMessage.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
                {verifyStatus === 'error' && (
                  <a href="https://api.antsk.cn" target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1 text-[var(--accent-text)] hover:underline mt-1">
                    前往 AntSK 控制台检查令牌
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 说明文字 */}
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            全局 API Key 用于所有模型调用。你也可以为单个提供商配置独立的 API Key。
          </p>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {getGlobalApiKey() && (
              <button
                onClick={handleClearKey}
                className="flex-1 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider transition-colors rounded-lg border border-[var(--border-primary)]"
              >
                清除 Key
              </button>
            )}
            <button
              onClick={handleVerifyAndSave}
              disabled={isVerifying || !apiKey.trim()}
              className="flex-1 py-3 bg-[var(--accent)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  验证中...
                </>
              ) : (
                '验证并保存'
              )}
            </button>
          </div>
          {/* 验证失败后提供直接保存的选项 */}
          {verifyStatus === 'error' && apiKey.trim() && (
            <button
              onClick={handleSaveWithoutVerify}
              className="w-full py-2.5 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-2"
            >
              跳过验证，直接保存 Key
            </button>
          )}
        </div>
      </div>

      {/* 重要提示：令牌类型区分 */}
      <div className="p-4 bg-[var(--warning-bg,rgba(234,179,8,0.08))]/80 rounded-lg border border-[var(--warning-border,rgba(234,179,8,0.2))]">
        <h4 className="text-xs font-bold text-[var(--warning-text,#eab308)] mb-2">⚠ 注意：请使用正确的令牌</h4>
        <div className="text-[10px] text-[var(--text-muted)] space-y-2 leading-relaxed">
          <p>AntSK 有两种令牌，请确认使用的是 <strong className="text-[var(--text-secondary)]">API 令牌</strong>：</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="p-2.5 bg-[var(--success-bg,rgba(34,197,94,0.08))] border border-[var(--success-border,rgba(34,197,94,0.2))] rounded-lg">
              <p className="font-bold text-[var(--success-text,#22c55e)] mb-1">✓ API 令牌（正确）</p>
              <p>位置：控制台 → <strong>令牌管理</strong></p>
              <p>格式：<code className="font-mono text-[var(--text-secondary)]">sk-xxxxxxxx</code></p>
              <p>用途：调用 AI 模型接口</p>
            </div>
            <div className="p-2.5 bg-[var(--error-bg,rgba(239,68,68,0.08))] border border-[var(--error-border,rgba(239,68,68,0.2))] rounded-lg">
              <p className="font-bold text-[var(--error-text,#ef4444)] mb-1">✗ 系统访问令牌（错误）</p>
              <p>位置：个人设置 → 系统访问令牌</p>
              <p>格式：<code className="font-mono text-[var(--text-secondary)]">xxxx/xxx+xx==</code></p>
              <p>用途：系统管理，非 API 调用</p>
            </div>
          </div>
        </div>
      </div>

      {/* 配置说明 */}
      <div className="p-4 bg-[var(--bg-elevated)]/50 rounded-lg border border-[var(--border-primary)]">
        <h4 className="text-xs font-bold text-[var(--text-tertiary)] mb-2">获取 API 令牌步骤</h4>
        <ol className="text-[10px] text-[var(--text-muted)] space-y-1 list-decimal list-inside">
          <li>登录 <a href="https://api.antsk.cn" target="_blank" rel="noreferrer" className="text-[var(--accent-text)] hover:underline">api.antsk.cn</a></li>
          <li>左侧菜单点击「控制台」→「<strong className="text-[var(--text-secondary)]">令牌管理</strong>」</li>
          <li>点击「创建令牌」或复制已有令牌（以 <code className="font-mono text-[var(--text-secondary)]">sk-</code> 开头）</li>
          <li>粘贴到上方输入框并点击「验证并保存」</li>
        </ol>
      </div>
    </div>
  );
};

export default GlobalSettings;
