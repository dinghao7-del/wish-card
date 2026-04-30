import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Search, 
  Utensils, 
  Brush, 
  Shirt, 
  ShoppingBag, 
  Users, 
  Wallet, 
  BookOpen, 
  Sparkles, 
  Smile, 
  Angry, 
  Heart, 
  TrendingUp, 
  Trees, 
  Tv, 
  Activity, 
  Eye, 
  Trash2, 
  Box, 
  DoorOpen,
  Star,
  Check,
  Zap,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface TaskTemplate {
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly';
  stars: number;
  icon: any;
}

const TEMPLATE_DATA: TaskTemplate[] = [
  // 家务责任
  { title: '洗衣服', description: '学会使用洗衣机洗自己的简单衣物', category: '家务责任', frequency: 'daily', stars: 2, icon: Shirt },
  { title: '学会做饭', description: '学习做一道简单的菜/准备简单早餐', category: '家务责任', frequency: 'weekly', stars: 2, icon: Utensils },
  { title: '打扫卫生', description: '负责一项固定的家庭公共区域清洁(如扫地、擦桌子、吸尘)', category: '家务责任', frequency: 'weekly', stars: 5, icon: Brush },
  { title: '参与采购', description: '参与家庭采购清单制作/帮忙提东西', category: '家务责任', frequency: 'weekly', stars: 5, icon: ShoppingBag },
  { title: '家庭决策', description: '积极参与家庭决策讨论', category: '家务责任', frequency: 'weekly', stars: 5, icon: Users },
  { title: '整理玩具', description: '把玩具收拾到指定位置且分类', category: '家务责任', frequency: 'daily', stars: 2, icon: Box },
  { title: '整理书架', description: '把图书放回书架上', category: '家务责任', frequency: 'daily', stars: 2, icon: BookOpen },
  { title: '照顾宠物', description: '给宠物添食/水/铲屎', category: '家务责任', frequency: 'daily', stars: 2, icon: Heart },
  { title: '照顾植物', description: '照顾一盆小植物', category: '家务责任', frequency: 'daily', stars: 2, icon: Trees },
  { title: '餐具整理', description: '帮忙摆碗筷/饭后收拾餐桌', category: '家务责任', frequency: 'daily', stars: 2, icon: Utensils },
  { title: '倒垃圾', description: '负责倒自己房间/客厅的垃圾桶', category: '家务责任', frequency: 'daily', stars: 1, icon: Trash2 },
  { title: '整理脏衣服', description: '把脏衣服放进洗衣篮', category: '家务责任', frequency: 'daily', stars: 1, icon: Shirt },
  { title: '叠衣服', description: '折叠衣物并分类收纳', category: '家务责任', frequency: 'daily', stars: 2, icon: Shirt },
  { title: '照顾弟妹', description: '帮忙照看年幼的兄弟姐妹', category: '家务责任', frequency: 'daily', stars: 5, icon: Users },
  { title: '整理房间', description: '独立整理自己的房间（扫地、擦灰、物品归位）', category: '家务责任', frequency: 'daily', stars: 5, icon: DoorOpen },
  
  // 自我管理
  { title: '管理个人财务', description: '管理预算、储蓄、消费记录', category: '自我管理', frequency: 'daily', stars: 2, icon: Wallet },
  { title: '写日记/周记', description: '记录每日的想法、感受', category: '自我管理', frequency: 'daily', stars: 2, icon: BookOpen },
  { title: '本周反思', description: '我做的最棒的一件事/需要改进的地方', category: '自我管理', frequency: 'weekly', stars: 5, icon: Sparkles },
  
  // 性格养成
  { title: '讲礼貌', description: '尊敬长辈，主动和认识的人打招呼', category: '性格养成', frequency: 'daily', stars: 2, icon: Smile },
  { title: '情绪管理', description: '如：公共场合不大声喧哗，一天不发脾气', category: '性格养成', frequency: 'daily', stars: 2, icon: Angry },
  { title: '主动认错', description: '做错事主动承认错误，自我反思', category: '性格养成', frequency: 'daily', stars: 5, icon: Smile },
  { title: '迎难而上', description: '遇到困难主要想办法解决，不半途而废', category: '性格养成', frequency: 'daily', stars: 5, icon: TrendingUp },
  { title: '压力管理', description: '练习放松技巧、寻求支持', category: '性格养成', frequency: 'daily', stars: 5, icon: Heart },
  
  // 运动健康
  { title: '户外散步', description: '去户外看看花/摸摸树叶', category: '运动健康', frequency: 'daily', stars: 2, icon: Trees },
  { title: '遵守屏幕时间规则', description: '按照约定时间玩游戏/看电视', category: '运动健康', frequency: 'daily', stars: 2, icon: Tv },
  { title: '运动锻炼', description: '户外活动/运动30分钟', category: '运动健康', frequency: 'daily', stars: 2, icon: Activity },
  { title: '保护视力', description: '如：做眼保健操、眺望远方10分钟', category: '运动健康', frequency: 'daily', stars: 2, icon: Eye },
];

export function TaskTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(t('task_templates.all', '全部'));

  const categories = [t('task_templates.all', '全部'), ...Array.from(new Set(TEMPLATE_DATA.map(tpl => tpl.category)))];

  const filteredTemplates = TEMPLATE_DATA.filter(template => {
    const matchesSearch = template.title.includes(searchQuery) || template.description.includes(searchQuery);
    const matchesCategory = activeCategory === t('task_templates.all', '全部') || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: TaskTemplate) => {
    // Pick only serializable primitive fields
    const serializableTemplate = {
      title: template.title,
      description: template.description,
      category: template.category,
      frequency: template.frequency,
      stars: template.stars
    };
    
    // Use sessionStorage as a temporary bridge for template data passing
    sessionStorage.setItem('pending_template_selection', JSON.stringify({
      template: serializableTemplate,
      fromMode: location.state?.fromMode 
    }));
    
    // Navigate back to publish task
    navigate('/tasks/new');
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">{t('task_templates.title', '任务模版库')}</h1>
        <div className="w-10" />
      </header>

      <div className="px-6 space-y-6">
        {/* Search & Custom Add */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder={t('task_templates.search_placeholder', '搜索任务')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-none rounded-2xl pl-11 pr-4 py-3.5 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <button 
            onClick={() => navigate('/tasks/new', { state: { fromMode: location.state?.fromMode || 'target' } })}
            className="px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-2 active:scale-95 transition-all shrink-0"
          >
             <Plus size={18} className="text-primary" />
             <span className="text-sm font-black text-on-surface">{t('task_templates.add_custom', '添加自定义')}</span>
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2",
                activeCategory === cat 
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                  : "bg-white border-white text-on-surface-variant/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template List */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, idx) => (
              <motion.div 
                key={`${template.title}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelect(template)}
                className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <template.icon size={24} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-black text-base text-on-surface truncate">{template.title}</h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-black",
                      template.frequency === 'daily' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {template.frequency === 'daily' ? t('task_templates.daily', '每天') : t('task_templates.weekly', '每周')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant/50 line-clamp-1">{template.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-surface-container/30 px-2.5 py-0.5 rounded-full border border-outline-variant/10">
                    <Star size={10} className="text-secondary fill-current" />
                    <span className="text-[10px] font-black text-on-surface/60">{template.stars}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/5 active:scale-90 transition-transform">
                    <Plus size={20} strokeWidth={3} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
