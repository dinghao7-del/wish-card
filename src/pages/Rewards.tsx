import React, { useState } from 'react';
import { Reward } from '../types';
import { Star, Settings, Plus, LayoutGrid, X, ChevronRight, Edit3, Mic } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { TextAvatar } from '../components/TextAvatar';
import { CelebrationAnimation } from '../components/CelebrationAnimation';

export function Rewards() {
  const { rewards, stars, currentUser, redeemReward, setIsUserSelectorOpen } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isRedeemSuccess, setIsRedeemSuccess] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<Reward | null>(null);

  const categories = [
    { id: 'all', label: t('rewards.category.all', { defaultValue: '全部' }) },
    { id: 'common', label: t('rewards.category.common', { defaultValue: '日常' }) },
    { id: 'experience', label: t('rewards.category.experience', { defaultValue: '体验' }) },
    { id: 'prize', label: t('rewards.category.prize', { defaultValue: '奖品' }) },
    { id: 'privilege', label: t('rewards.category.privilege', { defaultValue: '特权' }) },
    { id: 'growth', label: t('rewards.category.growth', { defaultValue: '成长' }) },
    { id: 'activity', label: t('rewards.category.activity', { defaultValue: '活动' }) },
  ];

  const filteredRewards = activeTab === 'all' 
    ? (rewards || []) 
    : (rewards || []).filter(r => r.category === activeTab);

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

  return (
    <div className="px-4 sm:px-6 pb-32 animate-in fade-in duration-500 bg-background min-h-screen">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setIsUserSelectorOpen(true)}
          >
            <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={40} className="border-2 border-surface dark:border-surface shadow-sm group-hover:shadow-md transition-all" />
          </div>
          
          <button 
            onClick={() => setIsAiDialogOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-primary/20 text-[#2E7D32] hover:bg-primary/5 active:scale-95 transition-all"
          >
            <Mic size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            onClick={() => navigate('/history')}
            className="bg-surface-container-low backdrop-blur-sm py-1 sm:py-1.5 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={14} className="sm:size-[18px] text-[#FBC02D] fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => navigate('/settings/family')}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
          >
            <Settings size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <VoiceAssistant 
        isOpen={isAiDialogOpen} 
        onClose={() => setIsAiDialogOpen(false)}
        onOpenCalendarSync={() => navigate('/calendar-sync')}
      />

      <div className="mt-4 mb-6 px-1">
        <div className="flex justify-between items-center">
          <h2 className="text-[32px] font-black tracking-tight text-on-surface leading-[1.1] whitespace-pre-line">
            {t('home.title', { defaultValue: '标题' })}
          </h2>
          {currentUser?.role === 'parent' && (
            <button 
              onClick={() => navigate('/rewards/new')}
              className="bg-primary text-white w-12 h-12 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center shrink-0"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 -mx-1">
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-[13px] font-black whitespace-nowrap transition-all border",
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
      <div className="grid grid-cols-2 gap-4">
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
              className="rounded-3xl overflow-hidden shadow-md border-2 border-outline-variant/10 hover:shadow-xl transition-all group cursor-pointer active:scale-[0.97] bg-surface-container-low relative"
            >
              {/* 图片区域 - 纯CSS渐变背景 */}
              <div className={cn(
                "w-full h-40 relative overflow-hidden flex items-center justify-center",
                // 根据奖励类型分配不同渐变
                reward.cost >= 100 ? "bg-gradient-to-br from-purple-200 to-pink-200" :
                reward.cost >= 50 ? "bg-gradient-to-br from-blue-200 to-cyan-200" :
                reward.cost >= 20 ? "bg-gradient-to-br from-green-200 to-emerald-200" :
                "bg-gradient-to-br from-yellow-200 to-orange-200"
              )}>
                {(reward.image || reward.icon) ? (
                  <img 
                    src={reward.image || reward.icon} 
                    alt={reward.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
                  />
                ) : (
                  /* 大号emoji作为装饰，纯文本无需请求 */
                  <span className="text-8xl opacity-40 select-none">🎁</span>
                )}
                
                {/* 渐变遮罩 + 信息悬浮在底部 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                {/* 编辑按钮 */}
                {currentUser?.role === 'parent' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rewards/edit/${reward.id}`);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-primary active:scale-90 transition-all z-10 shadow-sm"
                  >
                    <Edit3 size={14} />
                  </button>
                )}

                {/* 标题悬浮在图片底部 */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="text-base font-black text-white truncate drop-shadow-sm">{reward.name}</h4>
                </div>
              </div>
              
              {/* 底部操作栏 */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                {/* 成本用大号显示 */}
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-[#FBC02D] fill-current" />
                  <span className="text-lg font-black text-on-surface">{reward.cost}</span>
                </div>

                {stars >= reward.cost ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRedeem(reward);
                    }}
                    className="rounded-full px-4 py-1.5 text-xs font-black bg-primary text-white active:scale-95 transition-all shadow-sm"
                  >
                    {t('rewards.action.redeem', { defaultValue: '兑换' })}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-16 bg-surface-container-high rounded-full overflow-hidden">
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto no-scrollbar border-x border-t border-outline-variant/10 sm:border"
            >
              <button 
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant z-10"
              >
                <X size={24} />
              </button>

              <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden mb-6 shadow-md border-4 border-surface dark:border-surface">
                {(selectedReward.image || selectedReward.icon) && (
                  <img 
                    src={selectedReward.image || selectedReward.icon} 
                    alt={selectedReward.name} 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black">{selectedReward.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">
                       {categories.find(c => c.id === selectedReward.category)?.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-secondary-container/30 dark:bg-secondary/20 px-4 py-1.5 rounded-full text-secondary dark:text-secondary border border-white/50 dark:border-secondary/20 shadow-sm">
                  <Star size={20} className="fill-current" strokeWidth={2.5} />
                  <span className="font-black text-xl">{selectedReward.cost}</span>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm font-bold mb-8 leading-relaxed">
                {selectedReward.description || t('rewards.detail.no_description', { defaultValue: 'no description' })}
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container font-black text-on-surface-variant"
                >
                  {t('rewards.action.cancel', { defaultValue: '取消' })}
                </button>
                <button 
                  disabled={stars < selectedReward.cost}
                  onClick={() => handleRedeem(selectedReward)}
                  className={cn(
                    "flex-[2] py-4 rounded-2xl font-black text-white shadow-xl transition-all border-b-4",
                    stars >= selectedReward.cost 
                      ? "bg-primary border-primary-container shadow-primary/20" 
                      : "bg-surface-container border-transparent text-on-surface-variant/40 cursor-not-allowed"
                  )}
                >
                  {stars >= selectedReward.cost ? t('rewards.action.confirm', { defaultValue: '确认' }) : t('rewards.action.insufficient', { defaultValue: 'insufficient' })}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 兑换成功动画 */}
      <CelebrationAnimation
        isVisible={isRedeemSuccess}
        onComplete={handleCelebrationComplete}
        type="reward"
        title={t('rewards.redeem_success', { defaultValue: '兑换成功' })}
        subtitle={redeemedReward ? t('rewards.redeem_detail', { name: redeemedReward.name }) : t('checkin.awesome', { defaultValue: 'awesome' })}
        stars={redeemedReward?.cost || 0}
      />
    </div>
  );
}
