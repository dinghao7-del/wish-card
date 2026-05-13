/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronRight, Sun, Moon,
  Brain, Heart, Star, Target, Palette, Music,
  Dumbbell, BookOpen, Clock, AlertCircle, Loader2,
  CheckCircle2, RefreshCw, Save, Lightbulb,
  Baby, School, User, Smartphone, DollarSign,
  Activity, FileText, MessageCircle, Send,
  ChevronDown, Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { useFamily } from '../context/FamilyContext';
import {
  type ChildProfile,
  type ScheduleRecommendation,
  type TimeSlot,
  type RecommendedActivity,
  getDefaultChildProfile,
  generateScheduleRecommendation,
  applyRecommendationConsent,
  scheduleRecommendationToDailyScheduleTemplate,
  refineScheduleRecommendation,
} from '../lib/scheduleRecommendAI';
import { getRecommendationConsent, type RecommendationConsentState } from '../lib/recommendationConsent';
import { recordRecommendationEvent } from '../lib/recommendationEvents';
import { toAgeRange, toGradeBand } from '../lib/communityShare';
import { getDataLayer } from '../lib/DataLayer';
import { showToastGlobal } from '../components/Toast';
import { saveGuestPlan } from '../lib/guestPlans';
import { buildPlanExecutionTaskBundle, buildUiTaskFromDraft } from '../lib/planExecutionTasks';

// ==================== 常量 ====================

const GRADE_OPTIONS = [
  '幼儿园小班', '幼儿园中班', '幼儿园大班',
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三',
  '高一', '高二', '高三',
];

const SUBJECT_OPTIONS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '科学', '编程', '美术', '音乐',
];

const INTEREST_OPTIONS_MALE = [
  '篮球', '足球', '游泳', '武术/跆拳道', '编程', '围棋/象棋',
  '乐高/机器人', '架子鼓', '街舞', '画画', '轮滑', '科学实验',
  '演讲口才', '英语', '书法', '乒乓球', '羽毛球', '网球',
  '天文', '航模', '吉他',
];

const INTEREST_OPTIONS_FEMALE = [
  '中国舞/芭蕾', '钢琴', '画画', '游泳', '英语', '演讲口才',
  '书法', '羽毛球', '声乐', '陶艺/手工', '小提琴', '围棋',
  '编程', '中国舞/拉丁', '溜冰/轮滑', '乒乓球', '科学实验',
  '花样滑冰', '古筝', '瑜伽',
];

const PERSONALITY_OPTIONS = [
  '外向活泼', '内向文静', '好动坐不住', '专注力好',
  '胆小谨慎', '勇于尝试', '敏感细腻', '大大咧咧',
  '喜欢社交', '喜欢独处', '争强好胜', '随和佛系',
  '动手能力强', '语言表达好', '逻辑思维强', '想象力丰富',
];

const EXPECTATION_OPTIONS = [
  '快乐成长为主', '升学导向（注重成绩）',
  '培养特长/才艺', '增强体能/健康',
  '提升社交与自信', '培养独立自主能力',
  '打好学科基础', '发掘/培养兴趣',
];

const CITY_OPTIONS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉',
  '南京', '西安', '重庆', '长沙', '苏州', '天津', '郑州',
  '东莞', '青岛', '沈阳', '宁波', '昆明', '其他',
];

// ==================== 标签项组件 ====================

function ChipSelect({
  options,
  selected,
  onChange,
  multi = true,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  multi?: boolean;
  placeholder?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? options : options.slice(0, 8);

  const toggle = (val: string) => {
    if (multi) {
      onChange(
        selected.includes(val)
          ? selected.filter(s => s !== val)
          : [...selected, val]
      );
    } else {
      onChange([val]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {displayed.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-black transition-all border-2",
              selected.includes(opt)
                ? "bg-primary border-primary text-white shadow-sm"
                : "bg-surface dark:bg-surface-container-high border-outline-variant/10 text-on-surface-variant/60 hover:border-primary/30"
            )}
          >
            {opt}
          </button>
        ))}
        {options.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1.5 rounded-full text-xs font-black border-2 border-dashed border-outline-variant/20 text-primary"
          >
            {showAll ? '收起' : `+${options.length - 8}更多`}
          </button>
        )}
      </div>
      {selected.length === 0 && placeholder && (
        <p className="text-[10px] text-on-surface-variant/40 font-bold mt-1.5">{placeholder}</p>
      )}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant/40">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ==================== 主页面 ====================

