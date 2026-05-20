import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, ChevronRight, Clock, Sun, Moon, Globe, Users, Plus, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { PLAN_SCENES, EXCHANGE_TIMEZONES, type PlanSceneType, type DailyScheduleTemplate, adjustScheduleByTimezone, createEmptySchedule } from '../lib/planTemplates';
import { useFamily } from '../context/FamilyContext';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { getDataLayer } from '../lib/DataLayer';
import { getCommunityShareDraft } from '../lib/communityShare';
import { buildCommunityTemplateReusePreview, type CommunityTemplateReusePreview } from '../lib/communityTemplateReuse';
import { buildPlanExecutionTaskBundle, findPlanExecutionConflicts } from '../lib/planExecutionTasks';
import { useTranslation } from 'react-i18next';
import { localeText } from '../lib/localeText';

type WizardStep = 'scene' | 'info' | 'schedule' | 'activities' | 'confirm';

interface WizardForm {
  sceneId: string;
  scene: PlanSceneType;
  name: string;
  startDate: string;
  endDate: string;
  grade: string;
  timezone: { label: string; offset: number; emoji: string } | null;
  schedule: DailyScheduleTemplate;
  weeklyActivities: { day: string; activity: string; time: string }[];
  children: string[]; // 参与的成员
}

const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'];

const WIZARD_SCENE_EN: Record<string, { name: string; description: string }> = {
  'age-2-3-enlighten': { name: 'Toddler routine (2-3)', description: 'Build early rhythm around meals, naps, cleanup, and reading.' },
  'age-3-5-kindergarten': { name: 'Kindergarten routine (3-5)', description: 'Match kindergarten rhythm and support expression, rules, outdoor time, and bedtime.' },
  'age-5-6-school-ready': { name: 'School readiness (5-6)', description: 'Practice school-bag checks, class rules, and bedtime preparation.' },
  'age-6-8-study-start': { name: 'Early primary routine (6-8)', description: 'Protect motivation with immediate feedback and simple homework starts.' },
  'age-9-12-self-growth': { name: 'Independent growth (9-12)', description: 'Add review, weekly planning, movement, and mistake correction.' },
  'age-13-15-junior': { name: 'Middle school routine (13-15)', description: 'Balance independent planning, sleep boundaries, stress relief, and review.' },
  'weekday-default': { name: 'Weekday routine', description: 'Arrange school days, homework, meals, sleep, and parent support.' },
  'holiday-default': { name: 'Holiday / vacation plan', description: 'Blend rest, learning, sports, hobbies, and family trips.' },
  'exchange-default': { name: 'Exchange / study-abroad routine', description: 'Plan time zones, school rhythm, communication, and adaptation.' },
  'custom-default': { name: 'Custom plan', description: 'Start from your own family need and adjust step by step.' },
  toddler_daily: { name: 'Toddler routine (2-3)', description: 'Build early rhythm around meals, naps, cleanup, and reading.' },
  kindergarten_daily: { name: 'Kindergarten routine (3-5)', description: 'Match kindergarten rhythm and support expression, rules, outdoor time, and bedtime.' },
  preschool_transition: { name: 'School readiness (5-6)', description: 'Practice school-bag checks, class rules, and bedtime preparation.' },
  lower_primary_daily: { name: 'Early primary routine (6-8)', description: 'Protect motivation with immediate feedback and simple homework starts.' },
  upper_primary_daily: { name: 'Independent growth (9-12)', description: 'Add review, weekly planning, movement, and mistake correction.' },
  middle_school_daily: { name: 'Middle school routine (13-15)', description: 'Balance independent planning, sleep boundaries, stress relief, and review.' },
  summer_holiday: { name: 'Summer break plan', description: 'Blend rest, learning, sports, hobbies, and family trips.' },
  winter_holiday: { name: 'Winter break plan', description: 'Use a gentle rhythm for rest, review, celebrations, and family time.' },
  exchange_life: { name: 'Exchange / study-abroad routine', description: 'Plan time zones, school rhythm, communication, and adaptation.' },
};

function sceneName(sceneId: string, fallback: string, language?: string) {
  const english = WIZARD_SCENE_EN[sceneId]?.name || fallback;
  return localeText(language, {
    'zh-CN': fallback,
    'en-US': english,
    'ja-JP': english,
    'ko-KR': english,
    'es-ES': english,
    'fr-FR': english,
  });
}

function sceneDescription(sceneId: string, fallback: string, language?: string) {
  const english = WIZARD_SCENE_EN[sceneId]?.description || fallback;
  return localeText(language, {
    'zh-CN': fallback,
    'en-US': english,
    'ja-JP': english,
    'ko-KR': english,
    'es-ES': english,
    'fr-FR': english,
  });
}

function findScene(sceneIdOrType: string | null) {
  return PLAN_SCENES.find(scene => scene.id === sceneIdOrType)
    || PLAN_SCENES.find(scene => scene.type === sceneIdOrType)
    || PLAN_SCENES[0];
}

function getPlanTypeLabel(type: PlanSceneType, sceneNameValue?: string, language?: string, sceneId?: string) {
  if (type === 'weekday') {
    const fallback = sceneNameValue || '平日计划';
    return sceneId ? sceneName(sceneId, fallback, language) : wizardText(language, fallback, 'Weekday routine');
  }
  if (type === 'holiday') return wizardText(language, '假期计划', 'Holiday plan');
  if (type === 'exchange') return wizardText(language, '留学交换', 'Exchange routine');
  return wizardText(language, '自定义', 'Custom plan');
}

