import React, { useState, useEffect } from 'react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Star, Eraser, Delete, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Member } from '../types';
import { useNavigate } from 'react-router-dom';
import { TextAvatar } from './TextAvatar';

interface UserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSelector({ isOpen, onClose }: UserSelectorProps) {
  const { members, currentUser, setCurrentUser } = useFamily();
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  // Reset internal state when modal closes to prevent UI soft-locks
  useEffect(() => {
    if (!isOpen) {
      // Small timeout to allow exit animation to play out
      const timer = setTimeout(() => {
        setSelectedUser(null);
        setPin('');
        setError(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (selectedUser) {
          const isValidPin = newPin === selectedUser.pin;
          const isValidPasswordAsPin = newPin === selectedUser.password?.slice(0, 4);
          
          if (isValidPin || isValidPasswordAsPin) {
            setCurrentUser(selectedUser);
            onClose(); 
          } else {
            setError(true);
            setTimeout(() => setPin(''), 500);
          }
        }
      }
    }
  };

  const handleProfileClick = (member: Member) => {
    if (member.id === currentUser?.id) {
        onClose();
        return;
    }

    // Only prompt for PIN if a specific 4-digit PIN is set.
    // If they only have a login password but no PIN, we allow direct switching for now
    // to avoid the numeric pad lockout.
    const hasPin = member.pin && member.pin.trim() !== '' && member.pin.length === 4;
                        
    if (!hasPin) {
      setCurrentUser(member);
      onClose();
      return;
    }

    setSelectedUser(member);
    setPin('');
    setError(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-outline-variant/20 rounded-full mx-auto mb-6 sm:hidden" />
            
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-primary">切换用户</h2>
                <p className="text-on-surface-variant font-bold text-xs mt-1">今天是谁在探索森林花园？</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {members.map((member) => (
                <motion.button 
                  key={member.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleProfileClick(member)}
                  className={cn(
                    "bg-surface rounded-[2rem] p-4 flex flex-col items-center gap-3 transition-all shadow-sm border-2",
                    currentUser?.id === member.id ? "border-primary bg-primary/5" : "border-outline-variant/10 hover:border-primary/30"
                  )}
                >
                  <div className="relative">
                    <TextAvatar 
                      src={member.avatar}
                      name={member.name} 
                      size={64} 
                      className={cn(
                        "border-4",
                        currentUser?.id === member.id ? "border-primary" : "border-surface"
                      )} 
                    />
                    {member.role === 'parent' && (
                      <div className="absolute -bottom-1 -right-1 bg-secondary-container text-secondary p-1 rounded-full shadow-md border border-surface dark:border-surface">
                        <Shield size={10} />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-black block truncate w-full max-w-[80px]">{member.name}</span>
                    <div className="flex items-center justify-center gap-1 text-on-surface-variant/40 mt-0.5">
                      <Star size={8} className="fill-current" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">{member.stars}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
              
              <button 
                onClick={() => {
                    onClose();
                    navigate('/profile/members/add');
                }}
                className="bg-surface-container/30 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant/30 hover:bg-surface-container transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary">
                  <UserPlus size={20} />
                </div>
                <span className="text-[10px] font-black text-on-surface-variant">添加成员</span>
              </button>
            </div>

            {/* PIN Entry logic moved into Sub-modal or same modal */}
            <AnimatePresence>
              {selectedUser && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="absolute inset-0 bg-background overflow-y-auto z-10 p-8 flex flex-col"
                >
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
                  >
                    <X size={20} />
                  </button>

                  <div className="flex flex-col items-center mb-8 mt-4">
                    <div className="mb-4 shadow-lg">
                      <TextAvatar src={selectedUser.avatar} name={selectedUser.name} size={80} className="border-4 border-primary/20" />
                    </div>
                    <h3 className="text-xl font-black">输入 {selectedUser.name} 的密码</h3>
                    <p className="text-xs text-on-surface-variant font-bold mt-1 text-center">
                      {selectedUser.role === 'parent' ? '🔒 这是个森林守护者账号' : '🔓 快来解锁你的探险之路'}
                    </p>
                  </div>

                  <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map(i => (
                        <motion.div 
                          key={i}
                          animate={error ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                          className={cn(
                            "w-4 h-4 rounded-full border-2 transition-all duration-200",
                            pin.length > i ? "bg-primary border-primary scale-110" : "bg-transparent border-outline-variant",
                            error && "border-red-500"
                          )}
                        />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button 
                        key={num}
                        onClick={() => handlePinInput(num.toString())}
                        className="aspect-square rounded-2xl bg-surface-container-low text-lg font-black flex items-center justify-center hover:bg-primary/10 hover:text-primary active:scale-90 transition-all border border-outline-variant/5"
                      >
                        {num}
                      </button>
                    ))}
                    <button 
                       onClick={() => setPin('')}
                       className="aspect-square rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 hover:text-red-500 active:scale-90 transition-all border border-outline-variant/5"
                    >
                      <Eraser size={18} />
                    </button>
                    <button 
                       onClick={() => handlePinInput('0', { defaultValue: '0' })}
                       className="aspect-square rounded-2xl bg-surface-container-low text-lg font-black flex items-center justify-center hover:bg-primary/10 hover:text-primary active:scale-90 transition-all border border-outline-variant/5"
                    >
                      0
                    </button>
                    <button 
                       onClick={() => setPin(prev => prev.slice(0, -1))}
                       className="aspect-square rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 hover:text-orange-500 active:scale-90 transition-all border border-outline-variant/5"
                    >
                      <Delete size={18} />
                    </button>
                  </div>
                  
                  {error && (
                    <p className="text-red-500 text-[10px] font-black text-center mt-4 animate-bounce">密码错误，请森林探险家再试一次 🍃</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
