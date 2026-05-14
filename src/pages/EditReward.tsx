import React, { useState, useEffect } from 'react';
import { Star, Plus, Minus, Camera, ChevronRight, LayoutGrid, Ban } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { showToastGlobal } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Reward } from '../types';
import { REWARD_CATEGORIES, type RewardTemplate } from '../lib/templates';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { AppModal, TemplatePickerShell } from '../components/AppModal';

export function EditReward() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { rewards, addReward, updateReward } = useFamily();
  const { t } = useTranslation();
  
  const isEdit = Boolean(id);
  const planIdFromQuery = searchParams.get('planId') || undefined;
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

  useEffect(() => {
    if (isEdit) return;
    const saved = sessionStorage.getItem('pending_reward_template_selection');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const template = parsed?.template;
      if (template?.name) {
        setFormData(prev => ({
          ...prev,
          name: String(template.name || ''),
          description: String(template.description || ''),
          cost: Number(template.cost || 300),
          category: String(template.category || '常用'),
          image: String(template.image || prev.image),
          icon: String(template.icon || prev.icon),
        }));
      }
    } catch (error) {
      console.error('Reward template parse error:', error);
    } finally {
      sessionStorage.removeItem('pending_reward_template_selection');
    }
  }, [isEdit]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await updateReward({
          id,
          planId: rewardToEdit?.planId || planIdFromQuery,
          name: formData.name,
          description: formData.description,
          cost: formData.cost,
          icon: formData.icon,
          image: formData.image,
          category: formData.category,
          stock: formData.stock,
        });
      } else {
        await addReward({
          id: crypto.randomUUID(),
          planId: planIdFromQuery,
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
    } catch (error: any) {
      showToastGlobal(error.message || '保存失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustValue = (field: 'cost' | 'stock' | 'limitCount', delta: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: Math.max(0, (prev[field] as number) + delta)
    }));
  };

  return (
    <div className="ui-create-page min-h-screen bg-surface pb-40 animate-in fade-in duration-500">
      <TopAppBar
        title={isEdit ? t('edit_reward.edit_title', '编辑心愿') : t('edit_reward.add_title', '添加心愿')}
        backTo="/rewards"
      />

      <form onSubmit={handleSubmit} className="ui-create-form px-4 mt-3 space-y-3">
        {/* Top Section: Image Selector & Library Button */}
        <div className="ui-create-card flex items-center justify-between bg-white p-3 rounded-[1.5rem] shadow-sm border border-outline-variant/5">
          <div className="relative group">
            {/* 隐藏的文件输入框 */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setFormData({ ...formData, image: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
              id="reward-image-upload"
            />
            <label htmlFor="reward-image-upload" className="cursor-pointer block">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-low shadow-inner border border-outline-variant/10 group-hover:border-primary/30 transition-colors">
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </label>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-white text-white">
              <Camera size={14} />
            </div>
          </div>
          
<button 
  type="button"
  onClick={() => setIsLibraryOpen(true)}
  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-surface/10 text-primary-text font-black text-sm active:scale-95 transition-all"
>
  {t('edit_reward.template_import', '模板导入')} <ChevronRight size={16} strokeWidth={3} className="text-primary-text/40" />
</button>
        </div>

{/* Section 1: Basic Info */}
<div className="ui-create-card bg-surface-container rounded-[1.5rem] p-3 space-y-3 border border-white/50">
          <div className="flex gap-2">
            <div className="flex-[3] bg-white rounded-2xl p-3 flex items-center shadow-sm">
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
        <div className="ui-create-card bg-surface-container rounded-[1.5rem] p-3 space-y-3 border border-white/50">
          {/* Unit Price */}
          <div className="bg-white rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
<div className="w-10 h-10 bg-secondary-container rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
  <Star size={20} className="text-secondary fill-current" />
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
          <div className="bg-white rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
<div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
  <LayoutGrid size={20} className="text-primary-text" />
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
        <div className="ui-create-card bg-surface-container rounded-[2rem] p-4 pb-6 border border-white/50">
          <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
<div className="w-10 h-10 bg-tertiary-container rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
  <Ban size={20} className="text-tertiary" />
</div>
              <span>{t('edit_reward.redeem_limit', '兑换限制')}</span>
            </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.hasLimit}
                onClick={() => setFormData({ ...formData, hasLimit: !formData.hasLimit })}
                className={cn(
                  "relative h-8 w-14 rounded-full p-1 transition-colors shadow-inner",
                  formData.hasLimit ? "bg-primary" : "bg-surface-container-high"
                )}
              >
                <span
                  className={cn(
                    "block h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                    formData.hasLimit && "translate-x-6"
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
                    className="flex-1 bg-white rounded-2xl px-4 py-3 flex items-center justify-between font-black text-on-surface shadow-sm active:scale-95 transition-transform"
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

          <div className="mt-3 pt-3 border-t border-dashed border-outline-variant/40 text-center">
            <p className="text-on-surface-variant/40 text-[11px] font-black">
              {formData.name || t('edit_reward.add_title', '心愿')} · {formData.cost}星 / {formData.unit} · {formData.hasLimit ? t('edit_reward.limit_per_period', '每{{period}}限兑{{count}}次', { period: periods.find(p => p.id === formData.limitPeriod)?.label, count: formData.limitCount }) : t('edit_reward.unlimited', '不限次')}
            </p>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="pt-4 pb-32">
<button 
  type="submit"
  disabled={isSubmitting}
  className="ui-create-submit w-full py-3.5 rounded-[1.5rem] bg-primary-surface text-primary-text font-black text-lg shadow-xl shadow-primary-surface/20 border-b-4 border-primary-surface/80 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>
  {!isSubmitting && !isEdit && <Plus size={20} strokeWidth={3} className="inline-block mr-2 align-[-3px]" />}
  {isSubmitting ? t('edit_reward.submitting', '提交中...') : t('edit_reward.submit', '完成并提交心愿 🌿')}
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
          <AppModal
            open={isUnitSelectorOpen}
            onClose={() => setIsUnitSelectorOpen(false)}
            title={t('edit_reward.select_unit', '选择单位')}
            surface="sheet"
            zIndexClass="z-[100]"
          >
              <div className="grid grid-cols-3 gap-3">
                {units.map(u => (
                  <button 
                    key={u}
                    onClick={() => { setFormData({...formData, unit: u}); setIsUnitSelectorOpen(false); }}
className={cn(
  "py-4 rounded-2xl font-black text-lg transition-all border-2",
  formData.unit === u ? "bg-primary-surface border-primary-surface/80 text-primary-text" : "bg-surface-container-low border-transparent text-on-surface-variant/40"
)}
                  >
                    {u}
                  </button>
                ))}
              </div>
          </AppModal>
        )}

        {/* Period Selector - Annotation 2 */}
        {isPeriodSelectorOpen && (
          <AppModal
            open={isPeriodSelectorOpen}
            onClose={() => setIsPeriodSelectorOpen(false)}
            title={t('edit_reward.select_period', '选择周期')}
            surface="sheet"
            zIndexClass="z-[100]"
          >
              <div className="flex flex-col gap-3">
                {periods.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => { setFormData({...formData, limitPeriod: p.id as any}); setIsPeriodSelectorOpen(false); }}
className={cn(
  "w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all border-2",
  formData.limitPeriod === p.id ? "bg-primary-surface border-primary-surface/80 text-primary-text" : "bg-surface-container-low border-transparent text-on-surface-variant/40"
)}
                  >
                    {t('edit_reward.per_period', '每{{period}}', { period: p.label })}
                  </button>
                ))}
              </div>
          </AppModal>
        )}
      </AnimatePresence>

      {/* Library Modal - 心愿库（6大分类，49个条目，扁平化本地图标） */}
      <AnimatePresence>
        {isLibraryOpen && (
          <TemplatePickerShell
            title={t('edit_reward.library_title', '心愿库')}
            onClose={() => setIsLibraryOpen(false)}
            zIndexClass="z-[100]"
            tabs={
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                {REWARD_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setLibraryCategory(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 shrink-0",
                      libraryCategory === cat.id
                        ? "bg-primary-surface border-primary-surface/80 text-primary-text shadow-md"
                        : "bg-white border-white text-on-surface-variant/40"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            }
          >
              {/* 当前分类的模板网格（4列，类似截图布局） */}
              {(() => {
                const currentTemplates = REWARD_CATEGORIES.find(c => c.id === libraryCategory)?.templates || [];
                return (
                  <div className="grid grid-cols-4 gap-y-3 gap-x-2 overflow-y-auto no-scrollbar pb-4 px-1">
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
                          <Star size={9} className="text-secondary fill-current" />
                          <span className="text-[9px] font-bold text-on-surface-variant">{template.cost}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
          </TemplatePickerShell>
        )}
      </AnimatePresence>
    </div>
  );
}
