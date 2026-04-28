import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { ArrowLeft, Save, Camera, Lock, Eye, EyeOff, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../types';
import { cn } from '../lib/utils';

// 使用本地 PNG 亚洲风卡通头像
import { BOY_AVATARS, GIRL_AVATARS, PARENT_AVATARS, GRANDPARENT_AVATARS } from '../lib/templates';

export function EditProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser, members, updateMember } = useFamily();
  
  const memberToEdit = id ? members.find(m => m.id === id) : currentUser;

  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    avatar: '',
    id: '',
    stars: 0,
    role: 'child',
    pin: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        name: memberToEdit.name,
        avatar: memberToEdit.avatar,
        id: memberToEdit.id,
        stars: memberToEdit.stars,
        role: memberToEdit.role,
        pin: memberToEdit.pin || '',
        password: memberToEdit.password || ''
      });
    }
  }, [memberToEdit]);

  const isAdmin = currentUser?.role === 'parent';
  const canEditPin = isAdmin || currentUser?.id === memberToEdit?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (memberToEdit?.role === 'parent' && !formData.password?.trim()) {
      setError('管理员账号必须保留登录密码 🔐');
      return;
    }

    if (memberToEdit) {
      updateMember({ ...memberToEdit, ...formData } as Member);
      navigate(-1);
    }
  };

  if (!memberToEdit) return null;

  return (
    <div className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen bg-background">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-xl tracking-tight">{id ? `编辑 ${memberToEdit.name}` : '编辑个人信息'}</h1>
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
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-surface shadow-xl group-hover:shadow-primary/20 transition-all bg-slate-50">
              {formData.avatar && (
                <img 
                  src={formData.avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-contain" 
                />
              )}
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
            选择头像
          </button>
        </div>

        <div className="space-y-6 bg-surface-container-low p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/10">
          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">昵称</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-container-high rounded-[1.5rem] px-6 py-4.5 text-on-surface font-bold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">角色 (不可修改)</label>
            <div className="w-full bg-surface-container/50 text-on-surface-variant/40 rounded-[1.5rem] px-6 py-4.5 font-bold text-sm tracking-tight">
              {formData.role === 'parent' ? '管理员' : '家庭成员'}
            </div>
          </div>

          {canEditPin && (
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">修改密码 (4位数字)</label>
              <input 
                required
                type="password" 
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={formData.pin}
                placeholder="设置4位数字密码"
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  setFormData({ ...formData, pin: val });
                }}
                className="w-full bg-surface-container-high border-2 border-transparent rounded-[1.5rem] px-6 py-4.5 font-black focus:border-primary/20 transition-all tracking-[0.5em] text-center"
              />
              <p className="text-[10px] text-on-surface-variant/60 font-bold px-2">管理员可重置所有人的密码，用户也可以修改自己的密码。</p>
            </div>
          )}

          {canEditPin && (
            <div className="space-y-2">
              <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2 flex items-center justify-between">
                <span>登录密码 {memberToEdit.role === 'parent' && <span className="text-red-500 text-[10px]">(必填)</span>}</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder={memberToEdit.role === 'parent' ? "设置管理员密码" : "选填：登录密码"}
                  className="w-full bg-surface-container-high border-2 border-transparent rounded-[1.5rem] px-6 py-4.5 font-bold transition-all pr-12"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant/40 hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-red-500 text-sm font-bold bg-red-500/10 py-3 rounded-2xl border border-red-500/20"
          >
            {error}
          </motion.div>
        )}

        <button 
          type="submit"
          className="w-full bg-primary text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
        >
          <Save size={24} />
          <span>保存修改</span>
        </button>
      </form>

      {/* Avatar Selector Bottom Sheet */}
      <AnimatePresence>
        {isAvatarSelectorOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarSelectorOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-[3rem] z-[70] shadow-2xl overflow-hidden border-t border-outline-variant/10"
            >
              <div className="p-8 flex flex-col h-[70vh]">
                <header className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight">选择头像</h2>
                    <p className="text-xs text-on-surface-variant font-bold tracking-widest uppercase">共 {BOY_AVATARS.length + GIRL_AVATARS.length + PARENT_AVATARS.length + GRANDPARENT_AVATARS.length} 款精选头像</p>
                  </div>
                  <button 
                    onClick={() => setIsAvatarSelectorOpen(false)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                  >
                    <X size={24} />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
                  <div className="space-y-6">
                    {/* Boys Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                        男孩 ({BOY_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {BOY_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Girls Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-pink-500 rounded-full" />
                        女孩 ({GIRL_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {GIRL_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Parents Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-green-500 rounded-full" />
                        父母 ({PARENT_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {PARENT_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Grandparents Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-orange-500 rounded-full" />
                        爷爷奶奶 ({GRANDPARENT_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {GRANDPARENT_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