export function ScheduleRecommend() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { familyId, guestMode, currentUser, members, addTask } = useFamily();

  // 步骤状态
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ChildProfile>(getDefaultChildProfile());
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<ScheduleRecommendation | null>(null);
  const [recommendationConsent, setRecommendationConsent] = useState<RecommendationConsentState | null>(null);
  const [hiddenRecommendationSections, setHiddenRecommendationSections] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend' | 'activities' | 'advice'>('weekday');

  // 滚动引用
  const resultRef = useRef<HTMLDivElement>(null);
  const recordedEducationImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function loadConsent() {
      const consent = await getRecommendationConsent();
      if (!active) return;
      setRecommendationConsent(consent);
    }
    loadConsent();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'activities' || !recommendation?.recommendedActivities.length) return;

    const itemId = recommendation.recommendedActivities
      .map(activity => activity.name)
      .sort()
      .join('|');
    if (recordedEducationImpressions.current.has(itemId)) return;
    recordedEducationImpressions.current.add(itemId);

    recordRecommendationEvent({
      category: 'education',
      eventType: 'impression',
      itemId,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: {
        source: 'schedule_recommend',
        gradeBand: toGradeBand(profile.grade),
        ageRange: toAgeRange(profile.age ? [profile.age] : undefined),
        slotCount: recommendation.recommendedActivities.length,
        categoryMix: Array.from(new Set(recommendation.recommendedActivities.map(activity => activity.category))),
        recommendationReason: 'activity_impression',
      },
    });
  }, [activeTab, currentUser?.id, familyId, profile.age, profile.grade, recommendation]);

  const handleRecommendedActivityClick = (activity: RecommendedActivity) => {
    recordRecommendationEvent({
      category: 'education',
      eventType: 'click',
      itemId: activity.name,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: {
        source: 'schedule_recommend',
        gradeBand: toGradeBand(profile.grade),
        ageRange: toAgeRange(profile.age ? [profile.age] : undefined),
        categoryMix: [activity.category],
        recommendationReason: `${activity.priority}：${activity.reason}`,
      },
    });
  };

  // 步骤标题和描述
  const steps = [
    { title: '基本信息', icon: User, desc: '孩子的年龄、年级和基本情况' },
    { title: '学业与时间', icon: BookOpen, desc: '学业情况、作业时长和空闲时间' },
    { title: '兴趣与特长', icon: Heart, desc: '已有的兴趣班和特长爱好' },
    { title: '性格与期望', icon: Target, desc: '性格特点、家长期望和预算' },
    { title: 'AI 生成中...', icon: Sparkles, desc: '正在生成个性化推荐方案' },
    { title: '推荐方案', icon: Star, desc: '您的个性化日程推荐' },
  ];

  // 是否已填写性别
  const hasGender = profile.gender !== '';

  // 根据性别获取兴趣推荐选项
  const interestOptions = profile.gender === 'boy'
    ? INTEREST_OPTIONS_MALE
    : profile.gender === 'girl'
      ? INTEREST_OPTIONS_FEMALE
      : [...new Set([...INTEREST_OPTIONS_MALE, ...INTEREST_OPTIONS_FEMALE])];

  // ============= 生成推荐 =============

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setStep(4); // 生成中步骤

    try {
      const result = await generateScheduleRecommendation(profile);
      const consent = recommendationConsent || await getRecommendationConsent();
      const filtered = applyRecommendationConsent(result, consent);
      setRecommendation(filtered.recommendation);
      setHiddenRecommendationSections(filtered.hiddenSections);
      setStep(5);
      // 滚动到结果区域
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: any) {
      setError(err.message || '生成推荐失败，请重试');
      setStep(3); // 回到信息收集步骤
    } finally {
      setIsGenerating(false);
    }
  };

  // ============= 反馈修订 =============

  const handleRefine = async () => {
    if (!feedbackInput.trim() || !recommendation) return;
    setIsRefining(true);
    try {
      const refined = await refineScheduleRecommendation(recommendation, feedbackInput);
      const consent = recommendationConsent || await getRecommendationConsent();
      const filtered = applyRecommendationConsent(refined, consent);
      setRecommendation(filtered.recommendation);
      setHiddenRecommendationSections(filtered.hiddenSections);
      setFeedbackInput('');
    } catch (err: any) {
      setError(err.message || '修订失败，请重试');
    } finally {
      setIsRefining(false);
    }
  };

  // ============= 保存为计划 =============

  const handleSaveAsPlan = async () => {
    if (!recommendation) return;
    if (guestMode) {
      if (!currentUser) {
        showToastGlobal('请先选择当前用户', 'warning');
        return;
      }
      setIsSavingPlan(true);
      const schedule = scheduleRecommendationToDailyScheduleTemplate(recommendation, 'weekday');
      const planId = `guest-ai-${Date.now()}`;
      const planName = `${profile.grade || profile.age || '孩子'}智能日程方案`;
      const planType = 'AI智能日程';
      const metadata = {
        ...schedule,
        grade: profile.grade,
        aiRecommendation: recommendation,
        aiProfile: profile,
        source: 'ai_schedule_recommend',
        kind: 'routine',
        activationStatus: 'saved',
        autoNextStep: 'generate_tasks',
      };
      try {
        saveGuestPlan({
          id: planId,
          name: planName,
          type: planType,
          metadata,
          sortOrder: Date.now(),
          actorMemberId: currentUser.id,
        });
        const childIds = members.filter(member => member.role === 'child').map(member => member.id);
        const taskBundle = buildPlanExecutionTaskBundle({
          planId,
          planName,
          planType,
          planKind: 'routine',
          creatorId: currentUser.id,
          familyId: familyId || 'guest-family',
          childIds,
          schedule,
          sceneType: 'weekday',
        });
        for (const draft of taskBundle.drafts) {
          await addTask(buildUiTaskFromDraft(draft, { planId, creatorId: currentUser.id }));
        }
        showToastGlobal(`计划已保存到本机，并生成 ${taskBundle.drafts.length} 个执行任务`, 'success');
        navigate(`/plans/${planId}?from=ai-saved&generatedTasks=${taskBundle.drafts.length}`);
      } catch (err: any) {
        showToastGlobal(`保存失败: ${err.message || '请稍后重试'}`, 'error');
      } finally {
        setIsSavingPlan(false);
      }
      return;
    }
    if (!familyId || !currentUser) {
      showToastGlobal('请先登录家庭账号后再保存计划', 'warning');
      return;
    }

    setIsSavingPlan(true);
    try {
      const schedule = scheduleRecommendationToDailyScheduleTemplate(recommendation, 'weekday');
      const plan = await getDataLayer().addPlan({
        name: `${profile.grade || profile.age || '孩子'}智能日程方案`,
        type: profile.grade ? `${profile.grade} AI方案` : 'AI智能日程',
        metadata: {
          ...schedule,
          grade: profile.grade,
          aiRecommendation: recommendation,
          aiProfile: profile,
          source: 'ai_schedule_recommend',
          kind: 'routine',
          activationStatus: 'saved',
          autoNextStep: 'generate_tasks',
        },
        sortOrder: Date.now(),
        actorMemberId: currentUser.id,
      });
      showToastGlobal('计划已保存，下一步可以生成每日任务', 'success');
      navigate(`/plans/${plan.id}?from=ai-saved&suggest=tasks`);
    } catch (err: any) {
      showToastGlobal(`保存失败: ${err.message || '请稍后重试'}`, 'error');
    } finally {
      setIsSavingPlan(false);
    }
  };

  // ============= 是否可进入下一步 =============

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return hasGender && (profile.age !== null || profile.grade !== '');
      case 1: return true; // 可选填
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  };

  // ============= 渲染单个步骤 =============

  const renderStep = () => {
    switch (step) {
      case 0: return renderBasicInfo();
      case 1: return renderAcademicInfo();
      case 2: return renderInterestInfo();
      case 3: return renderPersonalityInfo();
      case 4: return renderGenerating();
      case 5: return renderResult();
      default: return null;
    }
  };

  // ============= 步骤 0: 基本信息 =============

  const renderBasicInfo = () => (
    <div className="space-y-6">
      {/* 性别选择 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          孩子的性别 <span className="text-danger">*</span>
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setProfile({ ...profile, gender: 'girl', existingInterests: [] })}
            className={cn(
              "flex-1 py-5 rounded-2xl border-2 text-center transition-all",
              profile.gender === 'girl'
                ? "bg-primary/5 border-primary shadow-sm"
                : "bg-surface dark:bg-surface-container-high border-outline-variant/10 hover:border-primary/30"
            )}
          >
            <span className="text-3xl block mb-1">👧</span>
            <span className="text-sm font-black block">女孩</span>
          </button>
          <button
            onClick={() => setProfile({ ...profile, gender: 'boy', existingInterests: [] })}
            className={cn(
              "flex-1 py-5 rounded-2xl border-2 text-center transition-all",
              profile.gender === 'boy'
                ? "bg-primary/5 border-primary shadow-sm"
                : "bg-surface dark:bg-surface-container-high border-outline-variant/10 hover:border-primary/30"
            )}
          >
            <span className="text-3xl block mb-1">👦</span>
            <span className="text-sm font-black block">男孩</span>
          </button>
        </div>
      </div>

      {/* 年级 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          年级/学段 <span className="text-danger">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            options={GRADE_OPTIONS}
            selected={profile.grade ? [profile.grade] : []}
            onChange={v => {
              const grade = v[0] || '';
              setProfile({
                ...profile,
                grade,
                age: grade ? getAgeFromGrade(grade) : profile.age,
              });
            }}
            multi={false}
            placeholder="选择孩子当前的年级"
          />
        </div>
      </div>

      {/* 年龄 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">年龄（岁）</label>
        <NumberInput
          value={profile.age}
          onChange={v => setProfile({ ...profile, age: v })}
          suffix="岁"
          placeholder="输入年龄"
        />
      </div>

      {/* 城市 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">所在城市</label>
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            options={CITY_OPTIONS}
            selected={profile.city ? [profile.city] : []}
            onChange={v => setProfile({ ...profile, city: v[0] || '' })}
            multi={false}
            placeholder="选择所在城市（可选）"
          />
        </div>
      </div>

      {/* 学校类型 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">学校类型</label>
        <div className="flex gap-3">
          {(['公立', '私立', '国际'] as const).map(type => (
            <button
              key={type}
              onClick={() => setProfile({ ...profile, schoolType: type })}
              className={cn(
                "flex-1 py-3 rounded-2xl border-2 text-sm font-black transition-all",
                profile.schoolType === type
                  ? "bg-primary/5 border-primary text-primary"
                  : "bg-surface dark:bg-surface-container-high border-outline-variant/10 text-on-surface-variant/60"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============= 步骤 1: 学业与时间 =============

  const renderAcademicInfo = () => (
    <div className="space-y-6">
      {/* 强势科目 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Star size={16} className="text-warning" />
          强项科目
        </label>
        <ChipSelect
          options={SUBJECT_OPTIONS}
          selected={profile.strongSubjects}
          onChange={v => setProfile({ ...profile, strongSubjects: v })}
          placeholder="选择孩子的强项科目（可选）"
        />
      </div>

      {/* 薄弱科目 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          需要提升的科目
        </label>
        <ChipSelect
          options={SUBJECT_OPTIONS}
          selected={profile.weakSubjects}
          onChange={v => setProfile({ ...profile, weakSubjects: v })}
          placeholder="选择需要加强的科目（可选）"
        />
      </div>

      {/* 作业时长 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          每天完成学校作业大约需要多久？
        </label>
        <NumberInput
          value={profile.homeworkDuration}
          onChange={v => setProfile({ ...profile, homeworkDuration: v })}
          suffix="分钟"
          placeholder="例如：60"
        />
      </div>

      {/* 可自由支配时间 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          放学后每天大约有多少可自由支配的时间？
        </label>
        <NumberInput
          value={profile.freeTimePerDay}
          onChange={v => setProfile({ ...profile, freeTimePerDay: v })}
          suffix="小时"
          placeholder="例如：2"
        />
      </div>
    </div>
  );

  // ============= 步骤 2: 兴趣与特长 =============

  const renderInterestInfo = () => (
    <div className="space-y-6">
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
        <p className="text-xs font-bold text-primary flex items-center gap-2">
          <Lightbulb size={14} />
          {profile.gender === 'girl' ? '以下是其他家长常为女孩选择的兴趣方向，供参考' :
           profile.gender === 'boy' ? '以下是其他家长常为男孩选择的兴趣方向，供参考' :
           '以下是一些常见的兴趣方向，供参考'}
        </p>
      </div>

      {/* 已有兴趣班 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          孩子目前正在上的兴趣班 / 感兴趣的方向
        </label>
        <ChipSelect
          options={interestOptions}
          selected={profile.existingInterests}
          onChange={v => setProfile({ ...profile, existingInterests: v })}
          placeholder="选择已有的兴趣方向（可多选）"
        />
      </div>

      {/* 已有固定日程 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Clock size={16} className="text-blue-400" />
          目前已有固定安排的时段（如 "周一16:00-18:00 钢琴"）
        </label>
        <input
          value={profile.existingSchedules.join('；')}
          onChange={e => setProfile({ ...profile, existingSchedules: e.target.value ? [e.target.value] : [] })}
          placeholder="输入已有的固定安排，如：周一16-18钢琴"
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 电子设备使用 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-purple-400" />
          孩子每天使用电子设备（手机/平板/游戏）的情况
        </label>
        <input
          value={profile.screenTime}
          onChange={e => setProfile({ ...profile, screenTime: e.target.value })}
          placeholder="例如：每天约30分钟平板看动画片，周末会玩游戏1小时"
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>
    </div>
  );

  // ============= 步骤 3: 性格与期望 =============

  const renderPersonalityInfo = () => (
    <div className="space-y-6">
      {/* 性格特点 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Brain size={16} className="text-tertiary" />
          孩子的性格特点
        </label>
        <ChipSelect
          options={PERSONALITY_OPTIONS}
          selected={profile.personality}
          onChange={v => setProfile({ ...profile, personality: v })}
          placeholder="选择符合孩子的性格特点（可多选）"
        />
        <input
          value={profile.personalityOther}
          onChange={e => setProfile({ ...profile, personalityOther: e.target.value })}
          placeholder="其他性格特点补充..."
          className="w-full mt-2 px-4 py-2.5 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 家长期望 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Target size={16} className="text-primary" />
          您对孩子的期望方向
        </label>
        <ChipSelect
          options={EXPECTATION_OPTIONS}
          selected={profile.parentExpectation}
          onChange={v => setProfile({ ...profile, parentExpectation: v })}
          placeholder="选择您最看重的方向（可多选）"
        />
        <input
          value={profile.expectationOther}
          onChange={e => setProfile({ ...profile, expectationOther: e.target.value })}
          placeholder="其他期望补充..."
          className="w-full mt-2 px-4 py-2.5 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 预算 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          每月兴趣班预算
        </label>
        <NumberInput
          value={profile.budget}
          onChange={v => setProfile({ ...profile, budget: v })}
          suffix="元/月"
          placeholder="例如：1000"
        />
      </div>

      {/* 健康 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Activity size={16} className="text-orange-400" />
          健康注意事项（视力/体能/过敏等）
        </label>
        <input
          value={profile.healthNotes}
          onChange={e => setProfile({ ...profile, healthNotes: e.target.value })}
          placeholder="例如：视力需要保护，不适合长时间练琴；体能一般..."
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 其他 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          其他想补充的说明
        </label>
        <textarea
          value={profile.otherNotes}
          onChange={e => setProfile({ ...profile, otherNotes: e.target.value })}
          placeholder="任何其他想告诉我们的信息..."
          rows={3}
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors resize-none"
        />
      </div>
    </div>
  );

  // ============= 生成中 =============

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles size={48} className="text-primary" />
      </motion.div>
      <div className="text-center">
        <h3 className="text-lg font-black text-on-surface mb-2">AI 正在分析...</h3>
        <p className="text-sm font-bold text-on-surface-variant/60">
          正在根据您提供的信息，结合教育专家知识库，生成个性化方案
        </p>
      </div>
      <div className="flex gap-2">
        {['分析信息', '匹配知识库', '生成方案'].map((text, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.8, repeat: Infinity, repeatDelay: 1.6 }}
            className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black"
          >
            {text}
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ============= 结果展示 =============

  const renderResult = () => {
    if (!recommendation) return null;

    return (
      <div ref={resultRef} className="space-y-6 pb-8">
        {/* 综合分析摘要 */}
        <div className="bg-gradient-to-br from-primary/5 via-primary-container/[0.03] to-primary-text/5 rounded-3xl p-5 border border-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={22} className="text-primary" />
            </div>
            <div>
              <h3 className="font-black text-on-surface text-sm">AI 综合分析</h3>
              <p className="text-[10px] font-bold text-on-surface-variant/40">
                基于 {profile.age || '对应年级'} 岁{profile.gender === 'boy' ? '男孩' : '女孩'}
                {profile.grade ? ` · ${profile.grade}` : ''} 的个性化方案
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-on-surface-variant/80 leading-relaxed">
            {recommendation.summary}
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1">
          {([
            { key: 'weekday', label: '平日作息', icon: Sun },
            { key: 'weekend', label: '周末作息', icon: Moon },
            { key: 'activities', label: '推荐活动', icon: Star },
            { key: 'advice', label: '学习策略', icon: BookOpen },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2",
                activeTab === tab.key
                  ? "bg-primary border-primary text-white shadow-sm"
                  : "bg-surface dark:bg-surface-container-high border-outline-variant/10 text-on-surface-variant/60"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === 'weekday' && renderTimeSlots(recommendation.weekdaySchedule, '平日作息表')}
            {activeTab === 'weekend' && renderTimeSlots(recommendation.weekendSchedule, '周末作息表')}
            {activeTab === 'activities' && renderActivities(recommendation.recommendedActivities, recommendation.avoidActivities)}
            {activeTab === 'advice' && renderAdvice(recommendation)}
          </motion.div>
        </AnimatePresence>

        {/* 反馈修订 */}
        <div className="bg-surface dark:bg-surface-container-high rounded-3xl p-4 border border-outline-variant/10">
          <p className="text-sm font-black text-on-surface mb-3 flex items-center gap-2">
            <MessageCircle size={16} />
            对方案不满意？提出修改意见
          </p>
          <div className="flex gap-2">
            <input
              value={feedbackInput}
              onChange={e => setFeedbackInput(e.target.value)}
              placeholder="例如：希望增加户外活动时间/减少周末学习..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
              onKeyPress={e => e.key === 'Enter' && handleRefine()}
            />
            <button
              onClick={handleRefine}
              disabled={!feedbackInput.trim() || isRefining}
              className="px-4 py-2.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
            >
              {isRefining ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              调整
            </button>
          </div>
        </div>

        {/* 家长建议 */}
        <div className="bg-warning-container/50 rounded-3xl p-5 border border-warning/20">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-warning" />
            <h3 className="font-black text-sm text-warning">给家长的建议</h3>
          </div>
          <ul className="space-y-2">
            {recommendation.parentTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-bold text-warning">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-warning-container text-warning flex items-center justify-center text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* 发展阶段 */}
        {recommendation.developmentPath && recommendation.developmentPath.length > 0 && (
          <div className="bg-surface dark:bg-surface-container-high rounded-3xl p-5 border border-outline-variant/10">
            <h3 className="font-black text-sm text-on-surface mb-4 flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              分阶段发展路径
            </h3>
            <div className="space-y-4">
              {recommendation.developmentPath.map((phase, i) => (
                <div key={i} className="relative pl-6">
                  {i < (recommendation.developmentPath?.length ?? 0) - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-[2px] bg-primary/20" />
                  )}
                  <div className="absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-2 border-primary bg-surface" />
                  <p className="text-xs font-black text-primary">{phase.phase} · {phase.timeRange}</p>
                  <p className="text-xs font-bold text-on-surface-variant/70 mt-1">{phase.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {phase.focus.map((f, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-black">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSaveAsPlan}
            disabled={isSavingPlan}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isSavingPlan ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSavingPlan ? '保存中...' : '保存为计划'}
          </button>
          <button
            onClick={() => {
              setStep(0);
              setRecommendation(null);
              setProfile(getDefaultChildProfile());
            }}
            className="w-full py-3.5 rounded-2xl bg-surface-container-high text-on-surface-variant font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <RefreshCw size={16} />
            重新开始
          </button>
        </div>
      </div>
    );
  };

  // ============= 渲染时间表 =============

  const renderTimeSlots = (slots: TimeSlot[], title: string) => (
    <div className="bg-surface dark:bg-surface-container-high rounded-3xl overflow-hidden border border-outline-variant/10">
      <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
        <h3 className="font-black text-sm text-on-surface">{title}</h3>
        <span className="text-[10px] font-bold text-on-surface-variant/40">{slots.length} 个时段</span>
      </div>
      <div className="divide-y divide-outline-variant/5">
        {slots.map((slot, i) => {
          const isSleep = slot.activity.includes('睡觉') || slot.activity.includes('睡眠');
          const isMeal = slot.activity.includes('餐') || slot.activity.includes('饭');
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 p-3.5 transition-colors",
                isSleep && "bg-tertiary-container/20",
                isMeal && "bg-warning-container/30",
              )}
            >
              {/* 时间轴 */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1",
                  isSleep ? "bg-tertiary" : isMeal ? "bg-warning" : "bg-primary"
                )} />
                <div>
                  <p className="text-xs font-black text-on-surface">{slot.time}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/40">{slot.duration}</p>
                </div>
              </div>
              {/* 活动 */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-black",
                  isSleep ? "text-tertiary" : "text-on-surface"
                )}>
                  {slot.icon && <span className="mr-1.5">{slot.icon}</span>}
                  {slot.activity}
                </p>
                {slot.notes && (
                  <p className="text-[10px] font-bold text-on-surface-variant/50 mt-0.5">{slot.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ============= 渲染推荐活动 =============

  const renderActivities = (activities: RecommendedActivity[], avoid: string[]) => (
    <div className="space-y-4">
      <div className="bg-surface dark:bg-surface-container-high rounded-3xl overflow-hidden border border-outline-variant/10">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="font-black text-sm text-on-surface">推荐兴趣/活动方向</h3>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {activities.length === 0 && hiddenRecommendationSections.includes('education_activities') && (
            <div className="p-4">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm font-black text-on-surface">暂时没有匹配到活动建议</p>
                <p className="text-xs font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                  可以继续补充孩子兴趣、空余时间和家庭偏好，系统会根据日程画像更新推荐。
                </p>
              </div>
            </div>
          )}
          {activities.map((act, i) => (
            <button
              key={i}
              onClick={() => handleRecommendedActivityClick(act)}
              className="block w-full p-4 text-left active:bg-surface-container-low transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full",
                      act.priority === '强烈推荐'
                        ? "bg-primary-container/20 text-primary"
                        : act.priority === '推荐'
                          ? "bg-primary-container/20 text-primary"
                          : "bg-surface-container text-on-surface-variant"
                    )}>
                      {act.priority}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant/40 px-2 py-0.5 rounded-full bg-outline-variant/10">
                      {act.category}
                    </span>
                  </div>
                  <p className="text-sm font-black text-on-surface mt-1.5">{act.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-primary">{act.weeklyHours}h/周</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/40">建议{act.recommendedAge}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed">{act.reason}</p>
            </button>
          ))}
        </div>
      </div>

      {avoid.length > 0 && (
        <div className="bg-danger-container rounded-3xl p-4 border border-danger/20">
          <p className="text-xs font-black text-danger mb-2 flex items-center gap-2">
            <AlertCircle size={14} />
            谨慎考虑的方向
          </p>
          <div className="flex flex-wrap gap-2">
            {avoid.map((a, i) => (
              <span key={i} className="text-xs font-bold text-danger px-2.5 py-1 rounded-full bg-danger-container">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============= 渲染学习策略 =============

  const renderAdvice = (rec: ScheduleRecommendation) => (
    <div className="space-y-4">
      {/* 各科策略 */}
      <div className="bg-surface dark:bg-surface-container-high rounded-3xl overflow-hidden border border-outline-variant/10">
        <div className="p-4 border-b border-outline-variant/10">
          <h3 className="font-black text-sm text-on-surface">各科学习策略建议</h3>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {rec.subjectAdvice.map((advice, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-on-surface">{advice.subject}</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    advice.status === '强项'
                      ? "bg-primary-container/20 text-primary"
                      : advice.status === '薄弱'
                        ? "bg-danger-container text-danger"
                        : "bg-surface-container text-on-surface-variant"
                  )}>
                    {advice.status}
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-on-surface-variant/70 mb-2">{advice.strategy}</p>
              {advice.resources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {advice.resources.map((r, j) => (
                    <span key={j} className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-black">
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {advice.resources.length === 0 && hiddenRecommendationSections.includes('learning_resources') && (
                <p className="text-[10px] font-bold text-on-surface-variant/40">
                  学习资源推荐未开启
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============= 辅助函数 =============

  function getAgeFromGrade(grade: string): number {
    const map: Record<string, number> = {
      '幼儿园小班': 3, '幼儿园中班': 4, '幼儿园大班': 5,
      '一年级': 6, '二年级': 7, '三年级': 8,
      '四年级': 9, '五年级': 10, '六年级': 11,
      '初一': 12, '初二': 13, '初三': 14,
      '高一': 15, '高二': 16, '高三': 17,
    };
    return map[grade] || 6;
  }

  // ============= 主渲染 =============

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Header */}
      <div className="sticky top-[var(--app-sticky-top,0px)] z-10 bg-surface border-b border-outline-variant/10">
        <TopAppBar
          title={step <= 4 ? '智能日程推荐' : '推荐方案'}
          onBack={() => {
            if (step === 5 && recommendation) {
              setStep(3);
            } else if (step > 0 && step < 4) {
              setStep(step - 1);
            } else {
              navigate(-1);
            }
          }}
          rightContent={step < 4 ? (
            <div className="flex items-center gap-1 bg-surface-container-low rounded-full px-3 py-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i === step ? "bg-primary w-3" : i < step ? "bg-primary/50" : "bg-outline-variant/30"
                  )}
                />
              ))}
            </div>
          ) : undefined}
        />

        {/* 步骤指示器 */}
        {step < 4 && (
          <div className="flex items-center gap-2 px-4 pb-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all",
                  i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-outline-variant/10"
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-danger-container rounded-2xl p-4 mb-4 border border-danger/20 flex items-start gap-3"
            >
              <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-danger">生成失败</p>
                <p className="text-[11px] font-bold text-danger/70 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* 底部操作按钮（信息收集步骤） */}
        {step >= 0 && step < 4 && (
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else handleGenerate();
              }}
              disabled={!canProceed() || isGenerating}
              className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              {step < 3 ? (
                <>
                  {step === 0 ? '下一步：学业与时间' :
                   step === 1 ? '下一步：兴趣与特长' :
                   '下一步：性格与期望'}
                  <ChevronRight size={18} />
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  开始生成智能方案
                </>
              )}
            </button>

            {/* 如果已经有信息，跳过直接生成 */}
            {step < 3 && (
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-2xl text-on-surface-variant/60 font-black text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
              >
                已有足够信息，直接生成
                <Zap size={14} />
              </button>
            )}
          </div>
        )}

        {/* 结果页面操作按钮（已经在 renderResult 中渲染） */}
      </div>
    </div>
  );
}
