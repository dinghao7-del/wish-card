import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BottomNav } from './BottomNav';
import { motion } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { UserSelector } from './UserSelector';
import { NotificationBell } from './NotificationCenter';
import { CheckCircle2, CloudOff, RefreshCw, Sparkles, WifiOff, X } from 'lucide-react';
import { buildSyncBannerPresentation } from '../lib/syncStatusPresentation';

export function Layout() {
  const location = useLocation();
  const { currentUser, isUserSelectorOpen, setIsUserSelectorOpen, guestMode, logout, syncStatus, syncNow } = useFamily();
  const [showGuestBanner, setShowGuestBanner] = useState(true);

  useEffect(() => {
    setIsUserSelectorOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname, setIsUserSelectorOpen]);

  if (!currentUser && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  const isFullPage = 
    location.pathname === '/switch-profile' || 
    location.pathname === '/welcome' ||
    location.pathname.startsWith('/tasks/new') ||
    location.pathname.startsWith('/tasks/edit/') ||
    location.pathname.startsWith('/rewards/new') ||
    location.pathname.startsWith('/rewards/edit/');

  const syncBannerPresentation = buildSyncBannerPresentation({
    currentUser,
    guestMode,
    isFullPage,
    status: syncStatus,
  });
  const showSyncBanner = syncBannerPresentation.visible;

  const syncBanner = (() => {
    if (syncBannerPresentation.tone === 'offline') {
      return {
        icon: <WifiOff size={14} />,
        text: syncBannerPresentation.text,
        tone: 'bg-amber-50 text-amber-800 border-amber-200',
        action: syncBannerPresentation.actionLabel,
      };
    }
    if (syncBannerPresentation.tone === 'syncing') {
      return {
        icon: <RefreshCw size={14} className="animate-spin" />,
        text: syncBannerPresentation.text,
        tone: 'bg-blue-50 text-blue-800 border-blue-200',
        action: syncBannerPresentation.actionLabel,
      };
    }
    if (syncBannerPresentation.tone === 'error') {
      return {
        icon: <CloudOff size={14} />,
        text: syncBannerPresentation.text,
        tone: 'bg-red-50 text-red-800 border-red-200',
        action: syncBannerPresentation.actionLabel,
      };
    }
    return {
      icon: <CheckCircle2 size={14} />,
      text: syncBannerPresentation.text,
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      action: syncBannerPresentation.actionLabel,
    };
  })();

  return (
    <div
      className="min-h-screen bg-background overflow-x-hidden"
      style={{
        '--app-sticky-top': guestMode && showGuestBanner && !isFullPage ? '3rem' : '0px',
      } as React.CSSProperties}
    >
      {/* 游客模式提示横幅 */}
      {guestMode && showGuestBanner && !isFullPage && (
        <motion.div 
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="ui-guest-banner fixed top-0 left-0 right-0 z-[45] h-12 bg-secondary-container border-b border-secondary/30 px-3 flex items-center justify-between gap-2 max-w-md mx-auto shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles size={16} className="text-secondary shrink-0" />
            <span className="text-safe text-xs font-black leading-snug text-tertiary">
              体验模式 · 数据仅存于本地，注册后可永久保存
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={async () => { await logout(); }}
              className="text-[10px] font-black text-primary bg-white/60 px-2.5 py-1 rounded-full hover:bg-white transition-colors"
            >
              注册
            </button>
            <button 
              onClick={() => setShowGuestBanner(false)}
              className="w-5 h-5 flex items-center justify-center text-tertiary/40 hover:text-tertiary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {showSyncBanner && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "fixed left-0 right-0 z-[45] mx-auto max-w-md border-b px-4 py-2.5 flex items-center justify-between",
            syncBanner.tone
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">{syncBanner.icon}</span>
            <span className="truncate text-xs font-black">{syncBanner.text}</span>
          </div>
          {syncBanner.action && (
            <button
              onClick={() => syncNow()}
              className="ml-3 shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black shadow-sm"
            >
              {syncBanner.action}
            </button>
          )}
        </motion.div>
      )}

      <main className={cn(
        "max-w-md mx-auto",
        !isFullPage && "pb-32",
        !isFullPage && guestMode && showGuestBanner && "pt-12",
        showSyncBanner && "pt-10"
      )}>
        <Outlet />
      </main>
      {!isFullPage && <BottomNav />}
      
      {/* 通知铃铛 - 固定在右上角（首页、任务页、模板库、奖惩页、习惯页、计划页由页面内 header 内置） */}
      {!isFullPage && currentUser && !guestMode && location.pathname !== '/' && location.pathname !== '/tasks' && !location.pathname.includes('templates') && !location.pathname.includes('rewards') && !location.pathname.includes('habits') && !location.pathname.includes('plans') && (
        <div className="fixed top-3 right-3 z-50">
          <NotificationBell />
        </div>
      )}
      
      {!isFullPage && (
        <UserSelector 
          isOpen={isUserSelectorOpen} 
          onClose={() => setIsUserSelectorOpen(false)} 
        />
      )}
    </div>
  );
}
