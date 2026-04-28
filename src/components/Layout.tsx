import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BottomNav } from './BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { UserSelector } from './UserSelector';

export function Layout() {
  const location = useLocation();
  const { currentUser, isUserSelectorOpen, setIsUserSelectorOpen } = useFamily();


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
      <main className={cn("max-w-md mx-auto", !isFullPage && "pb-32")}>
        <Outlet />
      </main>
      {!isFullPage && <BottomNav />}
      
      {!isFullPage && (
        <UserSelector 
          isOpen={isUserSelectorOpen} 
          onClose={() => setIsUserSelectorOpen(false)} 
        />
      )}
    </div>
  );
}
