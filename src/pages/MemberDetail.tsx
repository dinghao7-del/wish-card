import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2, Star, Shield, Trophy, ClipboardList, Edit3, Plus, Save, Minus, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { AvatarSelector } from '../components/AvatarSelector';
import { TextAvatar } from '../components/TextAvatar';
import { showConfirm } from '../components/ConfirmDialog';

export function MemberDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const { members, currentUser, deleteMember, tasks, updateMember } = useFamily();
  
  const member = members.find(m => m.id === id);
  const memberTasks = tasks.filter(t => t.assigneeIds.includes(id || ''));

  const [isEditingStars, setIsEditingStars] = useState(false);
  const [newStarsValue, setNewStarsValue] = useState(0);
  const [description, setDescription] = useState('');
  const [isViewingTasks, setIsViewingTasks] = useState(false);
  const [pointsMode, setPointsMode] = useState<'add' | 'deduct'>('add');

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Safety cleanup for modal states
  useEffect(() => {
    return () => {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    };
  }, []);

  if (!member) return null;

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      deleteMember(member.id);
      navigate('/profile');
    }, 1000);
  };

  const openStarEdit = () => {
    if (currentUser?.role === 'parent') {
      setPointsMode('add');
      setNewStarsValue(0);
      setDescription('');
      setIsEditingStars(true);
    }
  };

  const handleUpdateStars = () => {
    const finalChange = pointsMode === 'add' ? newStarsValue : -newStarsValue;
    const finalValue = Math.max(0, member.stars + finalChange);
    updateMember({ ...member, stars: finalValue });
    setIsEditingStars(false);
  };

  const isAdmin = currentUser?.role === 'parent';
  const canEditProfile = isAdmin || currentUser?.id === member.id;

  return (
    <div className="px-6 pb-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">{t('member_detail.title', { defaultValue: '标题' })}</h1>
        <div className="w-10" />
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center mt-8 mb-10">
        <div className="relative group">
          <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl mb-4 flex items-center justify-center">
            <TextAvatar src={member.avatar} name={member.name} size={128} />
          </div>
          {canEditProfile && (
            <button 
              onClick={() => navigate(`/profile/members/edit/${member.id}`)}
              className="absolute -bottom-1 -right-1 w-10 h-10 bg-secondary-container rounded-full shadow-lg flex items-center justify-center text-secondary border-2 border-white z-20 active:scale-90 transition-transform"
            >
              <Edit3 size={18} />
            </button>
          )}
        </div>
        <h2 className="text-2xl font-extrabold">{member.name}</h2>
        <div className="bg-secondary-container px-3 py-1 rounded-full flex items-center gap-1.5 mt-2 shadow-sm">
          <Shield size={12} className="text-secondary" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            {member.role === 'parent' ? t('member_detail.role_parent', { defaultValue: 'role parent' }) : t('member_detail.role_child', { defaultValue: 'role child' })}
          </span>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <motion.div 
          whileTap={isAdmin ? { scale: 0.95 } : {}}
          onClick={openStarEdit}
          className={cn(
            "bg-white rounded-3xl p-5 shadow-sm border border-outline-variant/10 flex flex-col items-center transition-all",
            isAdmin ? "hover:border-primary/30 cursor-pointer active:bg-surface-container-low" : ""
          )}
        >
          <div className="relative">
            <Star size={24} className="text-secondary fill-current mb-2" />
            {isAdmin && <Plus size={10} className="absolute -top-1 -right-2 text-primary font-bold" />}
          </div>
          <span className="text-2xl font-black">{member.stars}</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
            {t('member_detail.current_stars', { defaultValue: '当前星星' })}
          </span>
        </motion.div>
        
        <motion.div 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsViewingTasks(true)}
          className="bg-white rounded-3xl p-5 shadow-sm border border-outline-variant/10 flex flex-col items-center cursor-pointer hover:border-primary/30 transition-all"
        >
          <Trophy size={24} className="text-primary mb-2" />
          <span className="text-2xl font-black">{memberTasks.filter(t => t.status === 'completed').length}</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
            {t('member_detail.completed_tasks', { defaultValue: '已完成任务' })} <ClipboardList size={10} />
          </span>
        </motion.div>
      </section>

      {/* Quick Star Actions */}
      {isAdmin && (
        <section className="flex gap-3 mb-10">
          <button 
            onClick={() => {
              setPointsMode('add');
              setNewStarsValue(0);
              setIsEditingStars(true);
            }}
            className="flex-1 bg-[#2E7D32] text-white py-4 rounded-2xl font-black shadow-lg shadow-green-900/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} />
            {t('member_detail.add_stars', { defaultValue: 'add stars' })}
          </button>
          <button 
            onClick={() => {
              setPointsMode('deduct');
              setNewStarsValue(0);
              setIsEditingStars(true);
            }}
            className="flex-1 bg-white text-on-surface py-4 rounded-2xl font-black shadow-sm border border-outline-variant/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Minus size={18} strokeWidth={3} />
            {t('member_detail.deduct_stars', { defaultValue: 'deduct stars' })}
          </button>
        </section>
      )}

      {/* Task Summary */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            <h3 className="font-bold text-base">{t('member_detail.recent_tasks', { defaultValue: '近期任务' })}</h3>
          </div>
          {memberTasks.length > 3 && (
            <button 
              onClick={() => setIsViewingTasks(true)}
              className="text-primary text-xs font-bold hover:underline"
            >
              {t('member_detail.view_all', { defaultValue: 'view all' })}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {memberTasks.length > 0 ? (
             memberTasks.slice(0, 3).map(task => (
                <div key={task.id} className="bg-white rounded-2xl p-4 flex items-center justify-between border border-outline-variant/5">
                  <span className="font-bold text-sm">{task.title}</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                    task.status === 'completed' ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"
                  )}>
                    {task.status === 'completed' ? t('member_detail.task_completed', { defaultValue: '任务已完成' }) : t('member_detail.task_ongoing', { defaultValue: 'task ongoing' })}
                  </span>
                </div>
             ))
          ) : (
            <p className="text-xs text-on-surface-variant italic py-4 text-center">{t('member_detail.no_tasks', { defaultValue: '暂无任务' })}</p>
          )}
        </div>
      </section>

      {/* Parent Actions */}
      {isAdmin && currentUser.id !== member.id && (
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
        >
          <Trash2 size={18} />
          {t('member_detail.delete_member', { defaultValue: '删除成员' })}
        </button>
      )}

      {/* Admin Entrance for non-admins */}
      {!isAdmin && member.role === 'parent' && (
        <button 
          onClick={async () => {
            if (await showConfirm({ message: t('member_detail.admin_switch_confirm', { defaultValue: 'admin switch confirm' }) })) {
              navigate('/switch-profile');
            }
          }}
          className="w-full py-4 px-8 rounded-2xl bg-primary/10 text-primary font-bold text-center hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 mt-8"
        >
          <Shield size={18} /> {t('member_detail.admin_mode', { defaultValue: 'admin mode' })}
        </button>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('member_detail.delete_confirm_title', { defaultValue: 'delete confirm title' })}</h3>
              <p className="text-on-surface-variant text-sm font-medium mb-8">
                {t('member_detail.delete_confirm_desc', { name: member.name })}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 rounded-2xl bg-surface-container font-bold text-on-surface-variant active:scale-95 transition-transform"
                >
                  {t('common.cancel', { defaultValue: '取消' })}
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                  }}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
                >
                  {t('common.confirm', { defaultValue: '确认' })}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deleting Overlay */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Trash2 size={24} className="text-primary animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-on-surface font-black tracking-widest uppercase animate-pulse">{t('member_detail.deleting', { defaultValue: 'deleting' })}</p>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingStars && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-6 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-center mb-6">{t('member_detail.edit_stars_title', { name: member.name })}</h3>

              <div className="space-y-3 mb-10">
                {/* Points Input Row */}
                <div className="bg-surface-container/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star size={20} className="text-on-surface-variant fill-transparent" />
                    <span className="font-black text-on-surface-variant text-sm">{t('member_detail.stars_label', { defaultValue: 'stars label' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setNewStarsValue(Math.max(0, newStarsValue - 10))}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>
                    <input 
                      type="number"
                      value={newStarsValue}
                      onChange={(e) => setNewStarsValue(Number(e.target.value))}
                      className="w-12 text-center font-black text-lg bg-transparent focus:outline-none"
                    />
                    <button 
                      onClick={() => setNewStarsValue(newStarsValue + 10)}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm active:scale-90 transition-transform"
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="bg-surface-container/30 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-3 border-b border-white/40">
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('member_detail.summary_member', { defaultValue: 'summary member' })}</span>
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest text-center">{t('member_detail.summary_before', { defaultValue: 'summary before' })}</span>
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest text-right">{t('member_detail.summary_after', { defaultValue: 'summary after' })}</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-4 items-center">
                    <span className="font-black text-sm">{member.name}</span>
                    <span className="font-black text-sm text-center">{member.stars}</span>
                    <span className={cn(
                      "font-black text-sm text-right",
                      pointsMode === 'add' ? "text-primary" : "text-red-500"
                    )}>
                      {pointsMode === 'add' ? member.stars + newStarsValue : Math.max(0, member.stars - newStarsValue)}
                    </span>
                  </div>
                </div>

                {/* Description Input */}
                <div className="bg-surface-container/30 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3 mb-1">
                    <ClipboardList size={18} className="text-on-surface-variant/40" />
                    <span className="text-xs font-black text-on-surface-variant/40">{t('member_detail.description_label', { defaultValue: 'description label' })}</span>
                  </div>
                  <input 
                    type="text"
                    placeholder={t('member_detail.description_placeholder', { defaultValue: 'description placeholder' })}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0 placeholder:text-on-surface-variant/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleUpdateStars}
                  className="w-full py-4 rounded-full bg-[#D1E0FF] text-[#4285F4] font-black shadow-sm active:scale-95 transition-transform"
                >
                  {t('common.confirm', { defaultValue: '确认' })}
                </button>
                <button 
                  onClick={() => setIsEditingStars(false)}
                  className="w-full py-2 rounded-full text-on-surface-variant/40 font-black text-xs active:scale-95 transition-transform"
                >
                  {t('common.cancel', { defaultValue: '取消' })}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Completed Tasks Modal */}
      <AnimatePresence>
        {isViewingTasks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background rounded-[2.5rem] p-6 shadow-2xl relative max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Trophy size={20} className="text-primary" />
                  {t('member_detail.completed_tasks_title', { defaultValue: 'completed tasks title' })}
                </h3>
                <button 
                  onClick={() => setIsViewingTasks(false)}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
                {memberTasks.filter(t => t.status === 'completed').length > 0 ? (
                  memberTasks.filter(t => t.status === 'completed').map(task => (
                    <div key={task.id} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm">{task.title}</span>
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                          <Star size={10} className="fill-current" />
                          <span className="text-[10px] font-bold">{task.rewardStars}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-on-surface-variant line-clamp-2">{task.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                    <ClipboardList size={40} className="opacity-20 mb-2" />
                    <p className="text-xs italic">{t('member_detail.no_completed_tasks', { defaultValue: 'no completed tasks' })}</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setIsViewingTasks(false)}
                className="w-full mt-6 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              >
                {t('member_detail.got_it', { defaultValue: 'got it' })}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
