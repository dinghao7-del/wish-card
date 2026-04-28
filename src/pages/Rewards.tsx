import React, { useState } from 'react';
import { Reward } from '../types';
import { Star, Settings, Plus, LayoutGrid, X, ChevronRight, Edit3, Mic } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { AISmartTaskDialog } from '../components/AISmartTaskDialog';
import { TextAvatar } from '../components/TextAvatar';

export function Rewards() {
  const { rewards, stars, currentUser, redeemReward, setIsUserSelectorOpen } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const categories = [
    { id: 'all', label: t('rewards.category.all') },
    { id: '常用', label: '常用' },
    { id: '体验', label: '体验' },
    { id: '奖品', label: '奖品' },
    { id: '特权', label: '特权' },
    { id: '成长', label: '成长' },
    { id: '活动', label: '活动' },
  ];

  const filteredRewards = activeTab === 'all' 
    ? (rewards || []) 
    : (rewards || []).filter(r => r.category === activeTab);

  const handleRedeem = (reward: Reward) => {
    if (stars >= reward.cost) {
      redeemReward(reward.id);
      setSelectedReward(null);
    }
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

      <AISmartTaskDialog 
        isOpen={isAiDialogOpen} 
        onClose={() => setIsAiDialogOpen(false)} 
      />

      <div className="mt-4 mb-6 px-1">
        <div className="flex justify-between items-center">
          <h2 className="text-[32px] font-black tracking-tight text-on-surface leading-[1.1] whitespace-pre-line">
            {t('home.title')}
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

      {/* Rewards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredRewards.map((reward, idx) => (
            <motion.div 
              key={reward.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => setSelectedReward(reward)}
               className="bg-surface-container-low/60 rounded-[2rem] p-2 flex flex-col shadow-sm border border-outline-variant/10 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden active:scale-[0.98]"
            >
              <div className="aspect-[3/2] w-full rounded-[1.8rem] bg-surface-container-low mb-3 overflow-hidden relative">
                {reward.image && <img src={reward.image} alt={reward.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />}
                
                {currentUser?.role === 'parent' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/rewards/edit/${reward.id}`);
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 bg-surface/90 backdrop-blur-md rounded-full shadow-md flex items-center justify-center text-primary border border-outline-variant/10 active:scale-90 transition-all z-10"
                  >
                    <Edit3 size={16} />
                  </button>
                )}

                <div className="absolute bottom-2.5 left-2 right-2 bg-black/40 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-white/20">
                  <span className="text-[10px] font-black text-white truncate pr-1">{reward.name}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star size={10} className="text-[#FBC02D] fill-current" />
                    <span className="text-[10px] font-black text-white">{reward.cost}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-1.5 pb-2">
                {stars >= reward.cost ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRedeem(reward);
                    }}
                    className="w-full rounded-2xl py-3.5 text-sm font-black text-center transition-all bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-white shadow-lg active:scale-95 group flex items-center justify-center gap-2"
                  >
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>🚀</motion.span>
                    {t('rewards.action.redeem')}
                  </button>
                ) : (
                  <div className="w-full p-3.5 bg-white/40 backdrop-blur-md rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-1 relative z-10">
                      <span className="text-xs font-black text-on-surface-variant/80 underline decoration-[#2E7D32]/20 underline-offset-4">
                        {t('rewards.status.remaining', { count: reward.cost - stars })}
                      </span>
                      <div className="bg-[#2E7D32]/10 px-2 py-1 rounded-lg">
                        <span className="text-sm font-black text-[#2E7D32] tabular-nums">{Math.floor((stars / reward.cost) * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="relative h-2.5 bg-white/50 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stars / reward.cost) * 100}%` }}
                        className="relative h-full bg-gradient-to-r from-[#2E7D32] via-[#66BB6A] to-[#2E7D32] rounded-full"
                        style={{ 
                          boxShadow: '0 0 15px rgba(46, 125, 50, 0.3)',
                          backgroundSize: '200% 100%'
                        }}
                      >
                        {/* Shimmer overlay */}
                        <motion.div
                          animate={{ x: ['-200%', '200%'] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full"
                        />
                      </motion.div>
                    </div>
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
                {selectedReward.image && <img src={selectedReward.image} alt={selectedReward.name} className="w-full h-full object-cover" />}
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
                <div className="flex items-center gap-1 bg-[#FFF9C4] dark:bg-yellow-500/20 px-4 py-1.5 rounded-full text-[#F9A825] dark:text-yellow-400 border border-white/50 dark:border-yellow-500/20 shadow-sm">
                  <Star size={20} className="fill-current" strokeWidth={2.5} />
                  <span className="font-black text-xl">{selectedReward.cost}</span>
                </div>
              </div>
              <p className="text-on-surface-variant text-sm font-bold mb-8 leading-relaxed">
                {selectedReward.description || t('rewards.detail.no_description')}
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container font-black text-on-surface-variant"
                >
                  {t('rewards.action.cancel')}
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
                  {stars >= selectedReward.cost ? t('rewards.action.confirm') : t('rewards.action.insufficient')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
