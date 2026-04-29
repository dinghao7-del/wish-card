import React, { useState, useEffect } from 'react';
import { ChevronLeft, Star, Plus, Minus, Camera, ChevronRight, LayoutGrid, Ban } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Reward } from '../types';
import { REWARD_CATEGORIES, type RewardTemplate } from '../lib/templates';
import { useTranslation } from 'react-i18next';

export function EditReward() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { rewards, addReward, updateReward } = useFamily();
  const { t } = useTranslation();
  
  const isEdit = Boolean(id);
  const rewardToEdit = rewards.find(r => r.id === id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: 300,
    unit: '次',
    stock: 1,
    hasLimit: true,
    limitPeriod: 'day' as 'day' | 'week' | 'month',
    limitCount: 1,
    image: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-21.png',
    category: '常用',
    icon: 'Gift'
  });

  // 使用完整心愿库模板数据（6大分类，49个条目）
  const [libraryCategory, setLibraryCategory] = useState<string>('常用');

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);
  const [isUnitSelectorOpen, setIsUnitSelectorOpen] = useState(false);

  const units = ['次', '件', '份', '个', '天'];
  const periods = [
    { id: 'day', label: '天' },
    { id: 'week', label: '周' },
    { id: 'month', label: '月' }
  ];

  useEffect(() => {
    if (isEdit && rewardToEdit) {
      setFormData({
        ...formData,
        ...rewardToEdit
      });
    }
  }, [isEdit, rewardToEdit]);

  const selectTemplate = (template: RewardTemplate) => {
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      cost: template.cost,
      category: template.category,
      image: template.icon, // 使用本地图标路径作为预览图
      icon: template.id,
    });
    setIsLibraryOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (isEdit && id) {
      updateReward({
        id,
        name: formData.name,
        description: formData.description,
        cost: formData.cost,
        icon: formData.icon,
        image: formData.image,
        category: formData.category,
        stock: formData.stock,
      });
    } else {
      addReward({
        id: crypto.randomUUID(),
        name: formData.name,
        description: formData.description,
        cost: formData.cost,
        icon: formData.icon,
        image: formData.image,
        category: formData.category,
        stock: formData.stock,
      });
    }
    navigate('/rewards');
  };

  const adjustValue = (field: 'cost' | 'stock' | 'limitCount', delta: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, (prev[field] as number) + delta)
    }));
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-40 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-4 sticky top-0 bg-[#FDFCF9]/80 backdrop-blur-xl z-50">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container/50 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-black text-xl text-on-surface">{isEdit ? t('edit_reward.edit_title', '编辑心愿') : t('edit_reward.add_title', '添加心愿')}</h1>
        <div className="w-10" />
      </header>

      <form onSubmit={handleSubmit} className="px-5 mt-6 space-y-6">
        {/* Top Section: Image Selector & Library Button */}
        <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] shadow-sm border border-outline-variant/5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container-low shadow-inner border border-outline-variant/10">
              <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={18} />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-outline-variant/10 text-on-surface-variant">
              <Camera size={14} />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D4E157]/10 text-[#2E7D32] font-black text-sm active:scale-95 transition-all"
          >
            {t('edit_reward.template_import', '模板导入')} <ChevronRight size={16} strokeWidth={3} className="text-[#2E7D32]/40" />
          </button>
        </div>

        {/* Section 1: Basic Info */}
        <div className="bg-[#F1F1F1] rounded-[2rem] p-4 space-y-4 border border-white/50">
          <div className="flex gap-2">
            <div className="flex-[3] bg-white rounded-2xl p-4 flex items-center shadow-sm">
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('edit_reward.name_placeholder', '心愿名称...')}
                className="w-full bg-transparent border-none p-0 text-lg font-black placeholder:text-on-surface-variant/20 focus:ring-0"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setIsUnitSelectorOpen(true)}
              className="flex-1 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-95 transition-transform"
            >
              <span className="font-black text-on-surface text-sm">{formData.unit}</span>
              <ChevronRight size={14} className="rotate-90 opacity-40" />
            </button>
          </div>

          <div className="bg-white/50 rounded-2xl overflow-hidden focus-within:bg-white transition-colors">
            <div className="px-4 py-3 border-b border-white/40 flex items-center gap-1.5 text-on-surface-variant/40 text-[13px] font-black">
              <Plus size={16} className="opacity-60" />
              <span>{t('edit_reward.add_description', '添加心愿描述')}</span>
            </div>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('edit_reward.description_placeholder', '再详细描述一下心愿吧...')}
              className="w-full bg-transparent border-none p-4 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 focus:ring-0 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Section 2: Pricing & Stock */}
        <div className="bg-[#F1F1F1] rounded-[2rem] p-4 space-y-4 border border-white/50">
          {/* Unit Price */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
              <div className="w-10 h-10 bg-[#FFF9C4] rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
                <Star size={20} className="text-[#FBC02D] fill-current" />
              </div>
              <span>{t('edit_reward.unit_price', '单价')}</span>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low rounded-2xl p-1 shadow-inner-sm">
              <button 
                type="button"
                onClick={() => adjustValue('cost', -10)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={18} className="text-on-surface-variant" />
              </button>
              <span className="font-black text-xl min-w-[3.5rem] text-center">{formData.cost}</span>
              <button 
                type="button"
                onClick={() => adjustValue('cost', 10)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Plus size={18} className="text-on-surface-variant" />
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
              <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
                <LayoutGrid size={20} className="text-[#2E7D32]" />
              </div>
              <span>{t('edit_reward.quantity', '总数')}</span>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low rounded-2xl p-1 shadow-inner-sm">
              <button 
                type="button"
                onClick={() => adjustValue('stock', -1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={18} className="text-on-surface-variant" />
              </button>
              <span className="font-black text-xl min-w-[3.5rem] text-center">{formData.stock}</span>
              <button 
                type="button"
                onClick={() => adjustValue('stock', 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Plus size={18} className="text-on-surface-variant" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Limits */}
        <div className="bg-[#F1F1F1] rounded-[2rem] p-4 pb-6 border border-white/50">
          <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
              <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
                <Ban size={20} className="text-[#1976D2]" />
              </div>
              <span>{t('edit_reward.redeem_limit', '兑换限制')}</span>
            </div>
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, hasLimit: !formData.hasLimit })}
              className={cn(
                "w-14 h-8 rounded-full transition-all relative border-2 border-white shadow-sm",
                formData.hasLimit ? "bg-[#D4E157]" : "bg-[#BDBDBD]"
              )}
            >
              <div 
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all",
                  formData.hasLimit ? "left-7" : "left-0.5"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {formData.hasLimit && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsPeriodSelectorOpen(true)}
                    className="flex-1 bg-white rounded-2xl px-5 py-4 flex items-center justify-between font-black text-on-surface shadow-sm active:scale-95 transition-transform"
                  >
                    <span className="text-sm">{t('edit_reward.per_period', '每{{period}}', { period: periods.find(p => p.id === formData.limitPeriod)?.label })}</span>
                    <ChevronRight size={16} className="rotate-90 opacity-30" />
                  </button>
                  
                  <div className="flex items-center gap-4 bg-white rounded-2xl p-1 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => adjustValue('limitCount', -1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low shadow-sm active:scale-90"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="font-black text-xl min-w-[2rem] text-center">{formData.limitCount}</span>
                    <button 
                      type="button"
                      onClick={() => adjustValue('limitCount', 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low shadow-sm active:scale-90"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 pt-4 border-t border-dashed border-outline-variant/40 text-center">
            <p className="text-on-surface-variant/40 text-[11px] font-black">
              {formData.name || t('edit_reward.add_title', '心愿')} · {formData.cost}星 / {formData.unit} · {formData.hasLimit ? t('edit_reward.limit_per_period', '每{{period}}限兑{{count}}次', { period: periods.find(p => p.id === formData.limitPeriod)?.label, count: formData.limitCount }) : t('edit_reward.unlimited', '不限次')}
            </p>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="pt-4 pb-32">
          <button 
            type="submit"
            className="w-full py-5 rounded-[2rem] bg-[#D4E157] text-[#2E7D32] font-black text-xl shadow-xl shadow-[#D4E157]/20 border-b-4 border-[#C5D34C] active:border-b-0 active:translate-y-1 transition-all"
          >
            {t('edit_reward.submit', '完成并提交心愿 🌿')}
          </button>
          <p className="text-center text-on-surface-variant/20 text-[10px] font-bold mt-4">
            {t('edit_reward.submit_hint', '保存后您的家庭成员就可以看到这个心愿啦')}
          </p>
        </div>
      </form>

      {/* Selector Overlays */}
      <AnimatePresence>
        {/* Unit Selector */}
        {isUnitSelectorOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-white rounded-t-[2.5rem] p-6 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-on-surface">{t('edit_reward.select_unit', '选择单位')}</h3>
                <button onClick={() => setIsUnitSelectorOpen(false)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {units.map(u => (
                  <button 
                    key={u}
                    onClick={() => { setFormData({...formData, unit: u}); setIsUnitSelectorOpen(false); }}
                    className={cn(
                      "py-4 rounded-2xl font-black text-lg transition-all border-2",
                      formData.unit === u ? "bg-[#D4E157] border-[#C5D34C] text-[#2E7D32]" : "bg-surface-container-low border-transparent text-on-surface-variant/40"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Period Selector - Annotation 2 */}
        {isPeriodSelectorOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-lg bg-white rounded-t-[2.5rem] p-6 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-on-surface">{t('edit_reward.select_period', '选择周期')}</h3>
                <button onClick={() => setIsPeriodSelectorOpen(false)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {periods.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => { setFormData({...formData, limitPeriod: p.id as any}); setIsPeriodSelectorOpen(false); }}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all border-2",
                      formData.limitPeriod === p.id ? "bg-[#D4E157] border-[#C5D34C] text-[#2E7D32]" : "bg-surface-container-low border-transparent text-on-surface-variant/40"
                    )}
                  >
                    {t('edit_reward.per_period', '每{{period}}', { period: p.label })}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Library Modal - 心愿库（6大分类，49个条目，扁平化本地图标） */}
      <AnimatePresence>
        {isLibraryOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[#FDFCF9] rounded-t-[2.5rem] p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-2xl font-black text-on-surface">{t('edit_reward.library_title', '心愿库')}</h3>
                <button 
                  onClick={() => setIsLibraryOpen(false)}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* 分类 Tab 切换栏（常用 | 体验 | 奖品 | 特权 | 成长 | 活动） */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1 px-1">
                {REWARD_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setLibraryCategory(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 shrink-0",
                      libraryCategory === cat.id
                        ? "bg-[#D4E157] border-[#C5D34C] text-[#2E7D32] shadow-md"
                        : "bg-white border-white text-on-surface-variant/40"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* 当前分类的模板网格（4列，类似截图布局） */}
              {(() => {
                const currentTemplates = REWARD_CATEGORIES.find(c => c.id === libraryCategory)?.templates || [];
                return (
                  <div className="grid grid-cols-4 gap-y-5 gap-x-3 overflow-y-auto no-scrollbar pb-10 px-1">
                    {currentTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => selectTemplate(template)}
                        className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                      >
                        {/* 图标（圆形裁切 + 本地PNG） */}
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shadow-sm border border-outline-variant/10 mb-1.5 p-1.5 group-hover:border-primary/30 transition-colors">
                          <img 
                            src={template.icon} 
                            alt={template.name} 
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                        {/* 名称 */}
                        <span className="text-[11px] font-black text-on-surface text-center leading-tight line-clamp-1 w-full">
                          {template.name}
                        </span>
                        {/* 星星价格 */}
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Star size={9} className="text-[#FBC02D] fill-current" />
                          <span className="text-[9px] font-bold text-on-surface-variant">{template.cost}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
