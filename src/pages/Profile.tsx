import React, { useState, useRef } from 'react';
import { Settings, Shield, Moon, Bell, Edit3, UserPlus, LogOut, ChevronRight, MessageSquare, Headset, Download, Upload, X, Link, HardDrive, Share2, Copy, Check } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TextAvatar } from '../components/TextAvatar';
import * as api from '../lib/api';

export function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, members, tasks, rewards, isDarkMode, toggleDarkMode, setIsUserSelectorOpen, logout, familyId } = useFamily();
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    tasks: true,
    rewards: true,
  });
  const [urlImportData, setUrlImportData] = useState<api.ImportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFilteredData = (): api.ImportData & { timestamp: string; version: string } => {
    const data: api.ImportData & { timestamp: string; version: string } = {
      timestamp: new Date().toISOString(),
      version: '2.0',
    };
    if (shareConfig.tasks) {
      data.tasks = tasks.map(t => ({
        title: t.title,
        description: t.description || undefined,
        star_amount: t.rewardStars,
        assignee_ids: t.assigneeIds,
        icon: t.icon || undefined,
        is_habit: t.isHabit || undefined,
      }));
    }
    if (shareConfig.rewards) {
      data.rewards = rewards.map(r => ({
        name: r.name,
        description: r.description || undefined,
        star_cost: r.cost,
        icon: r.icon || undefined,
        image_url: r.image || undefined,
        category: r.category || undefined,
      }));
    }
    return data;
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const data = getFilteredData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed, please try again');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyShareLink = () => {
    const data = getFilteredData();
    const base64Data = btoa(encodeURIComponent(JSON.stringify(data)));
    const shareUrl = `${window.location.origin}/import?data=${base64Data}`;
    
    if (shareUrl.length > 2000) {
      alert('分享内容过多，链接过长可能无法正常使用，建议使用文件备份。');
    }

    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const executeImport = async (data: api.ImportData) => {
    if (!familyId || !currentUser) {
      alert('请先登录后再导入数据');
      return;
    }
    try {
      await api.bulkImport(familyId, data, currentUser.id);
      window.location.reload();
    } catch (err: any) {
      alert(`导入失败: ${err.message}`);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        let message = t('profile.import.confirm_msg') + '\n\n';
        if (data.members) message += t('profile.import.items.members') + '\n';
        if (data.tasks) message += t('profile.import.items.tasks') + '\n';
        if (data.rewards) message += t('profile.import.items.rewards') + '\n';
        if (data.history) message += t('profile.import.items.history') + '\n';
        message += '\n' + t('profile.import.warning');

        if (confirm(message)) {
          await executeImport(data);
        }
      } catch (err) {
        alert('Parse failed');
      }
    };
    reader.readAsText(file);
  };

  const handleUrlImportPreview = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    setUrlImportData(null);
    try {
      const response = await fetch(importUrl);
      const data = await response.json();
      setUrlImportData(data);
    } catch (err) {
      alert('无法获取链接数据，请检查链接是否有效');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLogout = (username?: string) => {
    const doLogout = () => {
      logout();
      navigate('/welcome', { state: { initialUsername: username } });
    };

    if (username) {
      // If clicking a member card, we might skip confirm or use a different message
      doLogout();
    } else if (confirm(t('profile.logout.confirm'))) {
      doLogout();
    }
  };

  return (
    <div className="px-6 pb-12 animate-in fade-in slide-in-from-left-4 duration-500 min-h-screen bg-background text-on-surface">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <div className="flex items-center gap-3">
          <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={32} />
          <h1 className="font-bold text-lg text-on-surface">{t('profile.title')}</h1>
        </div>
        <button 
           onClick={() => navigate('/settings/notifications')}
           className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
        >
          <Bell size={22} />
        </button>
      </header>

      {/* Profile Hero */}
      <section className="relative mb-12 flex flex-col items-center mt-8">
          <button 
            onClick={() => navigate('/profile/edit')}
            className="relative group cursor-pointer transition-transform hover:scale-105"
          >
            <div className="w-36 h-36 flex items-center justify-center relative z-10">
              <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={144} className="border-4 border-white dark:border-surface-container-highest shadow-xl" />
            </div>
            <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#e6d64d] rounded-full shadow-lg flex items-center justify-center text-black border-2 border-white dark:border-surface-container-highest z-20">
              <Edit3 size={18} strokeWidth={2.5} />
            </div>
          </button>
        
        <h2 className="text-3xl font-black text-on-surface mt-4 mb-2">{currentUser?.name}</h2>
      </section>

      <AnimatePresence>
        {isImportExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 outline-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportExportOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-surface-container rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-black text-on-surface">{t('profile.menu.share_backup')}</h3>
                  <button 
                    onClick={() => setIsImportExportOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container dark:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-on-surface-variant/50 font-bold">{t('profile.menu.share_backup_desc')}</p>
              </div>

              <div className="p-8 pt-0 space-y-6">
                {/* Content Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Settings size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-sm">{t('profile.share.select_content')}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'tasks', label: t('profile.import.items.tasks').replace('• ', ''), icon: Settings },
                      { id: 'rewards', label: t('profile.import.items.rewards').replace('• ', ''), icon: Shield },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setShareConfig(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof shareConfig] }))}
                        className={cn(
                          "flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm font-bold",
                          shareConfig[item.id as keyof typeof shareConfig]
                            ? "bg-emerald-50/50 border-emerald-500 text-emerald-600 dark:bg-emerald-500/10"
                            : "bg-surface-container border-transparent text-on-surface-variant/40"
                        )}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shared Link Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Share2 size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-sm">{t('profile.share.link_title')}</span>
                  </div>
                  
                  <button 
                    onClick={handleCopyShareLink}
                    className="w-full py-4 bg-[#FF6B00] text-white rounded-2xl font-black text-base shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {copySuccess ? <Check size={20} /> : <Share2 size={20} />}
                    {copySuccess ? t('profile.share.link_copied') : t('profile.share.copy_link')}
                  </button>
                </div>

                {/* Backup & Restore Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                      <Download size={16} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-sm">{t('profile.menu.share_backup')}</span>
                  </div>
                  
                  <div className="p-6 bg-surface-container-high dark:bg-white/5 rounded-[2.5rem] space-y-4 border border-outline-variant/10">
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex-1 py-3.5 bg-[#3B82F6] text-white rounded-xl font-black text-sm active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {t('profile.export.download')}
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3.5 bg-[#10B981] text-white rounded-xl font-black text-sm active:scale-[0.98] transition-all"
                      >
                        {t('profile.import.upload')}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <input 
                          type="url"
                          placeholder="或粘贴还原链接地址..."
                          value={importUrl}
                          onChange={(e) => {
                            setImportUrl(e.target.value);
                            setUrlImportData(null);
                          }}
                          className="w-full bg-white dark:bg-surface-container-high rounded-xl p-3.5 pr-12 font-bold text-xs outline-none transition-all placeholder:text-on-surface-variant/30 border border-outline-variant/20 focus:border-primary"
                        />
                        <button 
                          onClick={handleUrlImportPreview}
                          disabled={isImporting || !importUrl}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary disabled:opacity-30 transition-all font-black"
                        >
                          {isImporting ? '...' : <Link size={18} />}
                        </button>
                      </div>

                      {urlImportData && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-primary/5 rounded-2xl p-4 border border-primary/20"
                        >
                          <div className="text-[10px] font-black text-primary mb-2 uppercase tracking-wider">{t('profile.import.confirm_title')}</div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {urlImportData.members && <span className="bg-white/80 dark:bg-white/10 px-2 py-1 rounded-md text-[10px] font-bold">{t('profile.import.items.members').replace('• ', '')}</span>}
                            {urlImportData.tasks && <span className="bg-white/80 dark:bg-white/10 px-2 py-1 rounded-md text-[10px] font-bold">{t('profile.import.items.tasks').replace('• ', '')}</span>}
                            {urlImportData.rewards && <span className="bg-white/80 dark:bg-white/10 px-2 py-1 rounded-md text-[10px] font-bold">{t('profile.import.items.rewards').replace('• ', '')}</span>}
                            {urlImportData.history && <span className="bg-white/80 dark:bg-white/10 px-2 py-1 rounded-md text-[10px] font-bold">{t('profile.import.items.history').replace('• ', '')}</span>}
                          </div>
                          <button 
                            onClick={() => executeImport(urlImportData)}
                            className="w-full py-2 bg-primary text-on-primary rounded-lg text-xs font-black active:scale-95 transition-all"
                          >
                            {t('profile.import.action')}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-on-surface-variant/40 font-bold leading-relaxed text-center px-4">
                  {t('profile.import.warning')}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Family Members */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-black text-lg text-on-surface">{t('profile.members.title')}</h3>
          <button 
            onClick={() => navigate('/profile/members/add')}
            className="text-primary text-sm font-black flex items-center gap-1.5 hover:opacity-70 transition-opacity"
          >
            <UserPlus size={18} strokeWidth={2.5} /> {t('profile.members.add')}
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
          {members.map(member => (
            <motion.div 
              key={member.id} 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/profile/members/${member.id}`)}
              className={cn(
                "min-w-[90px] flex flex-col items-center bg-white dark:bg-surface-container-low rounded-[1.8rem] p-3 shadow-sm border transition-all cursor-pointer relative",
                currentUser?.id === member.id ? "border-[#98EE99] bg-[#E8F5E9]/30 dark:bg-[#E8F5E9]/10 shadow-md" : "border-outline-variant/10"
              )}
            >
              <TextAvatar src={member.avatar} name={member.name} size={48} className="mb-2" />
              <span className="font-black text-[13px] mb-1 text-on-surface truncate w-full text-center">{member.name}</span>
              <div className="bg-surface-container px-2 py-0.5 rounded-full">
                <span className="text-[9px] font-black text-success whitespace-nowrap">{member.stars} {t('common.stars_suffix')}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Menu Groups */}
      <section className="space-y-4">
        <div className="bg-white dark:bg-surface-container-low rounded-[2.5rem] shadow-sm border border-outline-variant/5 dark:border-outline-variant/10 overflow-hidden p-2">
          <MenuLink icon={Shield} label={t('profile.menu.security')} onClick={() => navigate('/settings/security')} />
          <MenuLink icon={Download} label={t('profile.menu.share_backup')} desc={t('profile.menu.share_backup_desc')} onClick={() => setIsImportExportOpen(true)} />
          <MenuLink icon={Bell} label={t('profile.menu.notifications')} desc={t('settings.notifications.subtitle')} onClick={() => navigate('/settings/notifications')} />
          <MenuLink icon={MessageSquare} label={t('profile.menu.feedback')} onClick={() => navigate('/support/feedback')} />
        </div>
        
        <div className="bg-white dark:bg-surface-container-low rounded-[2.5rem] shadow-sm border border-outline-variant/5 dark:border-outline-variant/10 overflow-hidden p-2">
          <MenuLink icon={Moon} label={t('profile.menu.dark_mode')} isToggle active={isDarkMode} onToggle={toggleDarkMode} />
          <MenuLink icon={Settings} label={t('profile.menu.basic_settings')} onClick={() => navigate('/settings/basic')} />
        </div>
      </section>

      <div className="mt-auto pt-12 flex justify-center pb-8 sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent">
        <button 
          onClick={handleLogout}
          className="bg-red-50 dark:bg-red-500/10 px-10 py-3.5 rounded-full flex items-center gap-2 shadow-sm border border-red-100 dark:border-red-500/20 active:scale-95 transition-all"
        >
          <LogOut size={18} className="text-red-500" />
          <span className="text-base font-black text-red-600 dark:text-red-400 tracking-wide">
            {t('profile.action.logout')}
          </span>
        </button>
      </div>
    </div>
  );
}

function MenuLink({ icon: Icon, label, desc, isToggle, active, onToggle, onClick, iconBg, iconColor }: any) {
  return (
    <div 
      onClick={!isToggle ? onClick : onToggle}
      className={cn(
        "flex items-center justify-between p-5 hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors cursor-pointer group rounded-[2rem] text-on-surface",
        isToggle && "cursor-default" 
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
          iconBg || "bg-surface-container",
          iconColor || "text-primary",
          !iconBg && "group-hover:bg-primary/10"
        )}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-base text-on-surface">{label}</span>
          {desc && <span className="text-xs text-on-surface-variant/50 font-bold">{desc}</span>}
        </div>
      </div>
      {isToggle ? (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "w-12 h-7 rounded-full relative p-1 flex items-center transition-colors cursor-pointer",
            active ? "bg-primary" : "bg-surface-container-highest"
          )}
        >
          <motion.div 
            animate={{ x: active ? 20 : 0 }}
            className="w-5 h-5 bg-white rounded-full shadow-sm"
          ></motion.div>
        </div>
      ) : (
        <ChevronRight size={18} className="text-outline-variant" />
      )}
    </div>
  );
}