function wizardText(language: string | undefined, zh: string, en: string) {
  return localeText(language, {
    'zh-CN': zh,
    'en-US': en,
    'ja-JP': en,
    'ko-KR': en,
    'es-ES': en,
    'fr-FR': en,
  });
}

function wizardValue(language: string | undefined, value: string, map: Record<string, string>) {
  if ((language || '').startsWith('zh')) return value;
  return map[value] || value;
}

const DAY_EN: Record<string, string> = {
  '周一': 'Mon',
  '周二': 'Tue',
  '周三': 'Wed',
  '周四': 'Thu',
  '周五': 'Fri',
  '周六': 'Sat',
  '周日': 'Sun',
};

const GRADE_EN: Record<string, string> = {
  '一年级': 'Grade 1',
  '二年级': 'Grade 2',
  '三年级': 'Grade 3',
  '四年级': 'Grade 4',
  '五年级': 'Grade 5',
  '六年级': 'Grade 6',
  '初一': 'Grade 7',
  '初二': 'Grade 8',
  '初三': 'Grade 9',
};

const SLOT_LABEL_EN: Record<string, string> = {
  '晨间': 'Morning',
  '上午': 'Late morning',
  '午后': 'Afternoon',
  '放学后': 'After school',
  '晚间': 'Evening',
  '学习': 'Study',
  '运动': 'Exercise',
  '兴趣': 'Interest',
  '亲子': 'Family time',
  '自由活动': 'Free time',
  '休息': 'Rest',
  '起床': 'Wake up',
  '起床洗漱': 'Wake up and wash',
  '早餐时间': 'Breakfast',
  '上学': 'School commute',
  '上午课程': 'Morning classes',
  '午餐&午休': 'Lunch and rest',
  '下午课程': 'Afternoon classes',
  '放学回家': 'After-school commute',
  '休息&玩乐': 'Rest and play',
  '作业时间': 'Homework time',
  '晚餐时间': 'Dinner',
  '家庭时间': 'Family time',
  '洗漱准备': 'Wash-up routine',
  '睡前故事': 'Bedtime story',
  '晨间学习': 'Morning study',
  '午后学习': 'Afternoon study',
  '下午活动': 'Afternoon activity',
  '自由时间': 'Free time',
  '家庭活动': 'Family activity',
  '晚间阅读': 'Evening reading',
  '早餐': 'Breakfast',
  '课外活动': 'After-school activity',
  '回家&休息': 'Home and rest',
  '睡前学习': 'Bedtime study',
  '就寝': 'Bedtime',
  '晨间醒醒车': 'Morning wake-up',
  '早餐小火车': 'Breakfast train',
  '感统小冒险': 'Movement adventure',
  '玩具回巢': 'Toy cleanup',
  '绘本充电': 'Picture-book recharge',
  '午餐&午睡': 'Lunch and nap',
  '自由探索': 'Free exploration',
  '晚间收心': 'Evening wind-down',
  '入园装备台': 'Kindergarten gear check',
  '幼儿园主线': 'Kindergarten day',
  '放学情报站': 'After-school check-in',
  '户外能量包': 'Outdoor energy',
  '晚餐礼仪局': 'Dinner manners',
  '睡前小队': 'Bedtime team',
  '晨间启动': 'Morning launch',
  '小学主线': 'Primary school day',
  '回家回血': 'Home recharge',
  '作业开局': 'Homework start',
  '错题猎人': 'Mistake hunter',
  '晚餐&运动': 'Dinner and movement',
  '阅读岛': 'Reading island',
  '睡前装备台': 'Bedtime gear check',
  '学校主线': 'School day',
  '番茄钟副本': 'Focus timer block',
  '错因拆弹': 'Mistake review',
  '运动60分': '60-minute movement',
  '自由&复盘': 'Free time and review',
  '睡眠防线': 'Sleep boundary',
  '自主计划官': 'Self-planning check',
  '回血休整': 'Recharge break',
  '深度学习段': 'Deep study block',
  '错题二刷': 'Mistake retry',
  '压力卸载': 'Stress release',
};

