import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BottomNav } from './BottomNav';
import { motion } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { UserSelector } from './UserSelector';
import { NotificationBell } from './NotificationCenter';
import { Sparkles, X } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const { currentUser, isUserSelectorOpen, setIsUserSelectorOpen, guestMode, logout } = useFamily();
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* 游客模式提示横幅 */}
      {guestMode && showGuestBanner && !isFullPage && (
        <motion.div 
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-[#FFF9C4] to-[#FFF176] border-b border-[#FBC02D]/30 px-4 py-2.5 flex items-center justify-between max-w-md mx-auto"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#F9A825]" />
            <span className="text-xs font-black text-[#5D4037]">
              体验模式 · 数据仅存于本地，注册后可永久保存
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={async () => { await logout(); }}
              className="text-[10px] font-black text-[#2E7D32] bg-white/60 px-2.5 py-1 rounded-full hover:bg-white transition-colors"
            >
              注册
            </button>
            <button 
              onClick={() => setShowGuestBanner(false)}
              className="w-5 h-5 flex items-center justify-center text-[#5D4037]/40 hover:text-[#5D4037] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      <main className={cn("max-w-md mx-auto", !isFullPage && (guestMode && showGuestBanner ? "pt-10 pb-32" : "pb-32"))}>
        <Outlet />
      </main>
      {!isFullPage && <BottomNav />}
      
      {/* 通知铃铛 - 固定在右上角 */}
      {!isFullPage && currentUser && (
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
