import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Folder, ChevronRight, Calendar, AlertTriangle, X, Cpu, Archive, Search, Users, MapPin, Package, Database, Settings, Sun, Moon, Film, Sparkles, ArrowRight, LogOut, ChevronLeft } from 'lucide-react';
import { logout, getSession } from '../services/authService';
import { SeriesProject, AssetLibraryItem, Character, Scene, Prop, ProjectState } from '../types';
import { getAllSeriesProjects, createNewSeriesProject, saveSeriesProject, deleteSeriesProject, createNewSeries, saveSeries, createNewEpisode, saveEpisode, getAllAssetLibraryItems, deleteAssetFromLibrary, exportIndexedDBData } from '../services/storageService';
import { useAlert } from './GlobalAlert';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import logoImg from '../logo.png';

import {
  useBackupTransfer,
  DEFAULT_BACKUP_TRANSFER_MESSAGES,
  globalBackupFileName,
} from '../hooks/useBackupTransfer';

interface Props {
  onOpenProject: (project: ProjectState) => void;
  onShowOnboarding?: () => void;
  onShowModelConfig?: () => void;
}

const Dashboard: React.FC<Props> = ({ onOpenProject, onShowOnboarding, onShowModelConfig }) => {
  const { showAlert } = useAlert();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SeriesProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [libraryItems, setLibraryItems] = useState<AssetLibraryItem[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'character' | 'scene' | 'prop'>('all');
  const [libraryProjectFilter, setLibraryProjectFilter] = useState('all');
  const [assetToUse, setAssetToUse] = useState<AssetLibraryItem | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getAllSeriesProjects();
      setProjects(list);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLibrary = async () => {
    setIsLibraryLoading(true);
    try {
      const items = await getAllAssetLibraryItems();
      setLibraryItems(items);
    } catch (e) {
      console.error('Failed to load asset library', e);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (showLibraryModal) {
      loadLibrary();
    }
  }, [showLibraryModal]);

  const handleCreate = async () => {
    const sp = createNewSeriesProject();
    await saveSeriesProject(sp);
    const s = createNewSeries(sp.id, '第一季', 0);
    await saveSeries(s);
    const ep = createNewEpisode(sp.id, s.id, 1, '第 1 集');
    await saveEpisode(ep);
    navigate(`/project/${sp.id}`);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const confirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === id);
    const projectName = proj?.title || '未命名项目';
    try {
        await deleteSeriesProject(id);
        await loadProjects();
        console.log(`Project "${projectName}" deleted`);
    } catch (error) {
        showAlert(`删除项目失败: ${error instanceof Error ? error.message : '未知错误'}`, { type: 'error' });
    } finally {
        setDeleteConfirmId(null);
    }
  };

  const handleDeleteLibraryItem = (itemId: string) => {
    showAlert('确定从资产库删除该资源吗？', {
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteAssetFromLibrary(itemId);
          setLibraryItems((prev) => prev.filter((item) => item.id !== itemId));
        } catch (error) {
          showAlert(`删除资产失败: ${error instanceof Error ? error.message : '未知错误'}`, { type: 'error' });
        }
      }
    });
  };

  const handleUseAsset = async (projectId: string) => {
    if (!assetToUse) return;
    setAssetToUse(null);
    navigate(`/project/${projectId}`);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getLibraryProjectName = (item: AssetLibraryItem): string => {
    const projectName = typeof item.projectName === 'string' ? item.projectName.trim() : '';
    return projectName || 'Unknown Project';
  };

  const projectNameOptions = Array.from<string>(
    new Set<string>(
      libraryItems.map((item) => getLibraryProjectName(item))
    )
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const filteredLibraryItems = libraryItems.filter((item) => {
    if (libraryFilter !== 'all' && item.type !== libraryFilter) return false;
    if (libraryProjectFilter !== 'all') {
      const projectName = getLibraryProjectName(item);
      if (projectName !== libraryProjectFilter) return false;
    }
    if (!libraryQuery.trim()) return true;
    const query = libraryQuery.trim().toLowerCase();
    return item.name.toLowerCase().includes(query);
  });

  const {
    importInputRef,
    isDataExporting,
    isDataImporting,
    handleExportData,
    handleImportData,
    handleImportFileChange,
  } = useBackupTransfer({
    exporter: exportIndexedDBData,
    exportFileName: globalBackupFileName,
    showAlert,
    messages: DEFAULT_BACKUP_TRANSFER_MESSAGES,
    onImportSuccess: async () => {
      await loadProjects();
      if (showLibraryModal) {
        await loadLibrary();
      }
    },
  });

  const currentUser = getSession();

  const handleLogout = () => {
    showAlert('确定要退出登录吗？', {
      type: 'warning',
      showCancel: true,
      onConfirm: () => {
        logout();
        window.location.reload();
      }
    });
  };

  /* Feature cards for the hero section */
  const features = [
    { icon: '🎬', title: 'AI 剧本拆解', desc: '智能提取角色、场景、分镜' },
    { icon: '🧑‍🎨', title: '角色一致性', desc: '定妆系统保证角色统一' },
    { icon: '🎬', title: '智能分镜', desc: '关键帧驱动视频生成' },
    { icon: '📹', title: '成片导出', desc: '一键合成完整短剧' },
  ];

  /* Showcase examples */
  const showcaseItems = [
    { id: 1, title: '龙太子归来', genre: '古装奇幻', tag: '爆', image: '/showcase/dragon-prince.jpg' },
    { id: 2, title: '都市偶遇', genre: '现代言情', tag: '新', image: '/showcase/city-romance.jpg' },
    { id: 3, title: '赛博命运', genre: '科幻悬疑', tag: '热', image: '/showcase/cyber-destiny.jpg' },
    { id: 4, title: '竹林幽梦', genre: '古装言情', tag: '新', image: '/showcase/bamboo-dream.jpg' },
    { id: 5, title: '暗夜追踪', genre: '动作悬疑', tag: '爆', image: '/showcase/noir-chase.jpg' },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Logo" className="w-8 h-8" />
          <span className="text-base font-bold tracking-wider text-white">慕安世界</span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <span className="text-xs text-zinc-500 mr-2">
              你好, <span className="text-zinc-300">{currentUser.nickname || currentUser.email}</span>
            </span>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-full hover:border-white/20 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>设置</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-full hover:border-white/20 transition-all"
            title={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-red-400 border border-white/10 rounded-full hover:border-red-500/20 transition-all"
            title="退出登录"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-violet-500/6 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          {/* Subtle star dots */}
          <div className="absolute top-32 left-[15%] w-1 h-1 bg-white/20 rounded-full" />
          <div className="absolute top-48 right-[20%] w-1 h-1 bg-white/30 rounded-full" />
          <div className="absolute top-60 left-[40%] w-0.5 h-0.5 bg-white/15 rounded-full" />
          <div className="absolute top-36 right-[35%] w-1.5 h-1.5 bg-purple-400/20 rounded-full" />
          <div className="absolute top-72 left-[60%] w-1 h-1 bg-white/10 rounded-full" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Purple tag pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
               style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c084fc' }}>
            <Sparkles className="w-3.5 h-3.5" />
            # AI 漫剧生成工作台
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
            让 AI 辅助你创作出
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-300 bg-clip-text text-transparent">
              精彩绝伦的短剧
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed">
            从剧本到成片全流程自动化，下一个爆款导演就是你
          </p>

          {/* CTA Button */}
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)', backgroundSize: '200% 200%' }}
          >
            立即体验
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ===== FEATURE CARDS ===== */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="group p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/20 transition-all duration-300">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="text-sm font-semibold text-white mb-1">{f.title}</div>
              <div className="text-xs text-zinc-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SHOWCASE EXAMPLES ===== */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">精选案例</h2>
            <p className="text-xs text-zinc-500">探索 AI 创作的精彩短剧作品</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {showcaseItems.map((item) => (
            <div
              key={item.id}
              className="group flex-shrink-0 w-[200px] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 bg-white/[0.02] transition-all duration-300 cursor-pointer hover:scale-[1.02]"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {item.tag && (
                  <span className={`absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                    item.tag === '爆' ? 'bg-red-500/90 text-white' : item.tag === '热' ? 'bg-orange-500/90 text-white' : 'bg-purple-500/90 text-white'
                  }`}>
                    {item.tag}
                  </span>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-sm font-bold text-white line-clamp-1">{item.title}</div>
                  <div className="text-[10px] text-zinc-400 mt-1">{item.genre}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PROJECTS SECTION ===== */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">我的项目</h2>
            <p className="text-xs text-zinc-500">管理和编辑你的漫剧项目</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-purple-400 border border-purple-500/30 rounded-full hover:bg-purple-500/10 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-6">
              <Film className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm mb-2">还没有项目</p>
            <p className="text-zinc-600 text-xs mb-6">创建第一个项目，开始你的漫剧创作之旅</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              <Plus className="w-4 h-4" />
              创建项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create New Card */}
            <div 
              onClick={handleCreate}
              className="group cursor-pointer rounded-2xl border border-dashed border-white/10 hover:border-purple-500/30 bg-white/[0.01] hover:bg-purple-500/[0.03] flex flex-col items-center justify-center min-h-[240px] transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center mb-4 group-hover:bg-purple-500/10 transition-colors">
                <Plus className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <span className="text-sm text-zinc-500 group-hover:text-purple-400 transition-colors">创建新项目</span>
            </div>

            {/* Project Cards */}
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => navigate(`/project/${proj.id}`)}
                className="group bg-white/[0.02] border border-white/5 hover:border-purple-500/20 rounded-2xl p-0 flex flex-col cursor-pointer transition-all duration-300 relative overflow-hidden h-[240px] hover:bg-white/[0.04]"
              >
                {deleteConfirmId === proj.id && (
                  <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center rounded-full">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-white font-bold text-sm">确认删除项目？</p>
                      <p className="text-zinc-500 text-xs">将删除所有剧集和角色库数据</p>
                    </div>
                    <div className="flex gap-2 w-full pt-2">
                      <button onClick={cancelDelete} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-medium rounded-lg transition-colors">取消</button>
                      <button onClick={(e) => confirmDelete(e, proj.id)} className="flex-1 py-2.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-colors">永久删除</button>
                    </div>
                  </div>
                )}

                <div className="flex-1 p-5 relative flex flex-col">
                  <button onClick={(e) => requestDelete(e, proj.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 text-zinc-600 hover:text-red-400 transition-all rounded-lg z-10" title="删除项目">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 flex items-center justify-center mb-4">
                      <Folder className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{proj.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3 inline mr-1" />{proj.characterLibrary?.length || 0} 角色
                      </span>
                      <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                        <Film className="w-3 h-3 inline mr-1" />多剧集
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">{proj.description}</p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                    <Calendar className="w-3 h-3" />
                    {formatDate(proj.lastModified)}
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-purple-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-xs text-zinc-600">&copy; {new Date().getFullYear()} 慕安世界 All rights reserved.</p>
      </footer>

      {/* ===== SETTINGS MODAL ===== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setShowSettingsModal(false)}>
          <div
            className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
              <Settings className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-base font-bold text-white">系统设置</h2>
                <p className="text-xs text-zinc-500 mt-0.5">管理模型配置、资产库以及数据导入导出</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {onShowModelConfig && (
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    onShowModelConfig();
                  }}
                  className="p-4 border border-white/5 hover:border-purple-500/30 bg-white/[0.02] hover:bg-purple-500/[0.05] rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    模型配置
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">管理模型与 API 设置</div>
                </button>
              )}

              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowLibraryModal(true);
                }}
                className="p-4 border border-white/5 hover:border-purple-500/30 bg-white/[0.02] hover:bg-purple-500/[0.05] rounded-xl transition-all text-left"
              >
                <div className="flex items-center gap-2 text-white text-sm font-semibold">
                  <Archive className="w-4 h-4 text-purple-400" />
                  资产库
                </div>
                <div className="text-xs text-zinc-500 mt-2">浏览并复用角色与场景资产</div>
              </button>

              <button
                onClick={handleExportData}
                disabled={isDataExporting}
                className="p-4 border border-white/5 hover:border-purple-500/30 bg-white/[0.02] hover:bg-purple-500/[0.05] rounded-xl transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 text-white text-sm font-semibold">
                  <Database className="w-4 h-4 text-purple-400" />
                  导出数据
                </div>
                <div className="text-xs text-zinc-500 mt-2">导出全部项目与资产库备份</div>
              </button>

              <button
                onClick={handleImportData}
                disabled={isDataImporting}
                className="p-4 border border-white/5 hover:border-purple-500/30 bg-white/[0.02] hover:bg-purple-500/[0.05] rounded-xl transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 text-white text-sm font-semibold">
                  <Database className="w-4 h-4 text-purple-400" />
                  导入数据
                </div>
                <div className="text-xs text-zinc-500 mt-2">导入全部项目与资产库备份</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSET LIBRARY MODAL ===== */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setShowLibraryModal(false)}>
          <div
            className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLibraryModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-end justify-between border-b border-white/5 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-base font-bold text-white">资产库</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">在项目里将角色与场景加入资产库，跨项目复用</p>
                </div>
              </div>
              <div className="text-xs text-zinc-600">{libraryItems.length} assets</div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="搜索资产名称..."
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40"
                />
              </div>
              <div className="min-w-[180px]">
                <select
                  value={libraryProjectFilter}
                  onChange={(e) => setLibraryProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500/40"
                >
                  <option value="all">全部项目</option>
                  {projectNameOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                {(['all', 'character', 'scene', 'prop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLibraryFilter(type)}
                    className={`px-3 py-2 text-xs font-medium rounded-full transition-all ${
                      libraryFilter === type
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'bg-transparent text-zinc-500 border border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {type === 'all' ? '全部' : type === 'character' ? '角色' : type === 'scene' ? '场景' : '道具'}
                  </button>
                ))}
              </div>
            </div>

            {isLibraryLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
              </div>
            ) : filteredLibraryItems.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-10 text-center text-zinc-500 text-sm">
                暂无资产。可在项目的“角色与场景”中加入资产库。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredLibraryItems.map((item) => {
                  const preview =
                    item.type === 'character'
                      ? (item.data as Character).referenceImage
                      : item.type === 'scene'
                      ? (item.data as Scene).referenceImage
                      : (item.data as Prop).referenceImage;
                  return (
                    <div
                      key={item.id}
                      className="bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all rounded-xl overflow-hidden"
                    >
                      <div className="aspect-video bg-zinc-900">
                        {preview ? (
                          <img src={preview} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            {item.type === 'character' ? (
                              <Users className="w-8 h-8 opacity-30" />
                            ) : item.type === 'scene' ? (
                              <MapPin className="w-8 h-8 opacity-30" />
                            ) : (
                              <Package className="w-8 h-8 opacity-30" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <div className="text-sm text-white font-bold line-clamp-1">{item.name}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {item.type === 'character' ? '角色' : item.type === 'scene' ? '场景' : '道具'}
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-1 line-clamp-1">
                            {(item.projectName && item.projectName.trim()) || '未知项目'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAssetToUse(item)}
                            className="flex-1 py-2 text-xs font-medium text-white rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/20"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                          >
                            选择项目使用
                          </button>
                          <button
                            onClick={() => handleDeleteLibraryItem(item.id)}
                            className="p-2 border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ASSET LIBRARY PROJECT PICKER ===== */}
      {assetToUse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setAssetToUse(null)}>
          <div
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAssetToUse(null)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-4">
              <div className="text-white text-sm font-bold">选择项目使用</div>
              <div className="text-xs text-zinc-500">
                将资产“{assetToUse.name}”导入到以下项目
              </div>
              {projects.length === 0 ? (
                <div className="text-zinc-600 text-sm">暂无项目可用</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => handleUseAsset(proj.id)}
                      className="p-4 text-left border border-white/5 hover:border-purple-500/30 bg-white/[0.02] hover:bg-purple-500/[0.05] rounded-xl transition-all"
                    >
                      <div className="text-sm text-white font-bold line-clamp-1">{proj.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">最后修改: {formatDate(proj.lastModified)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFileChange}
      />
    </div>
  );
};

export default Dashboard;
