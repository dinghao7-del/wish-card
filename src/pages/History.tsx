import React from 'react';
import { Star, TrendingUp, TrendingDown, Clock, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { getRegisteredTaskIcon } from '../lib/lucideIconRegistry';

export function History() {
  const navigate = useNavigate();
  const { history, currentUser } = useFamily();

  React.useEffect(() => {
    if (!currentUser) {
      navigate('/switch-profile');
    }
  }, [currentUser, navigate]);

  const userHistory = currentUser ? history.filter(h => h.userId === currentUser.id) : [];

  const getRecordIcon = (iconName: string, size = 20) => {
    const IconComponent = getRegisteredTaskIcon(iconName);
    if (IconComponent) return <IconComponent size={size} />;
    return <Star size={size} />;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-surface pb-20 animate-in fade-in duration-500">
      <TopAppBar title="星星足迹" backTo="/profile" />

      <div className="px-4 py-4">
        <div className="bg-primary-container rounded-[2.5rem] py-6 px-8 mb-6 flex flex-col items-center justify-center text-primary-text shadow-sm relative overflow-hidden border border-primary-surface/30">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
          
          <Star size={40} className="mb-2 text-reward-display fill-current animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest opacity-75 mb-0.5 text-secondary-container">当前余额</span>
          <h2 className="text-[4rem] font-black tabular-nums text-white">{currentUser?.stars || 0}</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-on-surface flex items-center gap-2">
              <Clock size={18} />
              最近变更
            </h3>
          </div>

          {userHistory.length > 0 ? (
            userHistory.map((record, idx) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl p-5 shadow-sm border border-outline-variant/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
<div className={cn(
  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
  record.stars > 0 ? "bg-primary-container text-primary-text" : "bg-secondary-container text-secondary"
)}>
                    {getRecordIcon(record.icon || (record.stars > 0 ? 'TrendingUp' : 'TrendingDown'))}
                  </div>
                  <div>
                    <h4 className="font-black text-on-surface text-sm">{record.title}</h4>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 mt-0.5">{formatDate(record.timestamp)}</p>
                  </div>
                </div>
<div className={cn(
  "font-black text-lg",
  record.stars > 0 ? "text-primary-text" : "text-secondary"
)}>
                  {record.stars > 0 ? `+${record.stars}` : record.stars}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant/20 italic">
               <Trophy size={64} className="mb-4 opacity-10" />
               <p>还没有星星记录哦，快去完成任务吧 🍃</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