const SLOT_DESCRIPTION_EN: Record<string, string> = {
  '穿衣、刷牙、洗脸': 'Get dressed, brush teeth, wash face',
  '营养早餐、晨间交流': 'Nutritious breakfast and morning chat',
  '出发去学校': 'Leave for school',
  '学校正常上课': 'Regular school classes',
  '学校午餐、课间休息': 'School lunch and break',
  '下午课程': 'Afternoon classes',
  '放学回家路上': 'Travel home after school',
  '自由活动、吃点心': 'Free play and snack',
  '完成学校作业': 'Finish school homework',
  '全家共进晚餐': 'Dinner with the family',
  '亲子活动、阅读': 'Family activity or reading',
  '洗澡、刷牙': 'Bath and tooth brushing',
  '阅读/听故事': 'Read or listen to a story',
  '悠闲早餐': 'Relaxed breakfast',
  '黄金学习时间': 'Best-focus learning time',
  '户外玩耍、兴趣活动': 'Outdoor play or hobby time',
  '午餐、午睡': 'Lunch and nap',
  '暑期作业/课外阅读': 'Holiday homework or reading',
  '体育运动/户外活动': 'Exercise or outdoor activity',
  '看动画片/玩游戏': 'Cartoons or games',
  '桌游/散步/聊天': 'Board games, walk, or chat',
  '自由阅读/听音频': 'Free reading or audio',
  '适应当地时间': 'Adapt to local time',
  '早餐并与家人视频': 'Breakfast and family video call',
  '当地学校上课': 'Local school classes',
  '社团/体育/兴趣班': 'Club, sports, or hobby class',
  '回家、吃点心': 'Return home and snack',
  '晚餐并与家人视频': 'Dinner and family video call',
  '自由活动': 'Free activity',
  '洗漱': 'Wash up',
  '中文学习/阅读': 'Chinese learning or reading',
  '准备睡觉': 'Get ready for sleep',
  '换衣、洗手、喝水': 'Change clothes, wash hands, drink water',
  '坐好吃早餐，练习自己拿勺': 'Sit for breakfast and practice using a spoon',
  '跑跳、爬行、户外晒太阳': 'Run, jump, climb, and get outdoor sunlight',
  '把玩具送回盒子': 'Put toys back into their box',
  '亲子阅读或听故事': 'Parent-child reading or stories',
  '午餐后进入午睡流程': 'Nap routine after lunch',
  '积木、涂鸦、角色扮演': 'Blocks, doodling, or pretend play',
  '洗澡、刷牙、睡前故事': 'Bath, tooth brushing, and bedtime story',
  '穿衣、洗漱、检查水杯和备用衣物': 'Dress, wash up, check water bottle and spare clothes',
  '入园、游戏、午休、集体活动': 'Arrival, play, nap, and group activities',
  '说一件今天开心或困难的事': 'Share one happy or difficult thing from today',
  '跑跳、拍球、平衡车或散步': 'Run, jump, ball play, balance bike, or walk',
  '餐桌坐好、尝试蔬菜、表达谢谢': 'Sit well, try vegetables, and say thanks',
  '收玩具、洗漱、阅读、关灯': 'Clean up toys, wash up, read, lights out',
  '洗漱、早餐、书包检查': 'Wash up, breakfast, school-bag check',
  '学校上课与课间活动': 'School classes and breaks',
  '吃点心、聊天、短休息': 'Snack, chat, and a short rest',
  '先做最容易启动的一项作业': 'Start with the easiest homework item',
  '订正一道错题或记录一个不会的问题': 'Correct one mistake or record one question',
  '晚餐后户外活动或跳绳': 'Outdoor play or jump rope after dinner',
  '亲子/独立阅读20-30分钟': 'Parent-child or independent reading for 20-30 minutes',
  '洗漱、整理书包、关灯': 'Wash up, pack school bag, lights out',
  '洗漱早餐、当天任务预览': 'Wash up, breakfast, and preview today’s tasks',
  '课堂学习、社交、体育活动': 'Classes, social time, and PE',
  '两个专注段完成作业或复习': 'Two focus blocks for homework or review',
  '拆一题错因或预习一个疑问': 'Analyze one mistake or preview one question',
  '球类、跑步、跳绳或骑行': 'Ball games, running, jump rope, or cycling',
  '自由活动后写一句复盘': 'Free time, then one-sentence reflection',
  '收手机、洗漱、阅读、关灯': 'Put away phone, wash up, read, lights out',
  '早餐前确认今日三件事': 'Confirm three things before breakfast',
  '课程、作业记录、体育活动': 'Classes, homework notes, and sports',
  '点心、放松、短运动': 'Snack, relax, and short movement',
  '按优先级完成作业/复习': 'Finish homework or review by priority',
  '重做错题或整理错因': 'Retry mistakes or organize causes',
  '运动、日记、沟通或拉伸': 'Exercise, journal, talk, or stretch',
  '收屏、洗漱、低刺激阅读': 'Screen off, wash up, low-stimulation reading',
};

const SUGGESTED_TASK_EN: Record<string, string> = {
  '小手洗洗勇者': 'Hand-washing hero',
  '玩具回巢员': 'Toy cleanup helper',
  '小牙刷骑士': 'Toothbrush knight',
  '晚安小火车': 'Goodnight train',
  '幼儿园情报员': 'Kindergarten reporter',
  '排队小卫士': 'Line-up helper',
  '情绪翻译官': 'Feeling translator',
  '餐桌礼仪官': 'Table-manners helper',
  '书包守门员': 'School-bag checker',
  '铅笔补给官': 'Pencil supply helper',
  '课堂举手新兵': 'Hand-raising rookie',
  '睡前装备台': 'Bedtime gear check',
  '勇气提问者': 'Brave question asker',
  '错题猎人': 'Mistake hunter',
  '作业开局王': 'Homework starter',
  '跳绳能量条': 'Jump-rope energy bar',
  '番茄钟守护者': 'Focus timer keeper',
  '错因拆弹员': 'Mistake-cause detective',
  '复盘侦探': 'Review detective',
  '周计划小队长': 'Weekly plan captain',
  '自主计划官': 'Self-planning officer',
  '睡眠防线': 'Sleep boundary',
  '错题二刷者': 'Mistake retry helper',
  '压力卸载员': 'Stress release helper',
  '完成学校作业': 'Finish school homework',
  '课外阅读30分钟': 'Read for 30 minutes',
  '练琴/练字': 'Practice instrument or handwriting',
  '整理书包': 'Pack school bag',
  '暑假作业/寒假作业': 'Holiday homework',
  '阅读打卡': 'Reading check-in',
  '体育运动': 'Physical activity',
  '家务劳动': 'Household chore',
  '当地学校课程': 'Local school classes',
  '中文学习/文化阅读': 'Chinese learning or culture reading',
  '与家人视频通话': 'Video call with family',
  '适应时差作息': 'Adjust to local time',
};

