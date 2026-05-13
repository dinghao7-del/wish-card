import React, { useState, useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Star, Sparkles, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { TextAvatar } from '../components/TextAvatar';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '../components/navigation/TopAppBar';

export function CheckIn() {
  const navigate = useNavigate();
  const { taskId: paramTaskId } = useParams();
  const { tasks, currentUser, completeTask, approveTask } = useFamily();
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<'checkin' | 'approve' | null>(null);
  const { t } = useTranslation();

  const task = useMemo(() => {
    if (paramTaskId) {
      return tasks.find(t => t.id === paramTaskId);
    }
    return tasks.find(t => t.status === 'pending');
  }, [tasks, paramTaskId]);

  const isAdmin = currentUser?.role === 'parent';
  const isApproving = task?.status === 'reviewing';
  const isSuccessApproving = successMode === 'approve';
  const displayIsApproving = isSuccess ? isSuccessApproving : isApproving;

  const handleCheckIn = () => {
    if (!task) return;

    const actionMode = isApproving && isAdmin ? 'approve' : 'checkin';

    setTimeout(() => {
      if (actionMode === 'approve') {
        approveTask(task.id);
      } else {
        completeTask(task.id);
      }
      setSuccessMode(actionMode);
      setIsSuccess(true);
    }, 300);
  };

  if (!task && !isSuccess) {
    return (
      <div className="px-6 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="w-24 h-24 bg-surface-container rounded-[2rem] flex items-center justify-center text-on-surface-variant/20 mb-8 rotate-12">
           <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-on-surface mb-2 tracking-tight">{t('checkin.rest_time', { defaultValue: '休息时间' })}</h2>
        <p className="text-on-surface-variant font-medium">{t('checkin.no_tasks', { defaultValue: '暂无任务' })}</p>
        <button 
           onClick={() => navigate('/')}
	           className="mt-10 px-10 py-4 bg-primary text-white rounded-full font-black shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          {t('checkin.view_home', { defaultValue: '查看首页' })}
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-20 min-h-screen flex flex-col relative overflow-hidden bg-surface">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[40%] bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[40%] h-[30%] bg-secondary/5 rounded-full blur-[100px] -z-10" />

      <TopAppBar
        title={displayIsApproving ? t('checkin.approve_title', { defaultValue: '审核任务' }) : t('checkin.execute_title', { defaultValue: '执行打卡' })}
        backTo="/tasks"
      />

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div 
            key="check-in-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-1 flex flex-col items-center pt-8"
          >
            {/* Task Overview Card */}
            <div className="w-full bg-surface rounded-[2.5rem] p-6 flex items-center shadow-sm border border-outline-variant relative overflow-hidden mb-12 group transition-all hover:shadow-md">
              <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white mr-4 shrink-0 z-10 shadow-lg shadow-primary/20">
                <Star size={32} className="fill-current" />
              </div>
              <div className="relative z-10 flex-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{isApproving ? t('checkin.task_reviewing', { defaultValue: '待审核任务' }) : t('checkin.task_in_progress', { defaultValue: '进行中任务' })}</p>
                <h2 className="font-black text-2xl mb-1 text-on-surface leading-tight">{task?.title}</h2>
                <div className="flex items-center gap-2 text-on-surface-variant/60">
                   <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={24} className="border border-white" />
                   <span className="text-xs font-bold">{isApproving ? t('checkin.submitter', { defaultValue: '提交人' }) : t('checkin.checkin_person', { defaultValue: '打卡人' })}：{currentUser?.name}</span>
                </div>
              </div>
            </div>

            {/* The "Big Green Button" */}
            <div className="flex-1 flex flex-col items-center justify-center w-full pb-10">
               <div className="relative">
                  <motion.button 
                    onClick={handleCheckIn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.92 }}
                    className="relative group w-72 h-72 rounded-full flex flex-col items-center justify-center transition-all duration-500 ease-out z-20"
                  >
	                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-container overflow-hidden shadow-2xl shadow-primary/30">
	                       <div className="absolute top-0 left-0 w-full h-full bg-white/10"></div>
                    </div>
                    
                    {/* Ring animations */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 scale-110 animate-ping opacity-20"></div>
                    <div className="absolute inset-0 rounded-full border border-white/20 scale-105 group-hover:scale-125 group-hover:opacity-0 transition-all duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                       <CheckCircle2 size={88} className="text-white mb-3 drop-shadow-lg" strokeWidth={2.5} />
                       <span className="text-3xl font-black text-white tracking-widest">{isApproving ? t('checkin.confirm_complete', { defaultValue: '确认完成' }) : t('checkin.confirm_checkin', { defaultValue: '确认打卡' })}</span>
                    </div>
                  </motion.button>
               </div>

<motion.div 
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="mt-16 bg-surface-container px-8 py-4 rounded-full flex items-center border border-outline-variant/10 shadow-sm"
>
<div className="bg-secondary-container p-1.5 rounded-lg mr-3 shadow-sm">
  <Star size={20} className="text-secondary fill-current" />
</div>
                    <span className="text-on-surface-variant text-sm font-black tracking-wide">
                    {isApproving ? t('checkin.stars_will_receive', { defaultValue: '将获得' }) : t('checkin.stars_will_get', { defaultValue: '将获得' })} <span className="text-primary text-lg">{task?.rewardStars}</span> {t('checkin.stars_reward', { defaultValue: '星星奖励' })}
                  </span>
               </motion.div>

               <motion.p 
                 animate={{ opacity: [0.4, 1, 0.4] }}
                 transition={{ duration: 3, repeat: Infinity }}
                 className="mt-10 text-primary font-black text-sm tracking-widest uppercase opacity-60"
               >
                  {t('checkin.keep_going', { defaultValue: '继续加油' })}
               </motion.p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-screen"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="relative">
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
	                className="w-40 h-40 bg-gradient-to-br from-primary to-primary-container rounded-[3rem] flex items-center justify-center text-white shadow-2xl shadow-primary/25 relative z-10"
              >
                <CheckCircle2 size={96} className="drop-shadow-lg" strokeWidth={3} />
              </motion.div>
              
              {/* Confetti Particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: [0, 1.5, 0], 
                    x: Math.cos(i * 30 * Math.PI / 180) * 120, 
                    y: Math.sin(i * 30 * Math.PI / 180) * 120,
                    rotate: 360
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5, delay: i * 0.1 }}
className={cn(
  "absolute top-1/2 left-1/2 w-4 h-4 rounded-lg",
  i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-secondary" : "bg-tertiary"
)}
                />
              ))}
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl font-black text-on-surface tracking-tighter">{isSuccessApproving ? t('checkin.approve_complete', { defaultValue: '审核完成' }) : t('checkin.checkin_success', { defaultValue: '打卡成功' })}</h1>
              <p className="text-on-surface-variant font-bold text-base">{isSuccessApproving ? t('checkin.reward_distributed', { defaultValue: '星星已发放' }) : t('checkin.forest_greener', { defaultValue: '森林更加茂盛了' })}</p>
            </div>

            <div className="bg-surface rounded-[2rem] p-5 w-full shadow-sm border border-outline-variant relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl -mr-10 -mt-10" />
               <p className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest mb-3">{isSuccessApproving ? t('checkin.star_detail_approve', { defaultValue: '星星详情' }) : t('checkin.star_detail', { defaultValue: '打卡详情' })}</p>
               <div className="flex items-center justify-center gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-secondary shadow-inner">
                    <Star size={32} className="fill-current" />
                 </div>
                 <div className="text-left">
                   <div className="flex items-center gap-1">
                      <span className="text-3xl font-black text-on-surface">+{task?.rewardStars}</span>
                      <span className="text-base font-black text-on-surface-variant">{t('checkin.stars_reward', { defaultValue: '星星奖励' })}</span>
                   </div>
                   <p className="text-xs font-bold text-tertiary/60">{isSuccessApproving ? t('checkin.reward_credited', { defaultValue: '奖励已到账' }) : t('checkin.waiting_approval', { defaultValue: '待审核确认' })}</p>
                 </div>
               </div>
            </div>

<button 
  onClick={() => navigate('/tasks')}
	  className="w-full py-4 bg-primary text-white font-black text-lg rounded-[2rem] shadow-lg shadow-primary/20 active:scale-95 transition-all hover:bg-primary/90 mt-3"
>
              {t('checkin.awesome', { defaultValue: '太棒了' })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
