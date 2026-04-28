import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserPlus, Camera, Lock, Eye, EyeOff, X, Check, User, Shield, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../types';
import { cn } from '../lib/utils';
import { AvatarSelector } from '../components/AvatarSelector';
import { TextAvatar } from '../components/TextAvatar';
import { BOY_AVATARS, PARENT_AVATARS } from '../lib/templates';

// 默认头像（本地 PNG）
const getDefaultAvatar = (role: 'parent' | 'child') => {
  return role === 'child' ? BOY_AVATARS[0].src : PARENT_AVATARS[0].src;
};

export function AddMember() {
  const navigate = useNavigate();
  const { addMember } = useFamily();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    role: 'child',
    avatar: getDefaultAvatar('child'),
    stars: 0,
    password: '',
    pin: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

  const handleAvatarSelect = (avatarUrl: string) => {
    setFormData({ ...formData, avatar: avatarUrl });
    setIsAvatarSelectorOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name) return;

    if (formData.role === 'parent' && !formData.password?.trim()) {
      setError(t('welcome.register.error_password_required') || t('add_member.error_password_required'));
      return;
    }
    
    addMember({
      ...formData,
      id: `m-${Date.now()}`,
      stars: formData.stars || 0,
      password: formData.password || '',
      pin: formData.pin || ''
    } as Member);
    
    navigate('/profile');
  };

  return (
    <div className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen bg-background">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-xl tracking-tight">{t('add_member.title')}</h1>
        <div className="w-10" />
      </header>

      <form onSubmit={handleSubmit} className="space-y-8 mt-8">
        <div className="flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAvatarSelectorOpen(true)}
            className="relative cursor-pointer group"
          >
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-surface shadow-xl group-hover:shadow-primary/20 transition-all flex items-center justify-center bg-slate-50">
              <TextAvatar src={formData.avatar} name={formData.name || '?'} size={100} />
            </div>
            <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
              <Camera size={32} />
            </div>
          </motion.div>
          <button 
            type="button"
            onClick={() => setIsAvatarSelectorOpen(true)}
            className="text-primary font-black text-sm tracking-tight hover:opacity-80 transition-opacity mt-4"
          >
            {t('add_member.select_avatar')}
          </button>
        </div>

        <div className="space-y-6 bg-surface-container-low p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/10">
          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('add_member.nickname')}</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('add_member.nickname_placeholder')}
              className="w-full bg-surface-container-high rounded-[1.5rem] px-6 py-4.5 text-on-surface font-bold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('add_member.role')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, role: 'child' })}
                className={cn(
                  "flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-sm transition-all border-2",
                  formData.role === 'child' 
                    ? "bg-primary/5 border-primary text-primary shadow-sm" 
                    : "bg-surface-container-high border-transparent text-on-surface-variant/40 hover:bg-surface-container-highest"
                )}
              >
                <User size={18} />
                {t('add_member.role_child')}
              </button>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, role: 'parent' })}
                className={cn(
                  "flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-sm transition-all border-2",
                  formData.role === 'parent' 
                    ? "bg-secondary-container/30 border-secondary text-secondary shadow-sm" 
                    : "bg-surface-container-high border-transparent text-on-surface-variant/40 hover:bg-surface-container-highest"
                )}
              >
                <Shield size={18} />
                {t('add_member.role_parent')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">{t('add_member.initial_stars')}</label>
              <div className="flex items-center gap-1.5 text-primary">
                <Star size={14} className="fill-current" />
                <span className="font-black text-sm">{formData.stars}</span>
              </div>
            </div>
            <input 
              type="range"
              min="0"
              max="1000"
              step="10"
              value={formData.stars}
              onChange={e => setFormData({ ...formData, stars: parseInt(e.target.value) })}
              className="w-full h-8 accent-primary cursor-pointer mt-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('add_member.pin')}</label>
            <input 
              type="password" 
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={formData.pin}
              placeholder={t('add_member.pin_placeholder')}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setFormData({ ...formData, pin: val });
              }}
              className="w-full bg-surface-container-high border-2 border-transparent rounded-[1.5rem] px-6 py-4.5 font-black focus:border-primary/20 transition-all tracking-[0.5em] text-center"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2 flex items-center justify-between">
              <span>{t('add_member.password')} {formData.role === 'parent' && <span className="text-red-500 text-[10px]">{t('add_member.password_required')}</span>}</span>
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={formData.role === 'parent' ? t('add_member.password_placeholder_parent') : t('add_member.password_placeholder_child')}
                className={cn(
                  "w-full bg-surface-container-high border-2 border-transparent rounded-[1.5rem] px-6 py-4.5 font-bold transition-all pr-12",
                  formData.role === 'parent' && !formData.password && "ring-2 ring-red-100"
                )}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-red-500 text-sm font-bold bg-red-500/10 py-3 rounded-2xl border border-red-500/20"
          >
            {error}
          </motion.p>
        )}

        <button 
          type="submit"
          className="w-full bg-primary text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
        >
          <UserPlus size={24} />
          <span>{t('add_member.submit')}</span>
        </button>
      </form>

      {/* Avatar Selector Modal */}
      <AnimatePresence>
        {isAvatarSelectorOpen && (
          <AvatarSelector
            onSelect={handleAvatarSelect}
            onClose={() => setIsAvatarSelectorOpen(false)}
            currentAvatar={formData.avatar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