function getDefaultDateRange(type: PlanSceneType): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (type === 'holiday') {
    // 假设最近的一个假期
    const month = now.getMonth();
    if (month >= 1 && month <= 6) {
      return { start: fmt(now), end: fmt(new Date(now.getFullYear(), 8, 1)) }; // 到9月
    }
    return { start: fmt(now), end: fmt(new Date(now.getFullYear() + 1, 1, 15)) };
  }
  if (type === 'exchange') {
    return { start: fmt(now), end: fmt(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())) };
  }
  // 平日或自定义：默认一个月
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return { start: fmt(now), end: fmt(end) };
}

export function PlanWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const tr = (zh: string, en: string) => wizardText(i18n.language, zh, en);
  const displayGrade = (grade: string) => wizardValue(i18n.language, grade, GRADE_EN);
  const displayDay = (day: string) => wizardValue(i18n.language, day, DAY_EN);
  const displaySlotLabel = (label: string) => wizardValue(i18n.language, label, SLOT_LABEL_EN);
  const displaySlotDescription = (description: string) => wizardValue(i18n.language, description, SLOT_DESCRIPTION_EN);
  const displaySuggestedTask = (task: string) => wizardValue(i18n.language, task, SUGGESTED_TASK_EN);
  const { familyId, guestMode, members, currentUser, tasks } = useFamily();
  const [loading, setLoading] = useState(false);
  const [reusePreview, setReusePreview] = useState<CommunityTemplateReusePreview | null>(null);
  const [reuseSourceId, setReuseSourceId] = useState('');
  const [conflictsConfirmed, setConflictsConfirmed] = useState(false);
  const [showRecommendationPrompt, setShowRecommendationPrompt] = useState(
    searchParams.get('recommend') === 'travel'
  );

  const children = members.filter(m => m.role === 'child');
  const initialSceneTemplate = findScene(searchParams.get('scene'));
  const initialScene = initialSceneTemplate.type;
  const initialName = searchParams.get('name') || sceneName(initialSceneTemplate.id, initialSceneTemplate.name, i18n.language);
  const defaultRange = getDefaultDateRange(initialScene);
  const [step, setStep] = useState<WizardStep>(searchParams.has('scene') ? 'info' : 'scene');

  const [form, setForm] = useState<WizardForm>({
    sceneId: initialSceneTemplate.id,
    scene: initialScene,
    name: initialName,
    startDate: defaultRange.start,
    endDate: defaultRange.end,
    grade: '',
    timezone: initialScene === 'exchange' ? EXCHANGE_TIMEZONES[0] : null,
    schedule: initialSceneTemplate.weekdaySchedule,
    weeklyActivities: [],
    children: children.map(c => c.id),
  });

  useEffect(() => {
    let active = true;
    async function loadCommunityTemplate() {
      const payload = sessionStorage.getItem('pending_community_template_reuse_payload');
      if (payload) {
        try {
          const storedDraft = JSON.parse(payload);
          const preview = buildCommunityTemplateReusePreview(storedDraft);
          const range = getDefaultDateRange(preview.scene);
          const scene = findScene(preview.scene);
          if (!active) return;
          setReusePreview(preview);
          setReuseSourceId(storedDraft.id);
          setForm(prev => ({
            ...prev,
            sceneId: scene.id,
            scene: preview.scene,
            name: preview.title,
            schedule: preview.schedule,
            startDate: range.start,
            endDate: range.end,
          }));
          setStep('info');
        } catch {
          // Ignore malformed handoff payloads and fall back to id based loading.
        } finally {
          sessionStorage.removeItem('pending_community_template_reuse_payload');
        }
        return;
      }

      const draftId = searchParams.get('communityDraftId') || sessionStorage.getItem('pending_community_template_reuse');
      if (!draftId) return;
      const storedDraft = await getCommunityShareDraft(draftId);
      if (!active || !storedDraft) return;

      const preview = buildCommunityTemplateReusePreview(storedDraft);
      const range = getDefaultDateRange(preview.scene);
      const scene = findScene(preview.scene);
      setReusePreview(preview);
      setReuseSourceId(storedDraft.id);
      setForm(prev => ({
        ...prev,
        sceneId: scene.id,
        scene: preview.scene,
        name: preview.title,
        schedule: preview.schedule,
        startDate: range.start,
        endDate: range.end,
      }));
      setStep('info');
      sessionStorage.removeItem('pending_community_template_reuse');
    }
    loadCommunityTemplate();
    return () => { active = false; };
  }, [searchParams]);

  const updateForm = (partial: Partial<WizardForm>) => {
    setConflictsConfirmed(false);
    setForm(prev => ({ ...prev, ...partial }));
  };

  const openHolidayWebSearch = () => {
    const queryParts = [
      form.name || tr('寒暑假亲子行程', 'family vacation plan'),
      tr('亲子游', 'family trip'),
      form.grade || '',
      tr('科学馆 博物馆 营地', 'science museum camp'),
      tr('省心 安排', 'easy plan'),
    ].filter(Boolean);
    const query = queryParts.join(' ');
    window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const selectedScene = findScene(form.sceneId);

  const previewTaskBundle = useMemo(() => {
    if (!currentUser) return null;
    return buildPlanExecutionTaskBundle({
      planId: 'preview-plan',
      planName: form.name.trim() || tr('新计划', 'New plan'),
      planType: getPlanTypeLabel(form.scene, selectedScene?.name, i18n.language, selectedScene?.id),
      planKind: 'routine',
      creatorId: currentUser.id,
      familyId: familyId || undefined,
      childIds: form.children,
      schedule: form.schedule,
      sceneType: form.scene,
    });
  }, [currentUser, familyId, form.children, form.name, form.scene, form.schedule, i18n.language, selectedScene?.id, selectedScene?.name]);

  const executionConflicts = useMemo(() => {
    if (!previewTaskBundle) return [];
    return findPlanExecutionConflicts(previewTaskBundle.drafts, tasks);
  }, [previewTaskBundle, tasks]);

  const handleSelectScene = (sceneId: string) => {
    const scene = findScene(sceneId);
    const range = getDefaultDateRange(scene.type);
    updateForm({
      sceneId: scene.id,
      scene: scene.type,
      name: sceneName(scene.id, scene.name, i18n.language),
      schedule: scene.weekdaySchedule,
      startDate: range.start,
      endDate: range.end,
      timezone: scene.type === 'exchange' ? EXCHANGE_TIMEZONES[0] : null,
    });
    setStep('info');
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 'info': return form.name.trim().length > 0;
      case 'schedule': return true;
      case 'activities': return true;
      default: return true;
    }
  };

  const handleCreate = async () => {
    if (executionConflicts.length > 0 && !conflictsConfirmed) {
      setStep('confirm');
      return;
    }
    setLoading(true);
    const planName = form.name.trim();
    const planType = getPlanTypeLabel(form.scene, selectedScene?.name, i18n.language, selectedScene?.id);

    const metadata = {
      ...form.schedule,
      timezone: form.timezone,
      weeklyActivities: form.weeklyActivities,
      grade: form.grade,
      kind: 'routine',
      ...(reusePreview ? {
        source: 'community',
        communityTemplateId: reuseSourceId,
        communityTemplateSummary: reusePreview.sourceSummary,
        adaptationNotes: reusePreview.adaptationNotes,
      } : {}),
    };
    const scheduleData = JSON.stringify(metadata);

    if (guestMode) {
      const planId = `guest-${Date.now()}`;
      navigate(`/plans/${planId}?name=${encodeURIComponent(planName)}&type=${encodeURIComponent(planType)}&kind=routine&schedule=${encodeURIComponent(scheduleData)}&from=wizard&suggest=tasks`);
      return;
    }

    if (!familyId) {
      setLoading(false);
      return;
    }

    const data = await getDataLayer().addPlan({
      name: planName,
      type: planType,
      metadata,
      sortOrder: 0,
    });

    const taskBundle = currentUser ? buildPlanExecutionTaskBundle({
      planId: data.id,
      planName,
      planType,
      planKind: 'routine',
      creatorId: currentUser.id,
      familyId: familyId || undefined,
      childIds: form.children,
      schedule: form.schedule,
      sceneType: form.scene,
    }) : null;

    if (taskBundle && taskBundle.tasks.length > 0) {
      for (const task of taskBundle.tasks) {
        await getDataLayer().addTask(task);
      }
      await getDataLayer().updatePlan(data.id, {
        metadata: {
          ...metadata,
          executionTaskCount: taskBundle.tasks.length,
          executionTasksGeneratedAt: new Date().toISOString(),
        },
      });
    }

    navigate(`/plans/${data.id}?from=wizard-created${taskBundle?.tasks.length ? `&generatedTasks=${taskBundle.tasks.length}` : ''}`);
    setLoading(false);
  };

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: 'scene', label: localeText(i18n.language, { 'zh-CN': '场景', 'en-US': 'Scene', 'ja-JP': '場面', 'ko-KR': '상황', 'es-ES': 'Escena', 'fr-FR': 'Scène' }) },
      { key: 'info', label: localeText(i18n.language, { 'zh-CN': '基础信息', 'en-US': 'Info', 'ja-JP': '基本情報', 'ko-KR': '기본 정보', 'es-ES': 'Datos', 'fr-FR': 'Infos' }) },
      { key: 'schedule', label: localeText(i18n.language, { 'zh-CN': '日程', 'en-US': 'Schedule', 'ja-JP': '日程', 'ko-KR': '일정', 'es-ES': 'Agenda', 'fr-FR': 'Agenda' }) },
      { key: 'activities', label: localeText(i18n.language, { 'zh-CN': '活动', 'en-US': 'Activities', 'ja-JP': '活動', 'ko-KR': '활동', 'es-ES': 'Actividades', 'fr-FR': 'Activités' }) },
      { key: 'confirm', label: localeText(i18n.language, { 'zh-CN': '确认', 'en-US': 'Confirm', 'ja-JP': '確認', 'ko-KR': '확인', 'es-ES': 'Confirmar', 'fr-FR': 'Confirmer' }) },
    ];

    const currentIdx = steps.findIndex(s => s.key === step);
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-outline-variant/10">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
              i < currentIdx ? "bg-primary text-white" :
              i === currentIdx ? "bg-primary text-white scale-110" :
              "bg-surface-container-low text-on-surface-variant/40"
            )}>
              {i < currentIdx ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-bold hidden sm:inline",
              i === currentIdx ? "text-primary" : "text-on-surface-variant/40"
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-3 h-[1px] bg-outline-variant/20" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Header */}
      <TopAppBar
        title={localeText(i18n.language, { 'zh-CN': '智能创建计划', 'en-US': 'Create Plan', 'ja-JP': '計画を作成', 'ko-KR': '계획 만들기', 'es-ES': 'Crear plan', 'fr-FR': 'Créer un plan' })}
        onBack={() => {
          if (step !== 'scene') {
            setStep('scene');
          } else {
            navigate('/plans');
          }
        }}
      />
      {step !== 'scene' && renderStepIndicator()}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-4"
        >
          {/* Step 1: 选择场景 */}
          {step === 'scene' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-on-surface-variant/50 mb-1">
                {localeText(i18n.language, { 'zh-CN': '选择最适合你的计划类型', 'en-US': 'Choose the closest planning scene', 'ja-JP': '近い計画シーンを選んでください', 'ko-KR': '가장 가까운 계획 상황을 선택하세요', 'es-ES': 'Elige la escena de planificación más parecida', 'fr-FR': 'Choisissez le scénario le plus proche' })}
              </p>
              {PLAN_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSelectScene(scene.id)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container/30 flex items-center justify-center text-2xl">
                      {scene.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-base text-on-surface">{sceneName(scene.id, scene.name, i18n.language)}</h3>
                      <p className="text-xs font-bold text-on-surface-variant/50 mt-0.5">{sceneDescription(scene.id, scene.description, i18n.language)}</p>
                    </div>
                    <ChevronRight size={20} className="text-outline-variant/40" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 基础信息 */}
          {step === 'info' && (
            <div className="space-y-4">
              {form.scene === 'holiday' && showRecommendationPrompt && (
                <div className="bg-primary/5 rounded-2xl p-5 shadow-sm border border-primary/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-sm text-on-surface">{tr('需要我顺便推荐几种行程吗？', 'Would you like a few trip ideas too?')}</h3>
                      <p className="text-xs font-bold text-on-surface-variant/60 mt-1 leading-relaxed">
                        {tr('比如附近轻松玩、周边住一晚、科学馆探索、亲子营地。以后这里会优先接入适合你家孩子年龄和预算的精选资源；暂时没有合适资源时，也可以先搜全网灵感。', 'For example: easy nearby outings, one-night trips, science museums, or family camps. Later this can connect to selected resources that match your child’s age and budget; for now, it can also search the web for ideas.')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate('/plans/smart-recommend?source=holiday-plan')}
                      className="h-11 rounded-2xl bg-primary text-white text-sm font-black active:scale-[0.98] transition-all"
                    >
                      {tr('推荐几种看看', 'Show ideas')}
                    </button>
                    <button
                      onClick={openHolidayWebSearch}
                      className="h-11 rounded-2xl bg-white text-primary text-sm font-black border border-primary/20 active:scale-[0.98] transition-all"
                    >
                      {tr('全网搜灵感', 'Search web ideas')}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowRecommendationPrompt(false)}
                    className="h-10 w-full rounded-2xl bg-surface-container-low text-on-surface-variant text-sm font-black active:scale-[0.98] transition-all"
                  >
                    {tr('先不用，继续做计划', 'Not now, continue')}
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
                <h3 className="font-black text-sm text-on-surface">{tr('计划名称', 'Plan name')}</h3>
                {reusePreview && (
                  <div className="rounded-2xl bg-primary/5 p-3 border border-primary/10">
                    <p className="text-xs font-black text-primary">{tr('已带入社区模板', 'Community template loaded')}</p>
                    <p className="text-[10px] font-bold text-primary/70 mt-1 leading-relaxed">
                      {reusePreview.sourceSummary}. {tr('下面可以直接改名称、日期和参与成员。', 'You can edit the name, dates, and participants below.')}
                    </p>
                  </div>
                )}
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  placeholder={tr('例如：2026年暑假', 'Example: Summer 2026')}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
                />
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
                <h3 className="font-black text-sm text-on-surface">{tr('时间范围', 'Date range')}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">{tr('开始日期', 'Start date')}</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => updateForm({ startDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                    />
                  </div>
                  <span className="text-on-surface-variant/30 mt-5">→</span>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">{tr('结束日期', 'End date')}</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => updateForm({ endDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">{tr('年级', 'Grade')}</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map(g => (
                      <button
                        key={g}
                        onClick={() => updateForm({ grade: g })}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                          form.grade === g
                            ? "bg-primary border-primary text-white"
                            : "bg-white border-outline-variant/10 text-on-surface-variant/60"
                        )}
                      >
                        {displayGrade(g)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 交换留学的时区选择 */}
              {form.scene === 'exchange' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                  <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                    <Globe size={16} className="text-primary" />
                    {tr('留学目的地时区', 'Destination time zone')}
                  </h3>
                  <div className="space-y-2">
                    {EXCHANGE_TIMEZONES.map(tz => (
                      <button
                        key={tz.label}
                        onClick={() => {
                          updateForm({ timezone: tz });
                          // 根据时区调整日程
                          const adjusted = adjustScheduleByTimezone(form.schedule, tz.offset);
                          updateForm({ schedule: adjusted });
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-2xl transition-all font-bold text-sm flex items-center gap-3 border-2",
                          form.timezone?.label === tz.label
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-surface-container-low border-transparent text-on-surface-variant/60"
                        )}
                      >
                        <span className="text-lg">{tz.emoji}</span>
                        <div className="flex-1">
                          <span className="text-sm">{tz.label}</span>
                          <span className="text-[10px] text-on-surface-variant/40 block">
                            {tr('北京时间', 'Beijing time')} {tz.offset > 0 ? '+' : ''}{tz.offset}h
                          </span>
                        </div>
                        {form.timezone?.label === tz.label && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 参与的成员 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  {tr('参与成员', 'Participants')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {children.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        const newChildren = form.children.includes(c.id)
                          ? form.children.filter(id => id !== c.id)
                          : [...form.children, c.id];
                        updateForm({ children: newChildren });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                        form.children.includes(c.id)
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-outline-variant/10 text-on-surface-variant/60"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {reusePreview && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                  <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    {tr('复用前建议调整', 'Suggested edits before reuse')}
                  </h3>
                  <div className="space-y-2">
                    {reusePreview.adaptationNotes.map(note => (
                      <p key={note} className="rounded-2xl bg-surface-container-low px-3 py-2 text-[11px] font-bold text-on-surface-variant/65 leading-relaxed">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: 日程调整 */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-1">{tr('每日作息', 'Daily rhythm')}</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mb-4">
                  {form.scene === 'exchange' && form.timezone
                    ? tr(`已根据 ${form.timezone.label} 时区调整`, `Adjusted for ${form.timezone.label} time zone`)
                    : tr('你可以调整各个时段的时间', 'You can adjust each time block')}
                </p>

                {/* 起床 & 就寝 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-on-surface-variant/50">{tr('起床', 'Wake up')}</span>
                    </div>
                    <input
                      type="time"
                      value={form.schedule.wakeTime}
                      onChange={e => updateForm({ schedule: { ...form.schedule, wakeTime: e.target.value } })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white text-sm font-black text-on-surface outline-none"
                    />
                  </div>
                  <div className="flex-1 bg-indigo-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-on-surface-variant/50">{tr('就寝', 'Bedtime')}</span>
                    </div>
                    <input
                      type="time"
                      value={form.schedule.bedTime}
                      onChange={e => updateForm({ schedule: { ...form.schedule, bedTime: e.target.value } })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white text-sm font-black text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* 三餐时间 */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-on-surface-variant/50 block mb-2">{tr('用餐时间', 'Meal times')}</span>
                  <div className="flex items-center gap-2">
                    {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                      <div key={meal} className="flex-1">
                        <label className="block text-[10px] text-on-surface-variant/30 mb-1">
                          {meal === 'breakfast' ? tr('早餐', 'Breakfast') : meal === 'lunch' ? tr('午餐', 'Lunch') : tr('晚餐', 'Dinner')}
                        </label>
                        <input
                          type="time"
                          value={form.schedule.mealTimes[meal]}
                          onChange={e => updateForm({
                            schedule: {
                              ...form.schedule,
                              mealTimes: { ...form.schedule.mealTimes, [meal]: e.target.value }
                            }
                          })}
                          className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low text-xs font-bold text-on-surface outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 时段列表 */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-on-surface-variant/50 block mb-2">{tr('时段安排', 'Time blocks')}</span>
                  {form.schedule.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2.5">
                      <span className="text-lg w-8 text-center">{slot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-on-surface">{displaySlotLabel(slot.label)}</p>
                        <p className="text-[10px] text-on-surface-variant/40 truncate">{displaySlotDescription(slot.description)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={e => {
                            const newSlots = [...form.schedule.slots];
                            newSlots[idx] = { ...newSlots[idx], startTime: e.target.value };
                            updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                          }}
                          className="w-16 px-1 py-1 rounded text-[10px] font-bold bg-white outline-none text-center"
                        />
                        <span className="text-[10px] text-on-surface-variant/30">-</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={e => {
                            const newSlots = [...form.schedule.slots];
                            newSlots[idx] = { ...newSlots[idx], endTime: e.target.value };
                            updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                          }}
                          className="w-16 px-1 py-1 rounded text-[10px] font-bold bg-white outline-none text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 每周固定活动 */}
          {step === 'activities' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-1">{tr('每周固定活动', 'Weekly fixed activities')}</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mb-4">{tr('记录每周固定的课外活动安排', 'Record recurring weekly classes or activities')}</p>

                {form.weeklyActivities.length === 0 && (
                  <div className="text-center py-6">
                    <Plus size={32} className="mx-auto text-outline-variant/30 mb-2" />
                    <p className="text-xs font-bold text-on-surface-variant/40 mb-3">
                      {tr('后续可以在计划详情中添加，或现在添加', 'You can add them now or later in plan details')}
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {form.weeklyActivities.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2.5">
                      <button
                        onClick={() => updateForm({ weeklyActivities: form.weeklyActivities.filter((_, i) => i !== idx) })}
                        className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-red-400 shrink-0"
                      >
                        <span className="text-xs font-black">×</span>
                      </button>
                      <span className="text-xs font-bold text-on-surface-variant/60 w-12">{displayDay(act.day)}</span>
                      <span className="text-xs font-black text-on-surface flex-1">{act.activity}</span>
                      <span className="text-[10px] font-bold text-on-surface-variant/40">{act.time}</span>
                    </div>
                  ))}
                </div>

                {/* 添加活动 */}
                <ActivityAdder
                  language={i18n.language}
                  onAdd={(day, activity, time) => {
                    updateForm({ weeklyActivities: [...form.weeklyActivities, { day, activity, time }] });
                  }}
                />
              </div>

              {/* 场景默认任务建议 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3">{tr('建议任务', 'Suggested tasks')}</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedScene?.suggestedTasks?.map((task: string) => (
                    <span key={task} className="px-3 py-1.5 rounded-full bg-primary-container/30 text-primary text-xs font-bold">
                      {displaySuggestedTask(task)}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mt-3">
                  {tr('创建计划后可在详情中为每个建议任务添加具体目标', 'After creating the plan, you can add concrete goals to each suggested task.')}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: 确认页面 */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-5 text-white">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">{tr('即将创建', 'Ready to create')}</p>
                <h2 className="text-2xl font-black mt-1">{form.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {selectedScene?.emoji} {selectedScene ? sceneName(selectedScene.id, selectedScene.name, i18n.language) : ''}
                  </span>
                  {form.grade && (
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {displayGrade(form.grade)}
                    </span>
                  )}
                </div>
              </div>

              {/* 日程摘要 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  <Clock size={14} /> {tr('每日作息', 'Daily rhythm')}
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Sun size={12} className="text-amber-500" />
                    <span className="text-xs font-bold">{tr('起床', 'Wake up')} {form.schedule.wakeTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Moon size={12} className="text-indigo-500" />
                    <span className="text-xs font-bold">{tr('就寝', 'Bedtime')} {form.schedule.bedTime}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {form.schedule.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-center">{slot.icon}</span>
                      <span className="font-bold text-on-surface-variant/60">{slot.startTime}-{slot.endTime}</span>
                      <span className="text-on-surface-variant/40">{displaySlotLabel(slot.label)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={executionConflicts.length > 0
                ? 'bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-200'
                : 'bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10'}
              >
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  {executionConflicts.length > 0 ? <AlertTriangle size={15} className="text-amber-600" /> : <Check size={15} className="text-primary" />}
                  {tr('执行前检查', 'Pre-run check')}
                </h3>
                {executionConflicts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                      {tr(`发现 ${executionConflicts.length} 个可能冲突的时段。你可以返回调整时间，也可以确认后继续创建。`, `${executionConflicts.length} possible time conflicts found. You can go back to adjust, or confirm and create anyway.`)}
                    </p>
                    <div className="space-y-2">
                      {executionConflicts.slice(0, 4).map((conflict, index) => (
                        <div key={`${conflict.draftTitle}-${conflict.existingTitle}-${index}`} className="rounded-2xl bg-white/75 p-3">
                          <p className="text-xs font-black text-on-surface">{conflict.draftTitle}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                            {conflict.startTime}{conflict.endTime ? `-${conflict.endTime}` : ''} {tr(`可能和“${conflict.existingTitle}”重叠`, `may overlap with “${conflict.existingTitle}”`)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 active:scale-[0.99] transition-transform">
                      <input
                        type="checkbox"
                        checked={conflictsConfirmed}
                        onChange={(event) => setConflictsConfirmed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                      />
                      <span className="text-xs font-bold leading-relaxed text-on-surface-variant">
                        {tr('我已看到这些冲突，仍然先创建计划和任务，后续再手动调整。', 'I have seen these conflicts. Create the plan and tasks now, and I will adjust them later.')}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                    {tr(`暂未发现和当前家庭任务明显重叠的时段，创建后会自动生成 ${previewTaskBundle?.tasks.length || 0} 个执行任务。`, `No obvious overlap with current family tasks. After creation, ${previewTaskBundle?.tasks.length || 0} execution tasks will be generated.`)}
                  </p>
                )}
              </div>

              {/* 固定活动 */}
              {form.weeklyActivities.length > 0 && (
                <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                  <h3 className="font-black text-sm text-on-surface mb-3">{tr('每周固定活动', 'Weekly fixed activities')}</h3>
                  <div className="space-y-1">
                    {form.weeklyActivities.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-primary">{displayDay(act.day)}</span>
                        <span className="text-on-surface-variant/60">{act.time}</span>
                        <span className="text-on-surface">{act.activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 参与成员 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  <Users size={14} /> {tr('参与成员', 'Participants')}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {form.children.map(cId => {
                    const member = members.find(m => m.id === cId);
                    return member ? (
                      <span key={cId} className="px-2.5 py-1 rounded-full bg-primary-container/30 text-primary text-xs font-bold">
                        {member.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {reusePreview && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                  <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                    <Sparkles size={14} /> {tr('AI 适配提醒', 'AI adaptation notes')}
                  </h3>
                  <div className="space-y-2">
                    {reusePreview.adaptationNotes.slice(0, 4).map(note => (
                      <p key={note} className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-surface border-t border-outline-variant/10 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {step !== 'scene' && step !== 'confirm' && (
            <button
              onClick={() => {
                const steps: WizardStep[] = ['scene', 'info', 'schedule', 'activities', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
              }}
              className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface-variant font-black text-sm"
            >
              {tr('上一步', 'Back')}
            </button>
          )}
          {step !== 'confirm' ? (
            <button
              onClick={() => {
                if (step === 'scene') return;
                const steps: WizardStep[] = ['scene', 'info', 'schedule', 'activities', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx < steps.length - 1 && canGoNext()) {
                  setStep(steps[idx + 1]);
                }
              }}
              disabled={!canGoNext()}
              className={cn(
                "flex-1 py-3 rounded-2xl font-black text-sm transition-all",
                step === 'scene' ? "hidden" :
                "bg-primary text-white disabled:opacity-40"
              )}
            >
              {tr('下一步', 'Next')}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading || (executionConflicts.length > 0 && !conflictsConfirmed)}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles size={16} /> {tr('创建计划', 'Create plan')}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 底部安全区 */}
      <div className="h-24" />
    </div>
  );
}

// 活动添加组件
function ActivityAdder({ language, onAdd }: { language: string; onAdd: (day: string, activity: string, time: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState('周一');
  const [activity, setActivity] = useState('');
  const [time, setTime] = useState('16:00');
  const tr = (zh: string, en: string) => wizardText(language, zh, en);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-outline-variant/20 flex items-center justify-center gap-1 text-primary text-sm font-black"
      >
        <Plus size={16} strokeWidth={3} />
        {tr('添加固定活动', 'Add fixed activity')}
      </button>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={day}
          onChange={e => setDay(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        >
          {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{wizardValue(language, d, DAY_EN)}</option>)}
        </select>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        />
        <input
          autoFocus
          value={activity}
          onChange={e => setActivity(e.target.value)}
          placeholder={tr('活动名称', 'Activity name')}
          className="flex-1 px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (activity.trim()) { onAdd(day, activity.trim(), time); setActivity(''); setEditing(false); } }}
          disabled={!activity.trim()}
          className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs font-black disabled:opacity-40"
        >
          {tr('添加', 'Add')}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-black"
        >
          {tr('取消', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
