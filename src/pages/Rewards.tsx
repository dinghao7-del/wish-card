import React, { useState } from 'react';
import { Reward } from '../types';
import { Star, Plus, X, Mic, MoreVertical, Pencil, Trash2, CheckCircle2, Clock3, CalendarCheck, Gift } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { TextAvatar } from '../components/TextAvatar';
import { CelebrationAnimation } from '../components/CelebrationAnimation';
import { showConfirm } from '../components/ConfirmDialog';
import { getParentVerificationValue, isHighValueReward } from '../lib/sensitiveActions';
import { getRewardCategoryLabel, normalizeRewardCategoryId, REWARD_CATEGORY_OPTIONS } from '../lib/rewardCategories';
import { NotificationBell } from '../components/NotificationCenter';
import { AppModal } from '../components/AppModal';
import { verifyMemberPinOrPassword } from '../lib/memberCredentials';
import { getActiveThemeSkin } from '../lib/themeSkins';
import { getCreationTemplateRoute } from '../lib/createFlowRoutes';

export function Rewards() {
  const { rewards, stars, currentUser, redeemReward, approveReward, setIsUserSelectorOpen, deleteReward, guestMode } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isRedeemSuccess, setIsRedeemSuccess] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<Reward | null>(null);
  const [fulfillmentNotice, setFulfillmentNotice] = useState<Reward | null>(null);
  const [menuRewardId, setMenuRewardId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Reward | null>(null);
  const isArcadeSkin = getActiveThemeSkin().id === 'arcade-comic';

  const categories = REWARD_CATEGORY_OPTIONS.map(category => ({
    id: category.id,
    label: t(`rewards.category.${category.id}`, { defaultValue: category.label }),
  }));

  const filteredRewards = activeTab === 'all'
    ? (rewards || [])
    : (rewards || []).filter(r => normalizeRewardCategoryId(r.category) === activeTab);
  const handleRedeem = (reward: Reward) => {
    if (stars >= reward.cost) {
      setRedeemedReward(reward);
      setIsRedeemSuccess(true);
      setSelectedReward(null);
    }
  };

  const handleCelebrationComplete = () => {
    if (redeemedReward) {
      redeemReward(redeemedReward.id);
      setRedeemedReward(null);
    }
    setIsRedeemSuccess(false);
  };

  const canApproveReward = (reward: Reward) => currentUser?.role === 'parent' && reward.status === 'pending_approval';
  const canRedeemReward = (reward: Reward) => (!reward.status || reward.status === 'available') && stars >= reward.cost;
  const rewardStatusLabel = (reward: Reward) => {
    if (reward.status === 'pending_approval') return t('rewards.status.pending_approval', { defaultValue: '待确认' });
    if (reward.status === 'redeemed') return t('rewards.status.redeemed', { defaultValue: '已兑换' });
    return '';
  };

  const handleApproveReward = async (reward: Reward) => {
    if (isHighValueReward(reward)) {
      const verificationValue = getParentVerificationValue(currentUser);
      const confirmed = await showConfirm({
        title: t('rewards.high_value.title', { defaultValue: '高价值心愿确认' }),
        message: t('rewards.high_value.message', { defaultValue: '确认兑换「{{name}}」将消耗 {{cost}} 颗星星，请家长再次确认。', name: reward.name, cost: reward.cost }),
        type: 'warning',
        confirmText: t('rewards.high_value.confirm', { defaultValue: '确认兑换' }),
        verificationValue: verificationValue || undefined,
        verificationMatcher: currentUser?.role === 'parent'
          ? (input) => verifyMemberPinOrPassword(currentUser, input) !== null
          : undefined,
        verificationLabel: verificationValue ? t('rewards.high_value.verification_label', { defaultValue: '输入当前家长 PIN 或密码' }) : undefined,
        verificationPlaceholder: verificationValue ? t('rewards.high_value.verification_placeholder', { defaultValue: 'PIN 或密码' }) : undefined,
      });
      if (!confirmed) return;
    }
    const approved = await approveReward(reward.id);
    if (approved) {
      setFulfillmentNotice(reward);
    }
  };

  return (
    <div className="px-4 sm:px-6 pb-32 animate-in fade-in duration-500 bg-background min-h-screen">
      <header className="ui-rewards-header flex justify-between items-center py-4 sticky top-[var(--app-sticky-top,0px)] bg-background/80 backdrop-blur-xl z-40 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setIsUserSelectorOpen(true)}
          >
            <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={40} className="border-2 border-surface dark:border-surface shadow-sm group-hover:shadow-md transition-all" />
            {isArcadeSkin && (
              <span className="ui-rewards-brand hidden text-xl font-black italic text-on-surface sm:inline">
                WISHLIST
              </span>
            )}
          </div>

          <button
            onClick={() => setIsAiDialogOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary-text hover:bg-primary/5 active:scale-95 transition-all"
          >
            <Mic size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            onClick={() => navigate('/history')}
            className="ui-home-stars-pill bg-surface-container-low backdrop-blur-sm py-1 sm:py-1.5 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={14} className="sm:size-[18px] text-reward-display fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          <NotificationBell />
        </div>
      </header>

      <VoiceAssistant
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onOpenQuadrant={(range = 'today') => navigate(`/quadrant?range=${range}`)}
        onOpenCalendarSync={() => navigate('/calendar-sync')}
      />

      <div className="mt-4 mb-6 px-1">
        <div className="flex justify-between items-center">
          <h2 className="text-[32px] font-black tracking-tight text-on-surface leading-[1.1] whitespace-pre-line">
            {t('rewards.headline', { defaultValue: '用努力\n开启小确幸 🌱' })}
          </h2>
          {currentUser?.role === 'parent' && (
            <button
              onClick={() => navigate(getCreationTemplateRoute('reward'))}
              className="bg-primary text-white w-12 h-12 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {isArcadeSkin && (
        <section className="ui-reward-promo mb-6 overflow-hidden rounded-3xl bg-primary p-5 text-on-surface">
          <div className="relative z-10 max-w-[68%]">
            <p className="text-xs font-black uppercase tracking-wide">{t('rewards.promo.eyebrow', { defaultValue: '限时上新' })}</p>
            <p className="mt-2 text-sm font-bold leading-relaxed">
              {t('rewards.promo.desc', { defaultValue: '攒够星星兑换心愿卡，精选奖励随时上新。' })}
            </p>
            <button
              type="button"
              onClick={() => navigate(getCreationTemplateRoute('reward'))}
              className="mt-4 rounded-xl bg-on-surface px-5 py-2 text-xs font-black text-surface"
            >
              {t('rewards.promo.button', { defaultValue: '逛逛心愿' })}
            </button>
          </div>
          <div className="ui-reward-promo-icon">
            <Gift size={50} strokeWidth={3} />
          </div>
        </section>
      )}

      <AnimatePresence>
        {fulfillmentNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-2xl p-4 border border-primary/20 bg-primary-container shadow-sm flex items-start gap-3"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10"
            >
              <CalendarCheck size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-on-surface">{t('rewards.fulfillment.title', { defaultValue: '已加入父母兑现待办' })}</p>
              <p className="text-xs font-bold text-on-surface-variant leading-relaxed mt-1">
                {t('rewards.fulfillment.desc', { defaultValue: '「{{name}}」会进入父母任务和四象限，提醒家长完成这个约定。', name: fulfillmentNotice.name })}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="rounded-full px-3 py-1.5 text-[11px] font-black bg-primary text-white active:scale-95 transition-all"
                >
                  {t('rewards.fulfillment.tasks', { defaultValue: '查看待办' })}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/quadrant?range=week')}
                  className="rounded-full px-3 py-1.5 text-[11px] font-black bg-white/80 text-primary border border-primary/20 active:scale-95 transition-all"
                >
                  {t('rewards.fulfillment.quadrant', { defaultValue: '本周四象限' })}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFulfillmentNotice(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/70 active:scale-95"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="ui-reward-tabs flex overflow-x-auto no-scrollbar gap-2 mb-6 -mx-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "ui-filter-chip px-4 py-2 rounded-xl text-[13px] font-black whitespace-nowrap transition-all border flex items-center justify-center",
              activeTab === cat.id
                ? "bg-primary border-primary text-white shadow-sm"
                : "bg-surface-container-low border-transparent text-on-surface-variant/50 hover:bg-surface shadow-sm"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rewards Grid - 两列大卡片 */}
      <div className="ui-rewards-grid grid grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRewards.map((reward, idx) => (
            <motion.div
              key={reward.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              onClick={() => setSelectedReward(reward)}
              className="ui-reward-card rounded-3xl overflow-hidden shadow-md border-2 border-outline-variant/10 hover:shadow-xl transition-all group cursor-pointer active:scale-[0.97] bg-surface-container-low relative"
            >
              {/* 图片区域 - 纯CSS渐变背景 */}
              <div className={cn(
                "ui-reward-card-media w-full h-40 relative overflow-hidden flex items-center justify-center",
                // 根据奖励类型分配不同渐变
                reward.cost >= 100 ? "bg-gradient-to-br from-purple-200 to-pink-200" :
                reward.cost >= 50 ? "bg-gradient-to-br from-primary-container/30 to-primary/10" :
                reward.cost >= 20 ? "bg-gradient-to-br from-secondary-container/50 to-secondary/10" :
                "bg-gradient-to-br from-warning-container to-secondary-container/50"
              )}>
                <span className="absolute text-8xl opacity-40 select-none">🎁</span>
                {(reward.image || reward.icon) && (
                  <img
                    src={reward.image || reward.icon}
                    alt=""
                    aria-hidden="true"
                    onError={(event) => {
                      event.currentTarget.remove();
                    }}
                    className="pointer-events-none relative z-10 w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                  />
                )}

                {/* 渐变遮罩 + 信息悬浮在底部 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* 更多操作菜单 */}
                {currentUser?.role === 'parent' && (
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuRewardId(menuRewardId === reward.id ? null : reward.id);
                      }}
                      className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary active:scale-90 transition-all shadow-sm"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* 下拉菜单 */}
                    <AnimatePresence>
                      {menuRewardId === reward.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-10 bg-surface rounded-xl shadow-xl border border-outline-variant/20 overflow-hidden min-w-[140px]"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuRewardId(null);
                              navigate(`/rewards/edit/${reward.id}`);
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
                          >
                            <Pencil size={14} className="text-primary" />
                            {t('rewards.action.edit_task', { defaultValue: '编辑任务' })}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuRewardId(null);
                              setShowDeleteConfirm(reward);
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-danger hover:bg-danger-container/40 transition-colors"
                          >
                            <Trash2 size={14} />
                            {t('rewards.action.delete_task', { defaultValue: '删除任务' })}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 标题悬浮在图片底部 */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="text-base font-black text-white truncate drop-shadow-sm">{reward.name}</h4>
                </div>
                {reward.status && reward.status !== 'available' && (
                  <div className="ui-reward-status absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-primary shadow-sm flex items-center gap-1">
                    {reward.status === 'pending_approval' ? <Clock3 size={11} /> : <CheckCircle2 size={11} />}
                    {rewardStatusLabel(reward)}
                  </div>
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="ui-reward-card-body px-3 py-2.5 flex flex-col items-stretch gap-2">
                <div className="ui-reward-info-row flex w-full items-start justify-between gap-3">
                  <h4 className="min-w-0 flex-1 truncate text-sm font-bold text-on-surface">{reward.name}</h4>
                  <div className="ui-reward-cost flex items-center gap-1">
                    <Star size={16} className="text-reward-display fill-current" />
                    <span className="text-lg font-black text-on-surface">{reward.cost}</span>
                  </div>
                </div>

                {canApproveReward(reward) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveReward(reward);
                    }}
                    className={cn(
                      "ui-reward-action min-h-9 w-full px-3 py-1.5 text-xs font-black bg-primary text-white active:scale-95 transition-all shadow-sm whitespace-nowrap",
                      isArcadeSkin ? "rounded-full" : "rounded-xl"
                    )}
                  >
                    {t('common.confirm', { defaultValue: '确认' })}
                  </button>
                ) : canRedeemReward(reward) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRedeem(reward);
                    }}
                    className={cn(
                      "ui-reward-action min-h-9 w-full px-3 py-1.5 text-xs font-black bg-primary text-white active:scale-95 transition-all shadow-sm whitespace-nowrap text-center",
                      isArcadeSkin ? "rounded-full" : "rounded-xl"
                    )}
                  >
                    {t('rewards.action.redeem', { defaultValue: '兑换' })}
                  </button>
                ) : reward.status && reward.status !== 'available' ? (
                  <span className="w-full rounded-xl px-3 py-2 text-center text-[10px] font-black bg-surface-container text-on-surface-variant/60">
                    {rewardStatusLabel(reward)}
                  </span>
                ) : (
                  <div className="flex w-full items-center gap-2">
                    <div className="ui-reward-progress h-2 min-w-0 flex-1 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (stars / reward.cost) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-on-surface-variant/60">{Math.floor((stars / reward.cost) * 100)}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reward Detail Modal */}
      <AnimatePresence>
        {selectedReward && (
          <div className="ui-detail-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReward(null)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="ui-detail-sheet relative w-full max-w-lg mx-auto bg-background rounded-t-[2rem] shadow-2xl max-h-[88svh] overflow-hidden flex flex-col"
              data-bottom-sheet="true"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="ui-detail-sheet-header flex items-center px-6 py-4 bg-background/80 backdrop-blur-xl shrink-0 z-20 border-b border-outline-variant/10">
                <button
                  onClick={() => setSelectedReward(null)}
                  className="ui-detail-sheet-close w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container/50 transition-colors"
                  aria-label={t('common.close', { defaultValue: '关闭' })}
                >
                  <Plus size={24} className="rotate-45" />
                </button>
                <h2 className="flex-1 text-center text-lg font-bold text-on-surface">{t('rewards.detail.title', { defaultValue: '心愿详情' })}</h2>
                <div className="w-10" />
              </header>

              {/* 可滚动内容区 */}
              <div className="ui-detail-scroll flex-1 p-5 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                {/* 图片 */}
                {(selectedReward.image || selectedReward.icon) && (
                  <div className="w-full rounded-2xl overflow-hidden mb-4 shadow-md border-2 border-surface dark:border-surface">
                    <img
                      src={selectedReward.image || selectedReward.icon}
                      alt={selectedReward.name}
                      className="w-full h-auto object-contain max-h-[20vh]"
                    />
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="text-xl font-black">{selectedReward.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">
                         {getRewardCategoryLabel(selectedReward.category)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary-container/30 dark:bg-secondary/20 px-3 py-1 rounded-full text-secondary dark:text-secondary border border-white/50 dark:border-secondary/20 shadow-sm shrink-0">
                    <Star size={16} className="fill-current text-reward-display" strokeWidth={2.5} />
                    <span className="font-black text-lg">{selectedReward.cost}</span>
                  </div>
                </div>

                {selectedReward.description && (
                  <p className="text-on-surface-variant text-xs font-medium mb-4 leading-relaxed line-clamp-2">
                    {selectedReward.description}
                  </p>
                )}

                {/* 兑换进度条 - 紧凑版 */}
                <div className="bg-surface-container-low rounded-xl px-3 py-2 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {t('rewards.progress.current_stars', { defaultValue: '当前能量' })}
                    </span>
                    <span className="text-[10px] font-black text-primary flex items-center gap-0.5">
                      <Star size={9} className="fill-current text-reward-display" />
                      {stars} / {selectedReward.cost}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        stars >= selectedReward.cost ? "bg-primary" : "bg-gradient-to-r from-primary to-secondary"
                      )}
                      style={{ width: `${Math.min(100, (stars / selectedReward.cost) * 100)}%` }}
                    />
                  </div>
                  <p className={cn(
                    "text-[9px] font-bold text-center mt-1",
                    canRedeemReward(selectedReward) ? "text-primary" : "text-on-surface-variant/60"
                  )}>
                    {selectedReward.status === 'pending_approval'
                      ? t('rewards.status.pending_approval', { defaultValue: '等待家长确认' })
                      : selectedReward.status === 'redeemed'
                        ? t('rewards.status.redeemed', { defaultValue: '这个心愿已兑换' })
                        : stars >= selectedReward.cost
                      ? t('rewards.progress.ready', { defaultValue: '可以兑换啦！' })
                      : t('rewards.progress.need_more', { defaultValue: '再攒 {{count}} 颗', count: selectedReward.cost - stars })}
                  </p>
                </div>
              </div>

              {/* 固定底部按钮区域 */}
              <div className="ui-detail-action-bar p-4 bg-background border-t border-outline-variant/10 shrink-0 pb-[max(2rem,env(safe-area-inset-bottom,0px))]">
                <button
                  disabled={!canApproveReward(selectedReward) && !canRedeemReward(selectedReward)}
                  onClick={() => {
                    if (canApproveReward(selectedReward)) {
                      handleApproveReward(selectedReward);
                      setSelectedReward(null);
                    } else {
                      handleRedeem(selectedReward);
                    }
                  }}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-black text-white shadow-lg transition-all flex items-center justify-center gap-2",
                    canApproveReward(selectedReward)
                      ? "bg-emerald-500 shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
                      : canRedeemReward(selectedReward)
                      ? "bg-primary shadow-primary/30 active:scale-[0.98] cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {canApproveReward(selectedReward) ? (
                    <>
                      <CheckCircle2 size={16} />
                      {t('rewards.action.confirm', { defaultValue: '确认兑换' })}
                    </>
                  ) : canRedeemReward(selectedReward) ? (
                    <>
                      <Star size={16} className="fill-current text-reward-display" />
                      {t('rewards.action.redeem_now', { defaultValue: '立即兑换' })}
                    </>
                  ) : selectedReward.status && selectedReward.status !== 'available' ? (
                    <>
                      <Clock3 size={16} />
                      {rewardStatusLabel(selectedReward)}
                    </>
                  ) : (
                    <>
                      <Star size={16} className="fill-current text-gray-400" />
                      {t('rewards.action.stars_insufficient', { defaultValue: '星星不足 ({{count}})', count: selectedReward.cost - stars })}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <AppModal
            open={Boolean(showDeleteConfirm)}
            onClose={() => setShowDeleteConfirm(null)}
            title={t('rewards.action.delete_confirm_title', { defaultValue: '确认删除' })}
            surface="center"
            zIndexClass="z-[140]"
            bodyClassName="px-6 py-5"
            footer={
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl bg-surface-container font-bold text-on-surface-variant"
                >
                  {t('common.cancel', { defaultValue: '取消' })}
                </button>
                <button
                  onClick={() => {
                    deleteReward(showDeleteConfirm.id);
                    setShowDeleteConfirm(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-danger font-bold text-white shadow-sm"
                >
                  {t('common.delete', { defaultValue: '删除' })}
                </button>
              </div>
            }
          >
              <p className="text-sm text-on-surface-variant mb-6">
                {t('rewards.action.delete_confirm_message', { defaultValue: '确定要删除心愿「{{name}}」吗？此操作无法撤销。', name: showDeleteConfirm.name })}
              </p>
          </AppModal>
        )}
      </AnimatePresence>

      {/* 兑换成功动画 */}
      <CelebrationAnimation
        isVisible={isRedeemSuccess}
        onComplete={handleCelebrationComplete}
        type="reward"
        title={t('rewards.redeem_success', { defaultValue: '兑换成功' })}
        subtitle={redeemedReward ? t('rewards.redeem_detail', { defaultValue: `心愿「${redeemedReward.name}」已提交成功`, name: redeemedReward.name }) : t('checkin.awesome', { defaultValue: '太棒了！' })}
        stars={redeemedReward?.cost || 0}
      />
    </div>
  );
}
