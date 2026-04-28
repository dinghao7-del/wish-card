import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Star, UserPlus, Shield, X, Delete, Eraser } from 'lucide-react';
import { cn } from '../lib/utils';
import { Member } from '../types';
import { TextAvatar } from '../components/TextAvatar';

export function SwitchProfile() {
  const navigate = useNavigate();
  const { members, currentUser, setCurrentUser } = useFamily();
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Clear local state when unmounting
  useEffect(() => {
    return () => {
      setSelectedUser(null);
      setPin('');
      setError(false);
    };
  }, []);

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
            setSelectedUser(null);
            setCurrentUser(selectedUser);
            navigate('/', { replace: true });
          } else {
            setError(true);
            setTimeout(() => setPin(''), 500);
          }
        }
      }
    }
  };

  const handleProfileClick = (member: Member) => {
    // Only prompt for PIN if a specific 4-digit PIN is set.
    const hasPin = member.pin && member.pin.trim() !== '' && member.pin.length === 4;
    
    if (!hasPin) {
      setCurrentUser(member);
      navigate('/');
      return;
    }
    
    setSelectedUser(member);
    setPin('');
    setError(false);
  };

  return (
    <div className="px-6 py-8 flex flex-col items-center min-h-screen bg-background overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 h-16 bg-background/80 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-lg tracking-tight">切换用户</h1>
        <div className="w-10" />
      </header>

      <div className="w-full max-w-md pt-20 flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tight text-primary">你好 👋</h2>
          <p className="text-on-surface-variant font-bold mt-2">今天是谁在探索森林花园？</p>
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-2 gap-6">
          {members.map((member) => (
            <motion.button 
              key={member.id}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleProfileClick(member)}
              className={cn(
                "bg-white rounded-[2.5rem] p-6 flex flex-col items-center gap-4 transition-all shadow-sm border-2",
                currentUser?.id === member.id ? "border-primary shadow-lg shadow-primary/10" : "border-outline-variant/10 hover:border-primary/30"
              )}
            >
              <div className="relative">
                <TextAvatar 
                  src={member.avatar}
                  name={member.name} 
                  size={96} 
                  className={cn(
                    "border-4",
                    currentUser?.id === member.id ? "border-primary" : "border-white"
                  )} 
                />
                {member.role === 'parent' && (
                  <div className="absolute -bottom-2 -right-2 bg-secondary-container text-secondary p-1.5 rounded-full shadow-md border border-white">
                    <Shield size={14} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-lg font-black block">{member.name}</span>
                <div className="flex items-center justify-center gap-1 text-on-surface-variant/40 mt-1">
                  <Star size={10} className="fill-current" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{member.stars} 星星</span>
                </div>
              </div>
            </motion.button>
          ))}
          
          <button 
            onClick={() => navigate('/profile/members/add')}
            className="bg-surface-container/30 rounded-[2.5rem] p-6 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-outline-variant/30 hover:bg-surface-container transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary">
              <UserPlus size={28} />
            </div>
            <span className="text-sm font-black text-on-surface-variant flex items-center gap-2">
              添加成员
            </span>
          </button>
        </div>
      </div>

      {/* PIN Entry Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-background/95 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="mb-4 shadow-lg">
                  <TextAvatar src={selectedUser.avatar} name={selectedUser.name} size={80} className="border-4 border-primary/20" />
                </div>
                <h3 className="text-xl font-black">输入 {selectedUser.name} 的密码</h3>
                <p className="text-xs text-on-surface-variant font-bold mt-1">
                  {selectedUser.role === 'parent' ? '🔒 这是个森林守护者账号' : '🔓 快来解锁你的探险之路'}
                </p>
              </div>

              {/* PIN Dots */}
              <div className="flex justify-center gap-4 mb-10">
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

              {/* Pad */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button 
                    key={num}
                    onClick={() => handlePinInput(num.toString())}
                    className="aspect-square rounded-[1.5rem] bg-surface-container-low text-xl font-black flex items-center justify-center hover:bg-primary/10 hover:text-primary active:scale-90 transition-all border border-outline-variant/5"
                  >
                    {num}
                  </button>
                ))}
                <button 
                   onClick={() => setPin('')}
                   className="aspect-square rounded-[1.5rem] bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 hover:text-red-500 active:scale-90 transition-all border border-outline-variant/5"
                >
                  <Eraser size={20} />
                </button>
                <button 
                   onClick={() => handlePinInput('0')}
                   className="aspect-square rounded-[1.5rem] bg-surface-container-low text-xl font-black flex items-center justify-center hover:bg-primary/10 hover:text-primary active:scale-90 transition-all border border-outline-variant/5"
                >
                  0
                </button>
                <button 
                   onClick={() => setPin(prev => prev.slice(0, -1))}
                   className="aspect-square rounded-[1.5rem] bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 hover:text-orange-500 active:scale-90 transition-all border border-outline-variant/5"
                >
                  <Delete size={20} />
                </button>
              </div>
              
              {error && (
                <p className="text-red-500 text-[10px] font-black text-center mt-6 animate-bounce">密码错误，请森林探险家再试一次 🍃</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
