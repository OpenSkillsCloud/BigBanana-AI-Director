import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import logoImg from '../../logo.png';

interface Props {
  onLogin: (user: { email: string; nickname: string }) => void;
  onRegister: (email: string, password: string, nickname: string) => Promise<void>;
  onLoginSubmit: (email: string, password: string) => Promise<void>;
  error: string;
  clearError: () => void;
}

const AuthPage: React.FC<Props> = ({ onLogin, onRegister, onLoginSubmit, error, clearError }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    clearError();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    clearError();

    if (mode === 'register') {
      if (password !== confirmPassword) {
        clearError();
        // set error via parent
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await onLoginSubmit(email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('两次输入的密码不一致');
        }
        await onRegister(email, password, nickname);
      }
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-purple-500/30">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-violet-500/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-indigo-500/5 rounded-full blur-[100px]" />
        {/* Stars */}
        <div className="absolute top-32 left-[15%] w-1 h-1 bg-white/20 rounded-full" />
        <div className="absolute top-48 right-[20%] w-1 h-1 bg-white/30 rounded-full" />
        <div className="absolute top-60 left-[40%] w-0.5 h-0.5 bg-white/15 rounded-full" />
        <div className="absolute top-36 right-[35%] w-1.5 h-1.5 bg-purple-400/20 rounded-full" />
      </div>

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Logo" className="w-8 h-8" />
          <span className="text-base font-bold tracking-wider text-white">慕安世界</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>慕安世界 AI 漫剧生成平台</span>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center relative z-10 pt-16 px-6">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6"
                 style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c084fc' }}>
              <Sparkles className="w-3.5 h-3.5" />
              AI 漫剧生成工作台
            </div>
            <h1 className="text-3xl font-bold mb-3">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h1>
            <p className="text-sm text-zinc-500">
              {mode === 'login'
                ? '登录后开始你的 AI 漫剧创作之旅'
                : '注册即可体验 AI 驱动的漫剧创作工具'
              }
            </p>
          </div>

          {/* Form card */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            {/* Tab switch */}
            <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login'
                  ? 'bg-purple-500/20 text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-white'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register'
                  ? 'bg-purple-500/20 text-purple-400 shadow-sm'
                  : 'text-zinc-500 hover:text-white'
                }`}
              >
                注册
              </button>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 font-medium">昵称</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="你的昵称"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-2 font-medium">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? '至少6位密码' : '输入密码'}
                    required
                    minLength={mode === 'register' ? 6 : undefined}
                    className="w-full pl-11 pr-11 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 font-medium">确认密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? '登录' : '注册'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-zinc-600">
              {mode === 'login' ? (
                <span>还没有账号？<button onClick={() => switchMode('register')} className="text-purple-400 hover:text-purple-300 ml-1">立即注册</button></span>
              ) : (
                <span>已有账号？<button onClick={() => switchMode('login')} className="text-purple-400 hover:text-purple-300 ml-1">去登录</button></span>
              )}
            </div>

            {mode === 'login' && (
              <div className="mt-4 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                <p className="text-[10px] text-zinc-500 text-center mb-2">体验账号</p>
                <div className="flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@muanworld.com'); setPassword('muan2026'); }}
                    className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2"
                  >
                    一键填入体验账号
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-zinc-700 mt-8">&copy; {new Date().getFullYear()} 慕安世界 All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
