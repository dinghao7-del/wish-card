import React, { useState, useEffect } from 'react';
import { Star, Plus, Minus, Camera, ChevronRight, LayoutGrid, Ban, Sparkles } from 'lucide-react';
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
import { suggestRewardCost } from '../lib/starEconomy';
import { OptionHelp } from '../components/OptionHelp';

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
    unit: t('edit_reward.default_unit', { defaultValue: '次' }),
    stock: 1,
    hasLimit: true,
    limitPeriod: 'day' as 'day' | 'week' | 'month',
    limitCount: 1,
    image: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-21.png',
    category: t('edit_reward.default_category', { defaultValue: '常用' }),
    icon: 'Gift'
  });

  // 使用完整心愿库模板数据（6大分类，49个条目）
  const [libraryCategory, setLibraryCategory] = useState<string>(t('edit_reward.default_category', { defaultValue: '常用' }));

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPeriodSelectorOpen, setIsPeriodSelectorOpen] = useState(false);
  const [isUnitSelectorOpen, setIsUnitSelectorOpen] = useState(false);

  const _rawUnits: any = (t as any)('edit_reward.units', { returnObjects: true, defaultValue: ['次', '件', '份', '个', '天'] });
  const units: string[] = Array.isArray(_rawUnits) ? _rawUnits : ['次', '件', '份', '个', '天'];
  const periods = [
    { id: 'day', label: t('edit_reward.period_day', { defaultValue: '天' }) },
    { id: 'week', label: t('edit_reward.period_week', { defaultValue: '周' }) },
    { id: 'month', label: t('edit_reward.period_month', { defaultValue: '月' }) }
  ];
  const getUnitDisplayName = (unit: string | undefined) => {
    const zhUnits = ['次', '件', '份', '个', '天'];
    const index = unit ? zhUnits.indexOf(unit) : -1;
    return index >= 0 ? (units[index] || unit) : (unit || units[0] || t('edit_reward.default_unit', { defaultValue: '次' }));
  };
  const getCategoryDisplayName = (category: string | undefined) => {
    const normalized = category || t('edit_reward.default_category', { defaultValue: '常用' });
    const categoryKeyMap: Record<string, string> = {
      '常用': 'common',
      '体验': 'experience',
      '奖品': 'prize',
      '特权': 'privilege',
      '成长': 'growth',
      '活动': 'activity',
      '星愿副本': 'quest',
      'Common': 'common',
      'Experience': 'experience',
      'Prize': 'prize',
      'Privilege': 'privilege',
      'Growth': 'growth',
      'Activity': 'activity',
      'Wish Quests': 'quest',
    };
    const key = categoryKeyMap[normalized];
    return key ? t(`edit_reward.categories.${key}`, { defaultValue: normalized }) : normalized;
  };
  const costSuggestion = suggestRewardCost({
    name: formData.name,
    description: formData.description,
    category: formData.category,
    currentBalance: rewards.reduce((sum, reward) => sum + reward.cost, 0),
  });
  const costTierLabel = t(`edit_reward.cost_tiers.${costSuggestion.tier}`, { defaultValue: costSuggestion.label });
  const costReason = t(`edit_reward.cost_reasons.${costSuggestion.tier}`, { defaultValue: costSuggestion.reason });
  const isCostInSuggestedRange = formData.cost >= costSuggestion.minCost && formData.cost <= costSuggestion.maxCost;

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
          category: String(template.category || t('edit_reward.default_category', { defaultValue: '常用' })),
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
      showToastGlobal(error.message || t('edit_reward.save_failed', { defaultValue: '保存失败，请重试' }), 'error');
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-surface/10 text-primary-text font-black text-sm active:scale-95 transition-all"
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
              className="flex-1 bg-white rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm active:scale-95 transition-transform"
            >
              <span className="font-black text-on-surface text-sm">{getUnitDisplayName(formData.unit)}</span>
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
              <OptionHelp title={t('edit_reward.unit_price_help_title', { defaultValue: '单价怎么定' })}>
                {t('edit_reward.unit_price_help_body', { defaultValue: '单价就是孩子兑换这个心愿需要花多少星星。小特权可以低一点，比如 20-80 星；周末体验可以高一点，比如 100-260 星；旅行、营地这类大心愿建议设置成长期目标。' })}
              </OptionHelp>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low rounded-2xl p-1 shadow-inner-sm">
              <button 
                type="button"
                onClick={() => adjustValue('cost', -10)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={18} className="text-on-surface-variant" />
              </button>
              <input
                type="number"
                min={0}
                value={formData.cost}
                onChange={(event) => setFormData(prev => ({ ...prev, cost: Math.max(0, parseInt(event.target.value) || 0) }))}
                className="h-10 w-16 rounded-xl border-none bg-transparent p-0 text-center text-xl font-black text-on-surface focus:ring-2 focus:ring-primary/20"
                aria-label={t('edit_reward.unit_price_aria', { defaultValue: '心愿单价' })}
              />
              <button 
                type="button"
                onClick={() => adjustValue('cost', 10)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Plus size={18} className="text-on-surface-variant" />
              </button>
            </div>
          </div>

          <div className={cn(
            "rounded-2xl border p-4 shadow-sm",
            isCostInSuggestedRange
              ? "border-primary/10 bg-primary/5"
              : "border-amber-200 bg-amber-50/80"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  isCostInSuggestedRange ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"
                )}>
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-on-surface">
                    {t('edit_reward.suggested_cost', { defaultValue: '建议设置 {{count}} 星', count: costSuggestion.suggestedCost })}
                    <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-primary">
                      {costTierLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface-variant">
                    {t('edit_reward.reasonable_range', { defaultValue: '合理区间 {{min}}-{{max}} 星。{{reason}}', min: costSuggestion.minCost, max: costSuggestion.maxCost, reason: costReason })}
                  </p>
                  {!isCostInSuggestedRange && (
                    <p className="mt-1 text-xs font-black text-amber-700">
                      {t('edit_reward.out_of_range', { defaultValue: '当前价格不在建议区间，可能会让心愿太容易或太难兑换。' })}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, cost: costSuggestion.suggestedCost }))}
                className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-primary shadow-sm active:scale-95"
              >
                {t('edit_reward.apply', { defaultValue: '采用' })}
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
              <OptionHelp title={t('edit_reward.quantity_help_title', { defaultValue: '总数是什么意思' })}>
                {t('edit_reward.quantity_help_body', { defaultValue: '总数表示这个心愿最多可以被兑换几次。比如“冰淇淋”可以放 3 次，“周末电影夜”通常放 1 次，避免孩子重复兑换同一个家庭承诺。' })}
              </OptionHelp>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low rounded-2xl p-1 shadow-inner-sm">
              <button 
                type="button"
                onClick={() => adjustValue('stock', -1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={18} className="text-on-surface-variant" />
              </button>
              <input
                type="number"
                min={0}
                value={formData.stock}
                onChange={(event) => setFormData(prev => ({ ...prev, stock: Math.max(0, parseInt(event.target.value) || 0) }))}
                className="h-10 w-16 rounded-xl border-none bg-transparent p-0 text-center text-xl font-black text-on-surface focus:ring-2 focus:ring-primary/20"
                aria-label={t('edit_reward.quantity_aria', { defaultValue: '心愿总数' })}
              />
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
        <div className="ui-create-card bg-surface-container rounded-[1.5rem] p-3 border border-white/50">
          <div className="bg-white rounded-2xl p-3 mb-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 font-black text-on-surface">
<div className="w-10 h-10 bg-tertiary-container rounded-xl flex items-center justify-center shadow-sm border border-outline-variant/10">
  <Ban size={20} className="text-tertiary" />
</div>
              <span>{t('edit_reward.redeem_limit', '兑换限制')}</span>
              <OptionHelp title={t('edit_reward.redeem_limit_help_title', { defaultValue: '兑换限制是什么意思' })}>
                {t('edit_reward.redeem_limit_help_body', { defaultValue: '用来限制同一个心愿在一段时间内最多兑换几次。比如“看电视”可以设置每周 2 次；“家庭电影夜”可以设置每月 1 次。大心愿通常建议保留限制。' })}
              </OptionHelp>
            </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={t('edit_reward.limit_toggle', '兑换限制')}
                    aria-checked={formData.hasLimit}
                    onClick={() => setFormData({ ...formData, hasLimit: !formData.hasLimit })}
                    className={cn(
                      "ui-standard-switch relative inline-flex h-6 min-h-6 w-11 min-w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25",
                      formData.hasLimit ? "bg-primary" : "bg-surface-container-highest"
                    )}
                  >
                    <span
                      className="ui-standard-switch-thumb pointer-events-none h-5 w-5 rounded-full bg-white shadow-sm"
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
                    <input
                      type="number"
                      min={0}
                      value={formData.limitCount}
                      onChange={(event) => setFormData(prev => ({ ...prev, limitCount: Math.max(0, parseInt(event.target.value) || 0) }))}
                      className="h-10 w-14 rounded-xl border-none bg-transparent p-0 text-center text-xl font-black text-on-surface focus:ring-2 focus:ring-primary/20"
                      aria-label={t('edit_reward.limit_count_aria', { defaultValue: '周期限制次数' })}
                    />
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
              {t('edit_reward.summary', {
                defaultValue: '{{name}} · {{cost}}星 / {{unit}} · {{limit}}',
                name: formData.name || t('edit_reward.add_title', { defaultValue: '心愿' }),
                cost: formData.cost,
                unit: getUnitDisplayName(formData.unit),
                limit: formData.hasLimit
                  ? t('edit_reward.limit_per_period', { defaultValue: '每{{period}}限兑{{count}}次', period: periods.find(p => p.id === formData.limitPeriod)?.label, count: formData.limitCount })
                  : t('edit_reward.unlimited', { defaultValue: '不限次' }),
              })}
            </p>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="pt-2 pb-28">
<button 
  type="submit"
  disabled={isSubmitting}
  className="ui-create-submit w-full py-2.5 rounded-2xl bg-primary-surface text-primary-text font-black text-base shadow-md shadow-primary-surface/15 border-b-2 border-primary-surface/80 active:border-b-0 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>
  {!isSubmitting && !isEdit && <Plus size={20} strokeWidth={3} className="inline-block mr-2 align-[-3px]" />}
  {isSubmitting ? t('edit_reward.submitting', '提交中...') : t('edit_reward.submit', '提交')}
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
  "py-2.5 rounded-xl font-black text-base transition-all border",
  getUnitDisplayName(formData.unit) === u ? "bg-primary-surface border-primary-surface/80 text-primary-text" : "bg-surface-container-low border-transparent text-on-surface-variant/40"
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
  "w-full py-3 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all border",
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
                    {getCategoryDisplayName(cat.id)}
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
