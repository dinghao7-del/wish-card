import React, { useState, useEffect, useRef } from 'react';
import { useFamily } from '../context/FamilyContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskStatus, Member, Task, Reward } from '../types';
import {
  ArrowRight, ArrowLeft, Sparkles, Users, Baby, School, Clock, 
  CheckCircle2, Plus, Minus, GraduationCap, Gamepad2, BookOpen, 
  Music, Palette, Dumbbell, X, Lightbulb, Target, Save, Home, Sun, CalendarRange, Mic, MicOff, Loader2
} from 'lucide-react';
import { showToastGlobal } from '../components/Toast';
import { callAIJson, SpeechRecognitionFailure, startListening } from '../lib/voiceAssistant';
import {
  buildFixedClassSetupSuggestions,
  buildOnboardingImportSummary,
  clearOnboardingProfileArchives,
  getOnboardingProfileArchives,
  saveOnboardingProfileArchive,
  suggestOnboardingTaskSchedule,
  type OnboardingProfileArchive,
} from '../lib/onboardingProfileArchive';
import type { DataPlan } from '../lib/DataLayer';
import { hashMemberCredential } from '../lib/memberCredentials';
import { getRewardStarPreset, normalizeTaskRewardStars } from '../lib/starEconomy';

// 家庭画像类型
interface FamilyProfile {
  hasChildren: boolean;
  childrenCount: number;
  children: Array<{
    name: string;
    birthday?: string;
    age: number;
    gender: 'boy' | 'girl';
    grade: string;
    avatar: string;
    schoolTime: { start: string; end: string };
    hasAfterSchool: boolean;
    /** 每周固定外部课外班，属于时间占用。 */
    afterSchoolActivities: string[];
    /** 自定义每周固定外部课外班。 */
    customActivities: string[];
    /** 日常在家练习或学习内容，属于可安排任务。 */
    dailyPractices: string[];
    /** 自定义日常练习内容。 */
    customPractices: string[];
  }>;
  careStructure: 'parents-together' | 'one-parent-main' | 'grandparents-help' | 'nanny-help' | 'rotating-care';
  priorities: string[];
  specialRequests: string;
  // 假期日程
  hasHolidaySchedule: boolean;
  holidayDaySchedule: { start: string; end: string }; // 假期作息时间
  holidayCustomActivities: string[];
}

// 推荐任务类型
interface RecommendedTask {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'habit';
  rewardStars: number;
  icon: string;
  category: string;
  assigneeRole: 'child' | 'parent';
  suggestedTime?: string;
  /** 指定给哪些孩子（空数组或 undefined 表示所有孩子） */
  assigneeChildNames?: string[];
}

// 步骤类型
type Step = 
  | 'welcome' 
  | 'family-type' 
  | 'children-count' 
  | 'child-details' 
  | 'daily-schedule' 
  | 'activities' 
  | 'holiday-schedule'
  | 'priorities' 
  | 'analyzing' 
  | 'recommendations'
  | 'preview'
  | 'success';

type AssistantMode = 'idle' | 'listening' | 'result' | 'text' | 'followup' | 'confirm' | 'processing';

const ONBOARDING_FLOW: Step[] = [
  'welcome',
  'family-type',
  'child-details',
  'daily-schedule',
  'activities',
  'holiday-schedule',
  'priorities',
  'recommendations',
  'preview',
  'success',
];

const PROGRESS_STEPS: Step[] = [
  'family-type',
  'child-details',
  'daily-schedule',
  'activities',
  'holiday-schedule',
  'priorities',
  'recommendations',
  'preview',
];

const CHILD_INDEXED_STEPS = new Set<Step>(['child-details', 'daily-schedule', 'activities']);

// 根据年龄自动推算年级
function getGradeFromAge(age: number): string {
  if (age <= 3) return '幼儿园小班';
  if (age === 4) return '幼儿园中班';
  if (age === 5) return '幼儿园大班';
  if (age === 6) return '小学一年级';
  if (age === 7) return '小学二年级';
  if (age === 8) return '小学三年级';
  if (age === 9) return '小学四年级';
  if (age === 10) return '小学五年级';
  if (age === 11) return '小学六年级';
  if (age === 12) return '初中一年级';
  if (age === 13) return '初中二年级';
  if (age === 14) return '初中三年级';
  if (age === 15) return '高中一年级';
  if (age === 16) return '高中二年级';
  if (age >= 17) return '高中三年级';
  return '小学二年级';
}

function getAgeFromBirthday(birthday: string): number | null {
  if (!birthday) return null;
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return Math.max(0, Math.min(18, age));
}

function getGradeCandidatesFromAge(age: number, currentGrade?: string): string[] {
  const primary = getGradeFromAge(age);
  const nearbyMap: Record<number, string[]> = {
    3: ['幼儿园小班', '托班/小小班'],
    4: ['幼儿园中班', '幼儿园小班'],
    5: ['幼儿园大班', '幼儿园中班'],
    6: ['小学一年级', '幼儿园大班'],
    7: ['小学二年级', '小学一年级'],
    8: ['小学三年级', '小学二年级'],
    9: ['小学四年级', '小学三年级'],
    10: ['小学五年级', '小学四年级'],
    11: ['小学六年级', '小学五年级'],
    12: ['初中一年级', '小学六年级'],
    13: ['初中二年级', '初中一年级'],
    14: ['初中三年级', '初中二年级'],
    15: ['高中一年级', '初中三年级'],
    16: ['高中二年级', '高中一年级'],
    17: ['高中三年级', '高中二年级'],
    18: ['高中三年级'],
  };
  return Array.from(new Set([...(nearbyMap[age] || [primary]), primary, currentGrade].filter(Boolean) as string[]));
}

function getStageLabel(age: number): string {
  if (age <= 5) return '幼儿园阶段';
  if (age <= 8) return '小学低年级';
  if (age <= 11) return '小学高年级';
  if (age <= 14) return '初中阶段';
  return '高中阶段';
}

function normalizeSpokenBirthday(text: string): string | null {
  const normalized = text.replace(/[，。,.]/g, ' ');
  const fullMatch = normalized.match(/(20\d{2}|19\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  if (fullMatch) {
    const [, year, month, day] = fullMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const slashMatch = normalized.match(/(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function parseChildCountFromSpeech(text: string): number | null {
  const digit = text.match(/(\d)\s*个?孩子/);
  if (digit) return Math.max(1, Math.min(4, Number(digit[1])));
  const cnMap: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4 };
  const cn = text.match(/([一两二三四])\s*个?孩子/);
  return cn ? cnMap[cn[1]] : null;
}

function parseAgeFromSpeech(text: string): number | null {
  const digit = text.match(/(\d{1,2})\s*岁/);
  if (digit) {
    const age = Number(digit[1]);
    return age >= 0 && age <= 18 ? age : null;
  }
  const cnMap: Record<string, number> = {
    一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
    十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18,
  };
  const cn = text.match(/(十八|十七|十六|十五|十四|十三|十二|十一|十|九|八|七|六|五|四|三|两|二|一)\s*岁/);
  return cn ? cnMap[cn[1]] : null;
}

function parseAgesFromSpeech(text: string): number[] {
  const ages: number[] = [];
  const digitMatches = text.matchAll(/(\d{1,2})\s*岁/g);
  for (const match of digitMatches) {
    const age = Number(match[1]);
    if (age >= 0 && age <= 18) ages.push(age);
  }
  const cnMap: Record<string, number> = {
    一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
    十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16, 十七: 17, 十八: 18,
  };
  const cnMatches = text.matchAll(/(十八|十七|十六|十五|十四|十三|十二|十一|十|九|八|七|六|五|四|三|两|二|一)\s*岁/g);
  for (const match of cnMatches) {
    const age = cnMap[match[1]];
    if (age && !ages.includes(age)) ages.push(age);
  }
  return ages;
}

function parseNameFromSpeech(text: string, fallback: string): string | null {
  const match = text.match(/(?:叫|名字是|小名是)\s*([\u4e00-\u9fa5A-Za-z0-9]{1,12})/);
  if (match) return match[1];
  const relationMatch = text.match(new RegExp(`${fallback}(?:叫|名字是|小名是)\\s*([\\u4e00-\\u9fa5A-Za-z0-9]{1,12})`));
  return relationMatch ? relationMatch[1] : null;
}

function splitSpokenItems(text: string): string[] {
  return text
    .replace(/(还有|以及|另外|和|、|，|。|,)/g, ' ')
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2 && item.length <= 12);
}

function inferCareStructureFromSpeech(text: string): FamilyProfile['careStructure'] | null {
  if (/老人|爷爷|奶奶|姥姥|姥爷|外公|外婆/.test(text)) return 'grandparents-help';
  if (/保姆|阿姨|育儿嫂|住家/.test(text)) return 'nanny-help';
  if (/轮流|轮换|不同人|今天.*明天/.test(text)) return 'rotating-care';
  if (/妈妈为主|爸爸为主|一位家长|主要.*妈妈|主要.*爸爸|我一个人|单独/.test(text)) return 'one-parent-main';
  if (/父母|爸爸妈妈|一起|共同|都参与|分担/.test(text)) return 'parents-together';
  return null;
}

function formatTime(hour: number, minute = 0, marker = '', role: 'start' | 'end' = 'start'): string {
  let normalizedHour = hour;
  if (/下午|晚上|傍晚/.test(marker) && normalizedHour < 12) normalizedHour += 12;
  if (role === 'end' && normalizedHour <= 8) normalizedHour += 12;
  normalizedHour = Math.max(0, Math.min(23, normalizedHour));
  const normalizedMinute = Math.max(0, Math.min(59, minute));
  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
}

function parseSpokenTimeRange(text: string): { start: string; end: string } | null {
  const compact = text.replace(/\s+/g, '');
  const rangeMatch = compact.match(/(早上|上午|中午|下午|晚上|傍晚)?(\d{1,2})(?:[:：点](\d{1,2})?)?(?:分|半)?(?:到|至|-|—|~)(早上|上午|中午|下午|晚上|傍晚)?(\d{1,2})(?:[:：点](\d{1,2})?)?(?:分|半)?/);
  if (!rangeMatch) return null;
  const [, startMarker = '', startHour, startMinute, endMarker = '', endHour, endMinute] = rangeMatch;
  const startMin = compact.includes(`${startHour}点半`) ? 30 : Number(startMinute || 0);
  const endMin = compact.includes(`${endHour}点半`) ? 30 : Number(endMinute || 0);
  return {
    start: formatTime(Number(startHour), startMin, startMarker, 'start'),
    end: formatTime(Number(endHour), endMin, endMarker, 'end'),
  };
}

function inferPriorityIdsFromSpeech(text: string): string[] {
  const matches: string[] = [];
  const keywordMap: Array<[string, RegExp]> = [
    ['study', /学习|作业|拖拉|专注|阅读|写字|识字|英语|数学/],
    ['health', /健康|运动|睡眠|早睡|起床|吃饭|跳绳|体能/],
    ['housework', /家务|整理|收纳|房间|洗碗|劳动/],
    ['social', /社交|朋友|沟通|表达|情绪|礼貌/],
    ['hobby', /兴趣|钢琴|小提琴|画画|绘画|唱歌|舞蹈|游泳|课外班/],
    ['responsibility', /责任|坚持|自律|主动|承诺|兑现/],
  ];
  keywordMap.forEach(([id, regex]) => {
    if (regex.test(text)) matches.push(id);
  });
  return matches;
}

// 完整头像库
const BOY_AVATARS = [
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-12.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-25.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-36.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-14.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-16.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-20.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-32.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-10.png',
  '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-11.png',
];

const GIRL_AVATARS = [
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-54.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-55.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-56.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-59.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-33.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-36.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-40.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-32-15.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-32-24.png',
  '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-40-54.png',
];

// 获取默认头像
function getDefaultAvatar(gender: 'boy' | 'girl', id: number): string {
  const list = gender === 'boy' ? BOY_AVATARS : GIRL_AVATARS;
  return list[id % list.length];
}

// 获取头像列表
function getAvatarList(gender: 'boy' | 'girl'): string[] {
  return gender === 'boy' ? BOY_AVATARS : GIRL_AVATARS;
}

export function OnboardingGuide() {
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const od = (zh: string, en: string) => (isZh ? zh : en);
  const navigate = useNavigate();
  const { members, tasks, currentUser, familyId, localImport } = useFamily();

  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [profile, setProfile] = useState<FamilyProfile>({
    hasChildren: true,
    childrenCount: 1,
    children: [{
      name: '大宝',
      birthday: '',
      age: 8,
      gender: 'boy',
      grade: '小学三年级',
      avatar: getDefaultAvatar('boy', 0),
      schoolTime: { start: '08:00', end: '16:00' },
      hasAfterSchool: false,
      afterSchoolActivities: [],
      customActivities: [],
      dailyPractices: [],
      customPractices: []
    }],
    careStructure: 'parents-together',
    priorities: [],
    specialRequests: '',
    hasHolidaySchedule: false,
    holidayDaySchedule: { start: '08:00', end: '17:00' },
    holidayCustomActivities: [],
  });
  const [currentChildIndex, setCurrentChildIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendedTask[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [customActivityInput, setCustomActivityInput] = useState('');
  const [customPracticeInput, setCustomPracticeInput] = useState('');
  const [retryingAI, setRetryingAI] = useState(false);
  const [isVoiceGuiding, setIsVoiceGuiding] = useState(false);
  const [voiceGuideText, setVoiceGuideText] = useState('');
  const [dialogueAnswer, setDialogueAnswer] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('idle');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantConfirmation, setAssistantConfirmation] = useState<{ command: string; summary: string; wantsNext: boolean } | null>(null);
  const [assistantReviewSeq, setAssistantReviewSeq] = useState(0);
  const [assistantShouldPromptAfterStepChange, setAssistantShouldPromptAfterStepChange] = useState(false);
  const pendingGuideActionRef = useRef<{ command: string; wantsNext: boolean } | null>(null);
  // AI 分析状态：waiting=等待响应 | timeout=超时回退中 | done=完成 | local-fallback=已用本地规则
  const [aiStatus, setAiStatus] = useState<'idle' | 'waiting' | 'timeout' | 'done' | 'local-fallback'>('idle');
  const [aiElapsedSec, setAiElapsedSec] = useState(0);
  // 头像选择器状态
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const SAVE_KEY = 'wishcard_onboarding_profile';

  // 保存的分析记录
  const [savedData, setSavedData] = useState<{
    profile: FamilyProfile;
    recommendations: RecommendedTask[];
    selectedIds: string[];
    savedAt: string;
  } | null>(null);
  const [profileArchives, setProfileArchives] = useState<Array<OnboardingProfileArchive<FamilyProfile, RecommendedTask>>>([]);

  // 加载保存的配置（不自动恢复，只记录）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.profile) {
          setSavedData({
            ...data,
            profile: normalizeProfile(data.profile),
          });
        }
      }
    } catch (e) {
      // 忽略加载错误
    }
    getOnboardingProfileArchives<FamilyProfile, RecommendedTask>()
      .then(setProfileArchives)
      .catch(() => setProfileArchives([]));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep, currentChildIndex]);

  // 恢复已保存的分析记录，进入编辑状态
  const restoreSavedData = (step?: Step) => {
    if (!savedData) return;
    const restoredProfile = normalizeProfile(savedData.profile);
    setProfile(restoredProfile);
    if (savedData.recommendations?.length > 0) {
      setRecommendations(savedData.recommendations);
      setSelectedRecommendations(new Set(savedData.selectedIds || []));
    }
    setCurrentStep(step || 'family-type');
  };

  const restoreArchive = (archive: OnboardingProfileArchive<FamilyProfile, RecommendedTask>, step?: Step) => {
    const restoredProfile = normalizeProfile(archive.profile);
    setProfile(restoredProfile);
    setRecommendations(archive.recommendations || []);
    setSelectedRecommendations(new Set(archive.selectedIds || []));
    setSavedData({
      profile: restoredProfile,
      recommendations: archive.recommendations || [],
      selectedIds: archive.selectedIds || [],
      savedAt: archive.savedAt,
    });
    setCurrentStep(step || 'family-type');
  };

  // 直接重新分析（跳过编辑步骤）
  const restoreAndAnalyze = () => {
    if (!savedData) return;
    const restoredProfile = normalizeProfile(savedData.profile);
    setProfile(restoredProfile);
    setCurrentStep('analyzing');
    generateAIRecommendations(restoredProfile);
  };

  // 清除保存的记录，重新开始
  const clearSavedData = () => {
    localStorage.removeItem(SAVE_KEY);
    clearOnboardingProfileArchives().catch(() => undefined);
    setSavedData(null);
    setProfileArchives([]);
    showToastGlobal('已清除保存的记录', 'info');
  };

  // 保存配置到 localStorage
  const saveProfileToLocal = async () => {
    try {
      const data = {
        profile: normalizeProfile(profile),
        recommendations,
        selectedIds: Array.from(selectedRecommendations),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      setSavedData(data);
      const archives = await saveOnboardingProfileArchive<FamilyProfile, RecommendedTask>(data);
      setProfileArchives(archives);
      showToastGlobal('建档存档已保存，下次可继续微调', 'success');
    } catch (e) {
      showToastGlobal('保存失败，请重试', 'error');
    }
  };

  const getDefaultChildName = (index: number) => ['大宝', '二宝', '三宝', '四宝'][index] || `孩子${index + 1}`;

  // 课外活动选项 - 根据年龄阶段和性别收窄推荐
  const getActivityOptions = (child: FamilyProfile['children'][0] | 'boy' | 'girl') => {
    const gender = typeof child === 'string' ? child : child.gender;
    const age = typeof child === 'string' ? 8 : child.age;
    const common = [
      { id: '游泳', label: '游泳', icon: Dumbbell, category: 'sports' },
      { id: '跳绳', label: '跳绳', icon: Dumbbell, category: 'sports' },
      { id: '羽毛球', label: '羽毛球', icon: Dumbbell, category: 'sports' },
      { id: '钢琴', label: '钢琴', icon: Music, category: 'arts' },
      { id: '小提琴', label: '小提琴', icon: Music, category: 'arts' },
      { id: '声乐/唱歌', label: '声乐/唱歌', icon: Music, category: 'arts' },
      { id: '绘画', label: '绘画', icon: Palette, category: 'arts' },
      { id: '英语', label: '英语', icon: BookOpen, category: 'language' },
      { id: '阅读', label: '阅读', icon: BookOpen, category: 'language' },
    ];
    const preschool = [
      { id: '体适能', label: '体适能', icon: Dumbbell, category: 'sports' },
      { id: '亲子阅读', label: '亲子阅读', icon: BookOpen, category: 'language' },
      { id: '乐高启蒙', label: '乐高启蒙', icon: Gamepad2, category: 'stem' },
    ];
    const primary = [
      { id: '足球', label: '足球', icon: Dumbbell, category: 'sports' },
      { id: '篮球', label: '篮球', icon: Dumbbell, category: 'sports' },
      { id: '书法', label: '书法', icon: Palette, category: 'arts' },
      { id: '围棋', label: '围棋', icon: Gamepad2, category: 'stem' },
      { id: '科学实验', label: '科学实验', icon: Gamepad2, category: 'stem' },
    ];
    const teen = [
      { id: '跑步', label: '跑步', icon: Dumbbell, category: 'sports' },
      { id: '体能训练', label: '体能训练', icon: Dumbbell, category: 'sports' },
      { id: '编程', label: '编程', icon: Gamepad2, category: 'stem' },
      { id: '辩论/演讲', label: '辩论/演讲', icon: BookOpen, category: 'language' },
    ];
    const boyExtra = [
      { id: '武术', label: '武术', icon: Dumbbell, category: 'sports' },
      { id: '乐高', label: '乐高', icon: Gamepad2, category: 'stem' },
    ];
    const girlExtra = [
      { id: '体操', label: '体操', icon: Dumbbell, category: 'sports' },
      { id: '主持', label: '主持', icon: Music, category: 'arts' },
    ];
    const stageOptions = age <= 5 ? preschool : age <= 12 ? primary : teen;
    return [...common, ...stageOptions, ...(gender === 'boy' ? boyExtra : girlExtra)];
  };

  const dailyPracticeOptions = [
    { id: '跳绳', label: '跳绳' },
    { id: '练琴', label: '练琴' },
    { id: '绘画练习', label: '绘画' },
    { id: '英语听读', label: '英语' },
    { id: '识字', label: '识字' },
    { id: '阅读', label: '阅读' },
    { id: '口算', label: '口算' },
    { id: '练字', label: '练字' },
    { id: '背单词', label: '背单词' },
    { id: '运动打卡', label: '运动' },
  ];

  const getDailyPracticeOptions = (child: FamilyProfile['children'][0]) => {
    const preschool = [
      { id: '亲子阅读', label: '亲子阅读' },
      { id: '识字', label: '识字' },
      { id: '生活自理', label: '生活自理' },
      { id: '表达练习', label: '表达' },
    ];
    const primary = dailyPracticeOptions;
    const teen = [
      { id: '错题整理', label: '错题' },
      { id: '英语听读', label: '英语' },
      { id: '背单词', label: '背单词' },
      { id: '阅读', label: '阅读' },
      { id: '运动打卡', label: '运动' },
      { id: '自主计划', label: '自主计划' },
    ];
    return child.age <= 5 ? preschool : child.age <= 12 ? primary : teen;
  };
  
  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'sports': return Dumbbell;
      case 'arts': return Palette;
      case 'stem': return Gamepad2;
      case 'language': return BookOpen;
      default: return Sparkles;
    }
  };

  // 优先级选项
  const priorityOptions = [
    { id: 'study', label: t('onboarding.priority.study', { defaultValue: od('学习习惯', 'Study habits') }), emoji: '📚' },
    { id: 'health', label: t('onboarding.priority.health', { defaultValue: od('健康生活', 'Healthy routines') }), emoji: '💪' },
    { id: 'housework', label: t('onboarding.priority.housework', { defaultValue: od('家务劳动', 'Housework') }), emoji: '🧹' },
    { id: 'social', label: t('onboarding.priority.social', { defaultValue: od('社交能力', 'Social skills') }), emoji: '🤝' },
    { id: 'hobby', label: t('onboarding.priority.hobby', { defaultValue: od('兴趣培养', 'Interests') }), emoji: '🎨' },
    { id: 'responsibility', label: t('onboarding.priority.responsibility', { defaultValue: od('责任心', 'Responsibility') }), emoji: '⭐' },
  ];

  const careStructureOptions = [
    {
      id: 'parents-together',
      label: t('onboarding.care.parents_together', { defaultValue: od('父母共同安排', 'Both parents share care') }),
      desc: t('onboarding.care.parents_together_desc', { defaultValue: od('接送、陪作业、睡前流程可由父母共同分担', 'Pickup, homework, and bedtime can be shared by both parents.') }),
      scheduleHint: t('onboarding.care.parents_together_hint', { defaultValue: od('适合把任务拆给父母双方，周末兑现和复盘也可共同参与。', 'Good for splitting tasks between parents and sharing weekend promises and reviews.') }),
    },
    {
      id: 'one-parent-main',
      label: t('onboarding.care.one_parent', { defaultValue: od('一位家长为主', 'One parent leads') }),
      desc: t('onboarding.care.one_parent_desc', { defaultValue: od('日常主要由一位家长统筹', 'Daily routines are mostly coordinated by one parent.') }),
      scheduleHint: t('onboarding.care.one_parent_hint', { defaultValue: od('建议减少晚间高密度安排，把关键任务压缩到少数固定时段。', 'Reduce dense evening schedules and keep key tasks in a few stable time slots.') }),
    },
    {
      id: 'grandparents-help',
      label: t('onboarding.care.grandparents', { defaultValue: od('老人一起帮忙', 'Grandparents help') }),
      desc: t('onboarding.care.grandparents_desc', { defaultValue: od('接送、吃饭或白天照看有老人参与', 'Grandparents help with pickup, meals, or daytime care.') }),
      scheduleHint: t('onboarding.care.grandparents_hint', { defaultValue: od('适合把安全、接送、饮食提醒写清楚，学习反馈留给父母确认。', 'Make safety, pickup, and meal reminders clear; leave learning feedback for parents to confirm.') }),
    },
    {
      id: 'nanny-help',
      label: t('onboarding.care.nanny', { defaultValue: od('有阿姨/保姆协助', 'Nanny or helper assists') }),
      desc: t('onboarding.care.nanny_desc', { defaultValue: od('生活照料有人协助，家长重点把控学习和亲子沟通', 'Daily care has help, while parents focus on learning and parent-child communication.') }),
      scheduleHint: t('onboarding.care.nanny_hint', { defaultValue: od('生活类任务可安排给协助者提醒，奖励确认和心愿兑现仍由家长负责。', 'Care tasks can be reminders for the helper, while rewards and wishes stay with parents.') }),
    },
    {
      id: 'rotating-care',
      label: t('onboarding.care.rotating', { defaultValue: od('多人轮流照看', 'Adults rotate care') }),
      desc: t('onboarding.care.rotating_desc', { defaultValue: od('不同日期由不同成人负责', 'Different adults are responsible on different days.') }),
      scheduleHint: t('onboarding.care.rotating_hint', { defaultValue: od('建议生成更清晰的交接提醒，避免任务和接送责任漏掉。', 'Use clearer handoff reminders so tasks and pickup responsibilities are not missed.') }),
    },
  ] as const;

  const getCareStructureOption = (careStructure: FamilyProfile['careStructure']) => (
    careStructureOptions.find(option => option.id === careStructure) || careStructureOptions[0]
  );

  const normalizeProfile = (rawProfile: Partial<FamilyProfile>): FamilyProfile => {
    const fallbackProfile = profile;
    const children = (rawProfile.children?.length ? rawProfile.children : fallbackProfile.children).map((child, index) => ({
      name: child.name || getDefaultChildName(index),
      birthday: child.birthday || '',
      age: child.age || 8,
      gender: child.gender || 'boy',
      grade: child.grade || getGradeFromAge(child.age || 8),
      avatar: child.avatar || getDefaultAvatar(child.gender || 'boy', child.age || 8),
      schoolTime: child.schoolTime || { start: '08:00', end: '16:00' },
      hasAfterSchool: !!child.hasAfterSchool,
      afterSchoolActivities: child.afterSchoolActivities || [],
      customActivities: child.customActivities || [],
      dailyPractices: child.dailyPractices || [],
      customPractices: child.customPractices || [],
    }));

    return {
      hasChildren: rawProfile.hasChildren ?? true,
      childrenCount: children.length,
      children,
      careStructure: rawProfile.careStructure || 'parents-together',
      priorities: rawProfile.priorities || [],
      specialRequests: rawProfile.specialRequests || '',
      hasHolidaySchedule: !!rawProfile.hasHolidaySchedule,
      holidayDaySchedule: rawProfile.holidayDaySchedule || { start: '08:00', end: '17:00' },
      holidayCustomActivities: rawProfile.holidayCustomActivities || [],
    };
  };

  // 下一步
  const handleNext = () => {
    if (CHILD_INDEXED_STEPS.has(currentStep) && currentChildIndex < profile.children.length - 1) {
      setCurrentChildIndex(index => index + 1);
      return;
    }
    if (CHILD_INDEXED_STEPS.has(currentStep)) {
      setCurrentChildIndex(0);
    }

    const currentIndex = ONBOARDING_FLOW.indexOf(currentStep);
    if (currentIndex < ONBOARDING_FLOW.length - 1) {
      const nextStep = ONBOARDING_FLOW[currentIndex + 1];
      if (nextStep === 'recommendations') {
        setCurrentStep('analyzing');
        generateAIRecommendations();
        return;
      }
      setCurrentStep(nextStep);
    }
  };

  // 上一步
  const handleBack = () => {
    if (CHILD_INDEXED_STEPS.has(currentStep) && currentChildIndex > 0) {
      setCurrentChildIndex(index => index - 1);
      return;
    }

    const currentIndex = ONBOARDING_FLOW.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = ONBOARDING_FLOW[currentIndex - 1];
      if (CHILD_INDEXED_STEPS.has(prevStep)) {
        setCurrentChildIndex(Math.max(0, profile.children.length - 1));
      }
      setCurrentStep(prevStep);
    }
  };

  // 更新孩子信息
  const updateChild = (index: number, updates: Partial<FamilyProfile['children'][0]>) => {
    setProfile(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, ...updates } : child
      )
    }));
  };

  const applyVoiceGuideText = (text: string) => {
    const spoken = text.trim();
    if (!spoken) return;
    let applied = false;
    const appendSpecialRequest = (note: string) => {
      setProfile(prev => ({
        ...prev,
        specialRequests: [prev.specialRequests, note].filter(Boolean).join('\n'),
      }));
    };

    if (currentStep === 'family-type') {
      const count = parseChildCountFromSpeech(spoken);
      const ages = parseAgesFromSpeech(spoken);
      if (count) {
        setProfile(prev => {
          const children = prev.children.slice(0, count);
          while (children.length < count) {
            const index = children.length;
            const inferredAge = ages[index] || 8;
            const gender = index % 2 === 0 ? 'boy' : 'girl';
            children.push({
              name: getDefaultChildName(index),
              birthday: '',
              age: inferredAge,
              gender,
              avatar: getAvatarList(gender)[0],
              grade: getGradeFromAge(inferredAge),
              schoolTime: { start: '08:00', end: '16:00' },
              hasAfterSchool: false,
              afterSchoolActivities: [],
              customActivities: [],
              dailyPractices: [],
              customPractices: [],
            });
          }
          const nextChildren = children.map((child, index) => {
            const inferredAge = ages[index];
            if (!inferredAge) return child;
            return {
              ...child,
              age: inferredAge,
              grade: getGradeFromAge(inferredAge),
              avatar: getDefaultAvatar(child.gender, inferredAge),
            };
          });
          return { ...prev, hasChildren: true, childrenCount: count, children: nextChildren };
        });
        applied = true;
      }

      const relationLabels = ['大宝', '二宝', '三宝', '四宝'];
      relationLabels.forEach((label, index) => {
        if (!spoken.includes(label)) return;
        const segment = spoken.split(label)[1]?.split(/大宝|二宝|三宝|四宝/)[0] || '';
        const name = parseNameFromSpeech(segment, label);
        const birthday = normalizeSpokenBirthday(segment);
        if (name || birthday) {
          const updates: Partial<FamilyProfile['children'][0]> = {};
          if (name) updates.name = name;
          if (birthday) {
            const age = getAgeFromBirthday(birthday);
            updates.birthday = birthday;
            if (age !== null) {
              updates.age = age;
              updates.grade = getGradeFromAge(age);
            }
          }
          setProfile(prev => ({
            ...prev,
            children: prev.children.map((child, childIndex) => childIndex === index ? { ...child, ...updates } : child),
          }));
          applied = true;
        }
      });

      const careStructure = inferCareStructureFromSpeech(spoken);
      if (careStructure) {
        setProfile(prev => ({ ...prev, careStructure }));
        applied = true;
      }
    }

    if (currentStep === 'child-details') {
      const child = profile.children[currentChildIndex];
      const name = parseNameFromSpeech(spoken, child.name || getDefaultChildName(currentChildIndex));
      const birthday = normalizeSpokenBirthday(spoken);
      const ageOnly = parseAgeFromSpeech(spoken);
      const gender = /女孩|女儿|妹妹|姐姐/.test(spoken) ? 'girl' : /男孩|儿子|哥哥|弟弟/.test(spoken) ? 'boy' : undefined;
      const updates: Partial<FamilyProfile['children'][0]> = {};
      if (name) updates.name = name;
      if (gender) updates.gender = gender;
      if (birthday) {
        const age = getAgeFromBirthday(birthday);
        updates.birthday = birthday;
        if (age !== null) {
          updates.age = age;
          updates.grade = getGradeFromAge(age);
          updates.avatar = getDefaultAvatar(gender || child.gender, age);
        }
      } else if (ageOnly !== null) {
        updates.age = ageOnly;
        updates.grade = getGradeFromAge(ageOnly);
        updates.avatar = getDefaultAvatar(gender || child.gender, ageOnly);
      }
      if (Object.keys(updates).length > 0) {
        updateChild(currentChildIndex, updates);
        applied = true;
      }
    }

    if (currentStep === 'daily-schedule') {
      const child = profile.children[currentChildIndex];
      const timeRange = parseSpokenTimeRange(spoken);
      const hasAfterSchool = /托管|课后班|晚托|延时|课外班|培训班/.test(spoken)
        ? true
        : /没有|不用|不参加|不托管/.test(spoken)
          ? false
          : undefined;
      const updates: Partial<FamilyProfile['children'][0]> = {};
      if (timeRange) updates.schoolTime = timeRange;
      if (hasAfterSchool !== undefined) updates.hasAfterSchool = hasAfterSchool;
      if (Object.keys(updates).length > 0) {
        updateChild(currentChildIndex, { ...child, ...updates });
        applied = true;
      }
    }

    if (currentStep === 'activities') {
      const child = profile.children[currentChildIndex];
      const knownClasses = getActivityOptions(child).map(item => item.id);
      const knownPractices = getDailyPracticeOptions(child).map(item => item.id);
      const items = splitSpokenItems(spoken);
      const classItems = items.filter(item => /课|班|训练|社团|钢琴|小提琴|唱歌|声乐|游泳|篮球|足球|英语|编程|绘画|书法|舞蹈/.test(item));
      const practiceItems = items.filter(item => /练|每天|打卡|阅读|跳绳|识字|背|口算|错题|奥数|唱歌/.test(item));
      const nextClasses = Array.from(new Set([
        ...child.afterSchoolActivities,
        ...classItems.filter(item => knownClasses.includes(item)),
      ]));
      const nextCustomClasses = Array.from(new Set([
        ...child.customActivities,
        ...classItems.filter(item => !knownClasses.includes(item)),
      ]));
      const nextPractices = Array.from(new Set([
        ...(child.dailyPractices || []),
        ...practiceItems.filter(item => knownPractices.includes(item)),
      ]));
      const nextCustomPractices = Array.from(new Set([
        ...(child.customPractices || []),
        ...practiceItems.filter(item => !knownPractices.includes(item)),
      ]));
      updateChild(currentChildIndex, {
        hasAfterSchool: nextClasses.length + nextCustomClasses.length > 0 || child.hasAfterSchool,
        afterSchoolActivities: nextClasses,
        customActivities: nextCustomClasses,
        dailyPractices: nextPractices,
        customPractices: nextCustomPractices,
      });
      applied = classItems.length + practiceItems.length > 0;
    }

    if (currentStep === 'holiday-schedule') {
      const hasHolidaySchedule = /寒假|暑假|假期|旅行|夏令营|冬令营|回老家|出去玩|培训|集训/.test(spoken)
        ? true
        : /没有|不需要|和平时一样|照常/.test(spoken)
          ? false
          : undefined;
      if (hasHolidaySchedule !== undefined) {
        setProfile(prev => ({ ...prev, hasHolidaySchedule }));
      }
      appendSpecialRequest(spoken);
      applied = true;
    }

    if (currentStep === 'priorities') {
      const priorityIds = inferPriorityIdsFromSpeech(spoken);
      if (priorityIds.length > 0) {
        setProfile(prev => ({
          ...prev,
          priorities: Array.from(new Set([...prev.priorities, ...priorityIds])),
        }));
      }
      appendSpecialRequest(spoken);
      applied = true;
    }

    if (!applied) {
      appendSpecialRequest(`语音补充：${spoken}`);
    }
    showToastGlobal(applied ? '已根据语音更新当前建档信息' : '已保存为语音补充说明', 'success');
  };

  const handleVoiceGuide = async () => {
    if (isVoiceGuiding) return;
    try {
      setIsGuideOpen(true);
      setAssistantMode('listening');
      setDialogueAnswer('');
      setVoiceGuideText('');
      setAssistantPrompt('');
      setAssistantConfirmation(null);
      setIsVoiceGuiding(true);
      const transcript = await startListening();
      setVoiceGuideText(transcript || '');
      if (transcript) {
        setDialogueAnswer(transcript);
        setAssistantMode('processing');
        window.setTimeout(() => executeAssistantCommand(transcript), 80);
      } else {
        setAssistantMode('text');
        showToastGlobal('没有听清，可以再说一次或手动填写', 'info');
      }
    } catch (error: any) {
      setAssistantMode('text');
      if (error instanceof SpeechRecognitionFailure) {
        showToastGlobal(error.message, error.reason === 'permission-denied' ? 'warning' : 'info');
      } else {
        showToastGlobal('语音输入暂时不可用，可以先用文字补充。', 'info');
      }
    } finally {
      setIsVoiceGuiding(false);
    }
  };

  const openVoiceAssistant = () => {
    setIsGuideOpen(true);
    handleVoiceGuide();
  };

  const closeVoiceAssistant = () => {
    setIsGuideOpen(false);
    setAssistantMode('idle');
    setAssistantPrompt('');
    setAssistantConfirmation(null);
    pendingGuideActionRef.current = null;
  };

  const getGuidedQuestion = () => {
    const child = profile.children[currentChildIndex] || profile.children[0];
    const childLabel = child?.name || getDefaultChildName(currentChildIndex);
    const childStepSuffix = profile.children.length > 1 ? `（${currentChildIndex + 1}/${profile.children.length}）` : '';
    switch (currentStep) {
      case 'family-type':
        return {
          title: 'AI 先问一个总问题',
          question: '家里有几个孩子，平时主要谁负责接送、陪作业和睡前流程？',
          effect: '会决定创建几个孩子档案，以及家长提醒、任务分配和兑现提醒怎么安排。',
          placeholder: '例如：我有两个孩子，爸爸妈妈共同安排，姥姥偶尔帮接送。',
          examples: ['两个孩子，父母共同安排', '一个孩子，妈妈为主', '两个孩子，老人一起帮忙'],
        };
      case 'child-details':
        return {
          title: `了解${childLabel}${childStepSuffix}`,
          question: `请告诉我${childLabel}叫什么、生日或年龄、男孩还是女孩。`,
          effect: '会自动推断年龄和学段，后面的兴趣选项、任务难度和日程建议会跟着变化。',
          placeholder: `例如：${childLabel}叫小明，生日是2018年5月1日，是男孩。`,
          examples: [`${childLabel}叫小明，2018年5月1日出生`, `${childLabel}是女孩，今年5岁`, `${childLabel}读幼儿园中班`],
        };
      case 'daily-schedule':
        return {
          title: `安排${childLabel}的日常节奏${childStepSuffix}`,
          question: `${childLabel}平时几点到校、几点放学？放学后有没有托管或固定课外班？`,
          effect: '会决定任务放在早晨、放学后、晚饭前还是睡前，也会影响接送提醒。',
          placeholder: '例如：早上8点到校，下午4点放学，没有托管。',
          examples: ['8点到4点，没有托管', '8点半到5点，有晚托', '上午9点到下午3点半'],
        };
      case 'activities':
        return {
          title: `区分${childLabel}的课外班和日常练习${childStepSuffix}`,
          question: `${childLabel}有哪些每周固定上课的班？哪些是在家经常练的内容？`,
          effect: '固定课外班主要占用时间，日常练习会生成可打卡任务，两者会分开进入日程。',
          placeholder: '例如：周三钢琴课，平时每天练琴20分钟，周末游泳。',
          examples: ['每周三钢琴课，每天练琴20分钟', '每周两次游泳，平时跳绳10分钟', '没有课外班，只做亲子阅读'],
        };
      case 'holiday-schedule':
        return {
          title: '再问假期是否要单独安排',
          question: '寒暑假或长假时，孩子的作息、旅行、夏令营或兴趣班会和平日明显不同吗？',
          effect: '会决定是否生成假期版日程，之后也会叠加公共假期和极端天气提醒。',
          placeholder: '例如：暑假会去夏令营一周，其他时间希望上午学习下午运动。',
          examples: ['假期和平时差不多', '暑假有夏令营和旅行', '寒假想上午学习下午运动'],
        };
      case 'priorities':
        return {
          title: '最后问最近最想改善什么',
          question: '这段时间你最希望先改善孩子哪件事？不用全选，说最在意的一两点就行。',
          effect: '会影响 AI 推荐的排序、奖励强度和周报复盘重点。',
          placeholder: '例如：希望孩子写作业别拖拉，也想每天早点睡。',
          examples: ['写作业拖拉，想提高专注', '希望早睡早起，多运动', '想培养责任心和家务习惯'],
        };
      default:
        return null;
    }
  };

  const stripAssistantFlowWords = (command: string) => command
    .replace(/(然后|并且|顺便)?(下一步|继续|进入下一步|帮我生成|开始生成|直接生成)[。！!,.，\s]*$/g, '')
    .replace(/^(帮我|请你|麻烦你|直接|我想|我要)/, '')
    .trim();

  const buildStepExplanation = () => {
    const guidedQuestion = getGuidedQuestion();
    if (!guidedQuestion) return '你可以直接告诉我你想安排什么，我会帮你拆成下一步。';
    return `${guidedQuestion.question}\n\n为什么问：${guidedQuestion.effect}\n\n可以这样说：${guidedQuestion.examples.join('；')}`;
  };

  const getMissingGuidePrompt = (command: string) => {
    const child = profile.children[currentChildIndex] || profile.children[0];
    const childLabel = child?.name || getDefaultChildName(currentChildIndex);
    const hasNegative = /没有|不需要|不用|不参加|和平时一样|照常|暂无/.test(command);

    if (/不懂|没明白|不明白|什么意思|怎么选|解释|看不懂|选项/.test(command)) {
      return buildStepExplanation();
    }

    if (currentStep === 'family-type') {
      const count = parseChildCountFromSpeech(command);
      const careStructure = inferCareStructureFromSpeech(command);
      const ages = parseAgesFromSpeech(command);
      if (!count) return '我先确认一个最基础的信息：家里有几个孩子？例如“两个孩子”。';
      if (/60岁|六十岁|一个60/.test(command)) return '我听到一个年龄像“60”，这应该是“6岁”还是“10岁”？请再说一遍两个孩子分别几岁。';
      if (ages.length > 0 && ages.length < count) return `我听到有 ${count} 个孩子，但年龄只听清 ${ages.length} 个。请补充每个孩子大概几岁，生日不知道也没关系。`;
      if (!careStructure) return '再确认一下平时谁主要负责接送、陪作业和睡前流程？例如“爸爸妈妈共同安排”或“妈妈为主，姥姥偶尔接送”。';
      return null;
    }

    if (currentStep === 'child-details') {
      const name = parseNameFromSpeech(command, childLabel);
      const birthday = normalizeSpokenBirthday(command);
      const age = parseAgeFromSpeech(command);
      const gender = /女孩|女儿|妹妹|姐姐|男孩|儿子|哥哥|弟弟/.test(command);
      if (!name && child.name === childLabel) return `请再告诉我${childLabel}叫什么名字或小名。`;
      if (!birthday && age === null) return `请再告诉我${childLabel}的生日或年龄，生日不知道说“今年几岁”也可以。`;
      if (!gender) return `请再告诉我${childLabel}是男孩还是女孩，这会影响后面兴趣和任务示例。`;
      return null;
    }

    if (currentStep === 'daily-schedule') {
      const timeRange = parseSpokenTimeRange(command);
      const hasAfterSchool = /托管|课后班|晚托|延时|课外班|培训班|没有|不用|不参加|不托管/.test(command);
      if (!timeRange) return `请补充${childLabel}平时大概几点到校、几点放学。例如“早上8点到校，下午4点放学”。`;
      if (!hasAfterSchool) return `放学后有没有托管、晚托或固定课外班？没有也可以直接说“没有托管”。`;
      return null;
    }

    if (currentStep === 'activities') {
      if (hasNegative) return null;
      const items = splitSpokenItems(command);
      const classItems = items.filter(item => /课|班|训练|社团|钢琴|小提琴|唱歌|声乐|游泳|篮球|足球|英语|编程|绘画|书法|舞蹈/.test(item));
      const practiceItems = items.filter(item => /练|每天|打卡|阅读|跳绳|识字|背|口算|错题|奥数|唱歌/.test(item));
      if (classItems.length + practiceItems.length === 0) {
        return `这一页要把“固定课外班”和“日常练习”分开。比如“周三钢琴课”是固定课外班，“每天练琴20分钟”是日常练习。${childLabel}有这些安排吗？`;
      }
      return null;
    }

    if (currentStep === 'holiday-schedule') {
      if (!/寒假|暑假|假期|旅行|夏令营|冬令营|回老家|出去玩|培训|集训|没有|不需要|和平时一样|照常/.test(command)) {
        return '寒暑假或长假会和平日明显不同吗？可以说“和平时一样”，也可以说“暑假有夏令营和旅行”。';
      }
      return null;
    }

    if (currentStep === 'priorities') {
      const priorityIds = inferPriorityIdsFromSpeech(command);
      if (priorityIds.length === 0 && command.length < 6) {
        return '最后只需要说最想先改善的一两件事，例如“写作业拖拉，想早点睡”。';
      }
      return null;
    }

    return null;
  };

  const buildAssistantConfirmation = (command: string, wantsNext: boolean) => {
    const guidedQuestion = getGuidedQuestion();
    const title = guidedQuestion?.title || '当前步骤';
    const nextText = wantsNext ? '确认后我会进入下一步。' : '确认后我先保存到当前页。';
    return `我准备把这段话记到「${title}」里：\n${command}\n\n${nextText}`;
  };

  const askNextGuideQuestion = () => {
    const guidedQuestion = getGuidedQuestion();
    if (!guidedQuestion) {
      setAssistantMode('text');
      return;
    }
    setAssistantPrompt(`${guidedQuestion.question}\n\n${guidedQuestion.effect}`);
    setDialogueAnswer('');
    setAssistantMode('followup');
  };

  useEffect(() => {
    if (!isGuideOpen || !assistantShouldPromptAfterStepChange) return;
    const timer = window.setTimeout(() => {
      askNextGuideQuestion();
      setAssistantShouldPromptAfterStepChange(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentStep, currentChildIndex, isGuideOpen, assistantShouldPromptAfterStepChange]);

  const executeAssistantCommand = (text: string) => {
    const command = text.trim();
    if (!command) {
      showToastGlobal(t('onboarding.assistant_empty_toast', { defaultValue: od('可以直接说一句，我会帮你同步到当前页面。', 'Say one sentence and I will apply it to this step.') }), 'info');
      return;
    }
    setVoiceGuideText(command);

    const wantsBack = /上一步|返回|退回/.test(command);
    const wantsNext = /下一步|继续|进入下一步|帮我生成|开始生成|直接生成/.test(command);
    let fillText = stripAssistantFlowWords(command);
    const pendingGuideAction = pendingGuideActionRef.current;
    if (pendingGuideAction && fillText && !/^(下一步|继续|返回|上一步)$/.test(fillText)) {
      fillText = `${pendingGuideAction.command}。${fillText}`;
    } else if (pendingGuideAction && /^(下一步|继续)$/.test(fillText)) {
      fillText = pendingGuideAction.command;
    }

    if (wantsBack) {
      pendingGuideActionRef.current = null;
      setAssistantConfirmation(null);
      handleBack();
      showToastGlobal(t('onboarding.assistant_back_toast', { defaultValue: od('已为你返回上一步', 'Moved back one step') }), 'success');
      setAssistantShouldPromptAfterStepChange(true);
      return;
    }

    if (!fillText || /^(下一步|继续)$/.test(fillText)) {
      askNextGuideQuestion();
      return;
    }

    const missingPrompt = getMissingGuidePrompt(fillText);
    if (missingPrompt) {
      pendingGuideActionRef.current = { command: fillText, wantsNext: wantsNext || !!pendingGuideAction?.wantsNext };
      setAssistantPrompt(missingPrompt);
      setDialogueAnswer('');
      setAssistantConfirmation(null);
      setAssistantMode('followup');
      return;
    }

    pendingGuideActionRef.current = null;
    setAssistantConfirmation({
      command: fillText,
      summary: buildAssistantConfirmation(fillText, wantsNext || !!pendingGuideAction?.wantsNext),
      wantsNext: wantsNext || !!pendingGuideAction?.wantsNext,
    });
    setDialogueAnswer('');
    setAssistantMode('confirm');
  };

  const confirmAssistantResult = () => {
    if (!assistantConfirmation) return;
    setAssistantMode('processing');
    applyVoiceGuideText(assistantConfirmation.command);
    const shouldMoveNext = assistantConfirmation.wantsNext;
    setAssistantConfirmation(null);
    setDialogueAnswer('');
    setAssistantPrompt('');

    if (shouldMoveNext) {
      if (canProceed()) {
        handleNext();
        setAssistantShouldPromptAfterStepChange(true);
        showToastGlobal(t('onboarding.assistant_next_toast', { defaultValue: od('已确认，并继续下一步', 'Confirmed. Moving to the next step.') }), 'success');
      } else {
        setAssistantPrompt(t('onboarding.assistant_required_prompt', { defaultValue: od('当前页还有必须选择的内容，我先保存你的补充。再确认一下缺少的部分。', 'This step still has required choices. I saved your input and will ask for what is missing.') }));
        setAssistantMode('followup');
      }
      return;
    }

    setAssistantPrompt('已保存到当前页。你可以继续补充，或者说“下一步”。');
    setAssistantMode('followup');
  };

  const applyDialogueAnswer = () => {
    const text = dialogueAnswer.trim();
    if (!text) {
      showToastGlobal('可以直接说一句，我会帮你同步到当前页面。', 'info');
      return;
    }
    executeAssistantCommand(text);
  };

  const renderGuidedDialogueCard = () => {
    const guidedQuestion = getGuidedQuestion();
    if (!guidedQuestion) return null;
    const progressIndex = PROGRESS_STEPS.indexOf(currentStep);
    const visibleQuestionNumber = progressIndex >= 0 ? progressIndex + 1 : 1;
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <AnimatePresence>
          {isGuideOpen && (
            <>
              <motion.button
                key="assistant-backdrop"
                type="button"
                aria-label={t('onboarding.close_voice_assistant', { defaultValue: od('关闭 AI 语音助手', 'Close AI voice assistant') })}
                className="pointer-events-auto absolute inset-0 bg-on-surface/10 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeVoiceAssistant}
              />
              <motion.section
                key="assistant-panel"
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="pointer-events-auto absolute inset-x-4 bottom-[6.75rem] mx-auto max-w-md overflow-hidden rounded-[2rem] border border-white/55 bg-white/90 p-4 shadow-2xl shadow-primary/20 backdrop-blur-2xl"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,34,0.18),transparent_48%),radial-gradient(circle_at_16%_100%,rgba(255,210,66,0.18),transparent_38%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleVoiceGuide}
                        disabled={isVoiceGuiding}
                        className="relative h-16 w-16 shrink-0 rounded-full bg-primary text-white shadow-xl shadow-primary/30 active:scale-95 transition-all disabled:opacity-70"
                        aria-label={t('onboarding.start_voice_input', { defaultValue: od('开始语音输入', 'Start voice input') })}
                      >
                        <motion.span
                          className="absolute inset-[-0.55rem] rounded-full border border-primary/25"
                          animate={{ scale: isVoiceGuiding ? [1, 1.18, 1] : [1, 1.08, 1], opacity: isVoiceGuiding ? [0.8, 0.2, 0.8] : [0.5, 0.15, 0.5] }}
                          transition={{ duration: isVoiceGuiding ? 1.05 : 2.2, repeat: Infinity }}
                        />
                        <span className="relative flex h-full w-full items-center justify-center">
                          {isVoiceGuiding ? <MicOff size={27} /> : <Mic size={27} />}
                        </span>
                      </button>
                      <div>
                        <p className="text-[10px] font-black text-primary">
                          {t('onboarding.assistant_step_label', { step: visibleQuestionNumber, defaultValue: od(`AI 家庭管家 · 第 ${visibleQuestionNumber} 步`, `AI Family Steward · Step ${visibleQuestionNumber}`) })}
                        </p>
                        <h3 className="text-lg font-black text-on-surface leading-tight mt-1">
                          {assistantMode === 'listening'
                            ? t('onboarding.assistant_listening_title', { defaultValue: od('我在听，你直接说', 'I am listening') })
                            : assistantMode === 'processing'
                              ? t('onboarding.assistant_processing_title', { defaultValue: od('我在整理你的回答', 'I am organizing your answer') })
                              : assistantMode === 'confirm'
                                ? t('onboarding.assistant_confirm_title', { defaultValue: od('请确认我理解得对不对', 'Please confirm I understood correctly') })
                                : assistantMode === 'followup'
                                  ? t('onboarding.assistant_followup_title', { defaultValue: od('还差一点信息', 'One more detail needed') })
                                  : t('onboarding.assistant_text_title', { defaultValue: od('可以打字告诉我', 'You can type it here') })}
                        </h3>
                        <p className="text-[11px] font-bold text-on-surface-variant/65 leading-relaxed mt-1">
                          {assistantMode === 'listening'
                            ? t('onboarding.assistant_listening_desc', { defaultValue: od('像和助手说话一样描述需求，我会先整理成可执行内容。', 'Describe it naturally and I will turn it into something actionable.') })
                            : assistantMode === 'processing'
                              ? t('onboarding.assistant_processing_desc', { defaultValue: od('我会判断信息是否完整，不完整就继续追问。', 'I will check whether anything important is missing.') })
                              : assistantMode === 'confirm'
                                ? t('onboarding.assistant_confirm_desc', { defaultValue: od('确认后才会写入当前流程并进入下一步。', 'I will apply it only after you confirm.') })
                                : assistantMode === 'followup'
                                  ? t('onboarding.assistant_followup_desc', { defaultValue: od('不用想表单怎么填，直接回答这个问题就行。', 'No need to think about forms. Just answer this question.') })
                                  : t('onboarding.assistant_text_desc', { defaultValue: od('语音不方便时，也可以用一句话补充。', 'When voice is inconvenient, one typed sentence works too.') })}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeVoiceAssistant}
                      className="h-10 w-10 shrink-0 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center active:scale-95"
                      aria-label={t('onboarding.collapse_voice_assistant', { defaultValue: od('收起 AI 语音助手', 'Collapse AI voice assistant') })}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] bg-white/78 p-3 shadow-inner shadow-primary/5">
                    {assistantMode === 'listening' && (
                      <div className="py-5 text-center">
                        <div className="mx-auto flex h-16 w-28 items-end justify-center gap-1.5">
                          {[0, 1, 2, 3, 4].map((bar) => (
                            <motion.span
                              key={bar}
                              className="w-2 rounded-full bg-primary"
                              animate={{ height: [18, 44, 24, 52, 18] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: bar * 0.08 }}
                            />
                          ))}
                        </div>
                        <p className="mt-3 text-sm font-black text-on-surface">{t('onboarding.listening', { defaultValue: od('正在听...', 'Listening...') })}</p>
                        <p className="mt-1 text-[11px] font-bold text-on-surface-variant/60">
                          {t('onboarding.voice_example_family', { defaultValue: od('例如：我有两个孩子，爸爸妈妈共同安排。', 'Example: I have two children, and both parents help arrange things.') })}
                        </p>
                      </div>
                    )}

                    {assistantMode === 'processing' && (
                      <div className="py-5 text-center">
                        <Loader2 size={28} className="mx-auto animate-spin text-primary" />
                        <p className="mt-3 text-sm font-black text-on-surface">{t('onboarding.checking_missing_info', { defaultValue: od('正在判断还缺什么...', 'Checking what is still missing...') })}</p>
                        {dialogueAnswer && (
                          <p className="mt-2 rounded-[1rem] bg-surface px-3 py-2 text-left text-xs font-bold text-on-surface-variant leading-relaxed">
                            {dialogueAnswer}
                          </p>
                        )}
                      </div>
                    )}

                    {assistantMode === 'confirm' && assistantConfirmation && (
                      <div className="space-y-3">
                        <div className="rounded-[1.25rem] bg-surface px-3 py-3 text-sm font-black text-on-surface leading-relaxed">
                          {assistantConfirmation.summary}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={confirmAssistantResult}
                            className="rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95"
                          >
                            {assistantConfirmation.wantsNext
                              ? t('onboarding.confirm_and_continue', { defaultValue: od('确认并继续', 'Confirm and continue') })
                              : t('onboarding.confirm_save', { defaultValue: od('确认保存', 'Confirm and save') })}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              pendingGuideActionRef.current = {
                                command: assistantConfirmation.command,
                                wantsNext: assistantConfirmation.wantsNext,
                              };
                              setAssistantConfirmation(null);
                              setAssistantPrompt(t('onboarding.assistant_more_detail_prompt', { defaultValue: od('还想补充哪一点？直接说或输入，我会合并到刚才那段话里。', 'What else should I add? Say or type it and I will merge it with your previous answer.') }));
                              setAssistantMode('followup');
                            }}
                            className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95 disabled:opacity-50"
                          >
                            {t('onboarding.add_one_sentence', { defaultValue: od('补充一句', 'Add a sentence') })}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDialogueAnswer(assistantConfirmation.command);
                              setAssistantMode('text');
                            }}
                            className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95"
                          >
                            {t('onboarding.edit_text', { defaultValue: od('改文字', 'Edit text') })}
                          </button>
                        </div>
                      </div>
                    )}

                    {assistantMode === 'followup' && (
                      <div className="space-y-3">
                        <div className="rounded-[1.25rem] bg-surface px-3 py-3 text-sm font-black text-on-surface leading-relaxed whitespace-pre-wrap">
                          {assistantPrompt || getGuidedQuestion()?.question}
                        </div>
                        <textarea
                          value={dialogueAnswer}
                          onChange={(e) => setDialogueAnswer(e.target.value)}
                          placeholder={getGuidedQuestion()?.placeholder || t('onboarding.direct_add_sentence', { defaultValue: od('直接补充一句', 'Add one sentence') })}
                          rows={3}
                          className="w-full resize-none rounded-[1.25rem] bg-surface px-3 py-3 text-sm font-bold text-on-surface outline-none border border-outline-variant/10 focus:border-primary"
                        />
                        <div className="flex flex-wrap gap-2">
                          {dialogueAnswer.trim() && (
                            <button
                              type="button"
                              onClick={applyDialogueAnswer}
                              className="rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95"
                            >
                              {t('onboarding.continue_organizing', { defaultValue: od('继续整理', 'Continue') })}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleVoiceGuide}
                            disabled={isVoiceGuiding}
                            className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95 disabled:opacity-50"
                          >
                            {t('onboarding.answer_by_voice', { defaultValue: od('用语音回答', 'Answer by voice') })}
                          </button>
                        </div>
                      </div>
                    )}

                    {assistantMode === 'text' && (
                      <div className="space-y-3">
                        <textarea
                          value={dialogueAnswer}
                          onChange={(e) => setDialogueAnswer(e.target.value)}
                          placeholder={`${guidedQuestion.placeholder} ${t('onboarding.next_voice_hint', { defaultValue: od('也可以说“填好后下一步”。', 'You can also say "next after filling this".') })}`}
                          rows={3}
                          className="w-full resize-none rounded-[1.25rem] bg-surface px-3 py-3 text-sm font-bold text-on-surface outline-none border border-outline-variant/10 focus:border-primary"
                        />
                        {dialogueAnswer.trim() && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={applyDialogueAnswer}
                              className="rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/20 active:scale-95"
                            >
                              {t('onboarding.continue_organizing', { defaultValue: od('继续整理', 'Continue') })}
                            </button>
                            <button
                              type="button"
                              onClick={handleVoiceGuide}
                              disabled={isVoiceGuiding}
                              className="rounded-full bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface-variant active:scale-95 disabled:opacity-50"
                            >
                              {t('onboarding.retry_voice', { defaultValue: od('重新语音', 'Try voice again') })}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={openVoiceAssistant}
          className="pointer-events-auto absolute bottom-[7rem] right-[max(0.75rem,calc((100vw-28rem)/2+0.75rem))] h-14 w-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/30 active:scale-95"
          aria-expanded={isGuideOpen}
          aria-label={t('onboarding.open_voice_assistant', { defaultValue: od('唤起 AI 语音助手', 'Open AI voice assistant') })}
          initial={false}
          animate={{ scale: isGuideOpen ? 0.92 : 1, opacity: isGuideOpen ? 0 : 1 }}
          transition={{ duration: 0.18 }}
        >
          <motion.span
            className="absolute inset-[-0.45rem] rounded-full border border-primary/30"
            animate={{ scale: [1, 1.16, 1], opacity: [0.55, 0.1, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.span
            className="absolute inset-[-0.9rem] rounded-full border border-primary/15"
            animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.04, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />
          <span className="relative flex h-full w-full items-center justify-center rounded-full bg-primary">
            <Mic size={23} />
          </span>
        </motion.button>
      </div>
    );
  };

  // 本地备选：根据年龄和优先级生成推荐（支持按孩子分配通用/专属任务）
  const generateLocalRecommendations = (profileOverride?: FamilyProfile) => {
    const activeProfile = profileOverride || profile;
    const tasks: RecommendedTask[] = [];
    let idCounter = 0;
    const careOption = getCareStructureOption(activeProfile.careStructure);
    
    const addTask = (name: string, desc: string, type: 'daily' | 'weekly' | 'habit', stars: number, category: string, childName: string | null, time?: string) => {
      tasks.push({
        id: `task-${idCounter++}`,
        title: name,
        description: desc,
        type,
        rewardStars: normalizeTaskRewardStars(stars, { category }),
        icon: getIconForTaskCategory(category),
        category,
        assigneeRole: 'child',
        suggestedTime: time,
        assigneeChildNames: childName ? [childName] : undefined, // null = 所有孩子
      });
    };

    const priorities = activeProfile.priorities;
    const hasPriority = (p: string) => priorities.includes(p);
    const childNames = activeProfile.children.map(c => c.name || (c.gender === 'boy' ? '儿子' : '女儿'));

    // ===== 通用任务（所有孩子都适用）=====
    if (hasPriority('health')) {
      addTask('早睡早起', '保证充足睡眠，有助于身高发育和学习效率', 'daily', 3, '健康运动', null, '睡前');
      addTask('每天喝足水', '养成饮水习惯，促进新陈代谢和身体健康', 'daily', 2, '健康运动', null, '全天');
    }
    if (hasPriority('housework')) {
      addTask('整理自己房间', '学会整理个人物品，培养自理能力和整洁习惯', 'daily', 3, '生活习惯', null, '睡前');
      addTask('帮忙摆碗筷', '参与简单家务，培养家庭责任感和动手能力', 'daily', 2, '家务劳动', null, '晚饭前');
    }
    addTask('按时完成作业', '每天按时完成学校作业，培养学习习惯', 'daily', 4, '学习习惯', null, '放学后');

    if (activeProfile.careStructure === 'grandparents-help') {
      addTask('放学交接确认', '老人参与照看时，记录接送、吃饭和作业开始情况，方便父母晚上接续安排', 'daily', 2, '自我管理', null, '放学后');
    } else if (activeProfile.careStructure === 'one-parent-main') {
      addTask('晚间三件事', '一位家长为主时，把作业、洗漱、整理书包压缩成固定流程，降低沟通成本', 'daily', 4, '自我管理', null, '晚饭后');
    } else if (activeProfile.careStructure === 'nanny-help') {
      addTask('生活照料反馈', '由协助者提醒饮食、洗漱和物品整理，父母晚上只确认关键结果', 'daily', 2, '生活习惯', null, '晚饭前');
    } else if (activeProfile.careStructure === 'rotating-care') {
      addTask('今日负责人交接', '多人轮流照看时，记录今天由谁接送、谁陪作业、谁负责睡前流程', 'daily', 3, '自我管理', null, '早上');
    } else if (activeProfile.careStructure === 'parents-together') {
      addTask('亲子复盘5分钟', '父母共同安排时，每晚用几分钟同步今天完成情况和明日重点', 'daily', 3, '社交礼仪', null, '睡前');
    }

    // ===== 按孩子专属任务 =====
    for (const child of activeProfile.children) {
      const childName = child.name || (child.gender === 'boy' ? '儿子' : '女儿');
      const isYoung = child.age <= 6;
      const isMiddle = child.age >= 7 && child.age <= 12;
      const isOld = child.age >= 13;
      const weeklyClasses = [...(child.afterSchoolActivities || []), ...(child.customActivities || [])];
      const dailyPractices = [...(child.dailyPractices || []), ...(child.customPractices || [])];
      const hasWeeklyClasses = weeklyClasses.length > 0;
      const hasDailyPractices = dailyPractices.length > 0;

      if (hasPriority('study') || isMiddle) {
        addTask('回家先做作业', `${childName}的专属作业任务，${child.age}岁是学习习惯培养关键期`, 'daily', isMiddle ? 5 : 3, '学习习惯', childName, '放学后');
        addTask('预习明天课程', `${childName}提前预习帮助跟上老师节奏`, 'daily', 3, '学习习惯', childName, '晚饭后');
        if (isMiddle || isOld) {
          addTask('整理错题本', `${childName}整理错题，巩固薄弱知识点`, 'weekly', 5, '学习习惯', childName, '周末');
        }
      }

      if (hasPriority('health') && !hasWeeklyClasses) {
        addTask('户外运动30分钟', `${childName}每天保持适量运动，促进身体发育`, 'daily', 4, '健康运动', childName, '放学后');
      }

      if (hasPriority('hobby') && hasWeeklyClasses) {
        weeklyClasses.forEach(act => {
          addTask(`${act}课前准备`, `${childName}每周有固定${act}课，提前整理用品并预留路程和缓冲时间`, 'weekly', 3, '兴趣培养', childName, '上课前');
        });
      }

      if (hasDailyPractices) {
        dailyPractices.forEach(act => {
          addTask(`${act}练习`, `${act}属于家庭内可安排的日常练习，建议放在作业后或睡前前的固定短时段`, 'daily', 3, '兴趣培养', childName, '晚饭后');
        });
      }

      if (isYoung) {
        addTask('自己刷牙洗脸', `${childName}培养早晚洗漱卫生习惯`, 'daily', 3, '自理能力', childName, '起床后/睡前');
        addTask('整理玩具', `${childName}玩完后主动收拾，培养秩序感`, 'daily', 3, '生活习惯', childName, '睡前');
      }
      if (isMiddle) {
        addTask('每日课外阅读20分钟', `${childName}通过阅读拓宽知识面`, 'daily', 4, '兴趣培养', childName, '睡前');
      }
      if (isOld) {
        addTask('管理电子设备时间', `${childName}学会自律使用手机/平板`, 'daily', 5, '自我管理', childName, '全天');
        if (activeProfile.children.length > 1) {
          addTask('帮助辅导弟弟妹妹', `培养${childName}的责任感和领导力`, 'daily', 5, '社交礼仪', childName, '放学后');
        }
      }

      if (hasPriority('responsibility') && isOld) {
        addTask('制定每周计划', `${childName}学会时间管理和目标规划`, 'weekly', 6, '自我管理', childName, '周日晚');
      }
    }

    // 补充通用习惯（同标题不重复）
    const hasReading = tasks.some(t => t.title.includes('阅读课外书') || t.title.includes('每日阅读'));
    if (!hasReading) {
      tasks.push({
        id: `habit-stand`,
        title: '每日阅读',
        description: '每天坚持阅读15-30分钟，培养终身学习习惯',
        type: 'habit',
        rewardStars: getRewardStarPreset('study'),
        icon: 'Sparkles',
        category: '习惯养成',
        assigneeRole: 'child',
      });
    }

    if (activeProfile.specialRequests.trim() || careOption.scheduleHint) {
      // 保留照看结构对本地推荐的影响，不强制额外暴露给孩子。
    }

    // 限制数量，最多15个
    return tasks.slice(0, 15);
  };

  // 生成推荐任务 - 使用真实 AI (MiniMax)，失败时自动使用本地备选
  const generateAIRecommendations = async (profileOverride?: FamilyProfile) => {
    const activeProfile = profileOverride || profile;
    setIsGenerating(true);
    setAiStatus('waiting');
    setAiElapsedSec(0);

    // 启动计时器
    const timerInterval = setInterval(() => {
      setAiElapsedSec(prev => prev + 1);
    }, 1000);

    const AI_TIMEOUT_MS = 15000; // 15秒超时

    try {
      // 构建家庭画像描述
      const childDescriptions = activeProfile.children.map((c, i) => {
        const weeklyClasses = [...(c.afterSchoolActivities || []), ...(c.customActivities || [])];
        const dailyPractices = [...(c.dailyPractices || []), ...(c.customPractices || [])];
        return `
孩子${i + 1}：
  - 年龄：${c.age}岁
  - 性别：${c.gender === 'boy' ? '男' : '女'}
  - 年级：${c.grade}
  - 上学时间：${c.schoolTime.start}-${c.schoolTime.end}
  - 每周固定课外班/托管（外部时间占用）：${weeklyClasses.join('、') || '无'}
  - 日常兴趣或学习练习（可安排到家庭日程）：${dailyPractices.join('、') || '无'}
  - 参加托管班：${c.hasAfterSchool ? '是' : '否'}`;
      }).join('\n');

      const hasHoliday = activeProfile.hasHolidaySchedule;
      const holidayDesc = hasHoliday ? `
假期作息（${activeProfile.holidayDaySchedule.start}-${activeProfile.holidayDaySchedule.end}）：
  - 假期安排了以下活动：${activeProfile.holidayCustomActivities.join('、') || '无特别安排'}
  - 假期日程与平日不同，建议推荐一些适合假期的任务（如阅读打卡、家务劳动、创意活动等）
` : '';

      const prompt = `请根据以下家庭画像，为这个家庭推荐任务和习惯。注意：有些任务是所有孩子通用的（如早睡早起），有些任务则是某个孩子专属的（如根据兴趣特长推荐的）。

照看结构：
- 类型：${getCareStructureOption(activeProfile.careStructure).label}
- 对日程安排的影响：${getCareStructureOption(activeProfile.careStructure).scheduleHint}

家庭信息：
- 孩子数量：${activeProfile.childrenCount}
${childDescriptions}
${holidayDesc}
家长优先关注：
${activeProfile.priorities.map(p => {
  const labels: Record<string, string> = { study: '学习习惯', health: '健康生活', housework: '家务劳动', social: '社交能力', hobby: '兴趣培养', responsibility: '责任心' };
  return `- ${labels[p] || p}`;
}).join('\n')}

${activeProfile.specialRequests ? `特别需求/补充说明：
${activeProfile.specialRequests}

请特别考虑以上补充需求来推荐合适的任务。` : ''}

请返回以下 JSON 格式（只返回 JSON，不要包含其他文字）：
{
  "tasks": [
    {
      "name": "任务名称",
      "reason": "为什么推荐这个任务（结合孩子的年龄和家庭特点给出个性化理由）",
      "frequency": "daily/weekly",
      "rewardStars": 1-10的数字,
      "category": "学习习惯/生活习惯/自理能力/健康运动/社交礼仪/家务劳动/兴趣培养/自我管理",
      "suggestedTime": "建议完成时间段",
      "assignTo": "all"或"childIndex:0"或"childIndex:1"（all表示所有孩子都做，childIndex:N表示只分配给第N+1个孩子）
    }
  ],
  "habits": [
    {
      "name": "习惯名称",
      "reason": "为什么推荐这个习惯",
      "targetDays": 21,
      "category": "习惯养成",
      "assignTo": "all"或"childIndex:0"或"childIndex:1"
    }
  ]
}

要求：
1. 推荐 8-12 个任务，3-5 个习惯
2. 务必区分通用任务（assignTo: "all"）和专属任务（assignTo: "childIndex:N"）
3. 专属任务必须基于该孩子的具体年龄、年级和课外活动
4. 结合家长关注的优先级侧重相关任务
5. 任务要具体、可操作，适合孩子年龄
6. 有课外班的孩子要合理安排时间，避免冲突
7. 有假期日程安排的要适当推荐适合假期的任务
8. 奖励星星数要合理（生活小事1-2⭐，学习/兴趣练习3-5⭐，困难任务6-8⭐，阶段成果10-20⭐）
9. 必须结合照看结构安排任务时段：老人/阿姨参与时要给出清晰交接或反馈任务；一位家长为主时减少晚间高密度安排；多人轮流照看时强调负责人和交接提醒；父母共同安排时可加入亲子复盘或共同兑现任务。
10. 严格区分“每周固定课外班”和“日常兴趣/学习练习”：课外班主要影响时间占用、接送和课前准备；日常练习才应生成 daily 任务，例如跳绳、练琴、绘画、英语、识字、口算、阅读。`;

      const systemInstruction = `你是专业的家庭教育顾问，擅长根据孩子的年龄、性格和家庭情况推荐合适的任务和习惯。你推荐的任务具体、可操作、符合儿童发展规律。

重要规则：
- 必须返回标准的 JSON 格式，不能包含 JSON 之外的任何文字
- 任务名称要简短明了（不超过10个字）
- 原因要结合家庭实际情况，不要通用模板
- 频率为 daily 的任务奖励星星要少一些（1-5⭐），weekly 或阶段成果可以多些但不要超过20⭐
- 推荐的数量要合理：6-10个任务，3-5个习惯`;

      console.log('[AI] 正在调用 MiniMax 生成推荐...');
      
      // 带超时的 AI 调用
      const result = await Promise.race([
        callAIJson<{
          tasks: Array<{ name: string; reason: string; frequency: string; rewardStars: number; category: string; suggestedTime?: string; assignTo?: string }>;
          habits: Array<{ name: string; reason: string; targetDays: number; category: string; assignTo?: string }>;
        }>(prompt, systemInstruction),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS)
        ),
      ]);

      console.log('[AI] 推荐生成成功:', result);
      clearInterval(timerInterval);
      setAiStatus('done');

      const childNames = activeProfile.children.map(c => c.name || (c.gender === 'boy' ? '儿子' : '女儿'));
      const aiTasks: RecommendedTask[] = [];

      // 解析 assignTo 字段
      const resolveAssignee = (assignTo?: string): string[] | undefined => {
        if (!assignTo || assignTo === 'all') return undefined; // undefined = 所有孩子
        const match = assignTo.match(/childIndex:(\d+)/);
        if (match) {
          const idx = parseInt(match[1]);
          if (idx >= 0 && idx < childNames.length) {
            return [childNames[idx]];
          }
        }
        return undefined;
      };

      // 添加任务
      (result.tasks || []).forEach((task, index) => {
        aiTasks.push({
          id: `task-${index}`,
          title: task.name,
          description: task.reason,
          type: task.frequency === 'weekly' ? 'weekly' : 'daily',
          rewardStars: normalizeTaskRewardStars(task.rewardStars, { category: task.category }),
          icon: getIconForTaskCategory(task.category),
          category: task.category,
          assigneeRole: 'child',
          suggestedTime: task.suggestedTime,
          assigneeChildNames: resolveAssignee(task.assignTo),
        });
      });

      // 添加习惯
      (result.habits || []).forEach((habit, index) => {
        aiTasks.push({
          id: `habit-${index}`,
          title: habit.name,
          description: habit.reason,
          type: 'habit',
          rewardStars: getRewardStarPreset('life'),
          icon: 'Sparkles',
          category: '习惯养成',
          assigneeRole: 'child',
          assigneeChildNames: resolveAssignee(habit.assignTo),
        });
      });

      setRecommendations(aiTasks);
      setSelectedRecommendations(new Set(aiTasks.map(t => t.id)));
      setIsGenerating(false);
      setCurrentStep('recommendations');

    } catch (error: any) {
      clearInterval(timerInterval);
      const isTimeout = error?.message === 'AI_TIMEOUT';
      console.error(`[AI] AI 推荐失败${isTimeout ? '(超时)' : ''}, 切换到本地规则:`, error?.message || error);

      if (isTimeout) {
        setAiStatus('timeout');
        showToastGlobal('AI 响应较慢，已切换为本地智能推荐', 'info');
      } else {
        setAiStatus('local-fallback');
        showToastGlobal('AI 分析暂时不可用，已使用本地规则生成推荐', 'info');
      }
      
      // 使用本地备选方案
      const localTasks = generateLocalRecommendations(activeProfile);
      setRecommendations(localTasks);
      setSelectedRecommendations(new Set(localTasks.map(t => t.id)));
      setIsGenerating(false);
      setCurrentStep('recommendations');
    }
  };
  
  const getIconForTaskCategory = (category: string): string => {
    const iconMap: Record<string, string> = {
      '学习习惯': 'BookOpen',
      '生活习惯': 'Sparkles',
      '自理能力': 'Sparkles',
      '健康运动': 'Dumbbell',
      '社交礼仪': 'Users',
      '自我管理': 'Clock',
      '学习策略': 'GraduationCap',
      '自主管理': 'CheckCircle2',
    };
    return iconMap[category] || 'Sparkles';
  };

  // 切换推荐选择
  const toggleRecommendation = (id: string) => {
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 重新使用 AI 生成推荐（从预览页触发）
  const retryAIRecommendations = async () => {
    if (retryingAI) return;
    setRetryingAI(true);
    showToastGlobal('正在重新调用 AI 生成推荐...', 'info');
    try {
      await generateAIRecommendations();
    } catch (e) {
      showToastGlobal('AI 仍然不可用，已使用本地规则', 'info');
    } finally {
      setRetryingAI(false);
    }
  };

  // 确认导入：先创建成员账户，再添加任务、习惯和心愿
  const handleConfirm = async () => {
    const selectedItems = recommendations.filter(t => selectedRecommendations.has(t.id));
    
    // 前置检查：至少需要已登录
    if (!currentUser) {
      showToastGlobal('⚠️ 请先登录再导入', 'error');
      console.error('[Import] currentUser 为空，无法导入');
      return;
    }

    console.log('[Import] 开始导入...', { 
      childCount: profile.children.length, 
      itemCount: selectedItems.length,
      userId: currentUser?.id, 
      familyId: familyId ?? '(空)', 
    });

    // ========== 构建待导入的数据 ==========
    const importMembers: Member[] = [];
    const importPlans: DataPlan[] = [];
    const importTasks: Task[] = [];
    const importRewards: Reward[] = [];
    const now = new Date().toISOString();
    const onboardingPlanId = crypto.randomUUID();
    
    let childIds: string[] = [];

    // 1. 构建孩子成员数据
    for (const c of profile.children) {
      const memberId = crypto.randomUUID();
      const memberData: Member = {
        id: memberId,
        name: c.name || `${c.gender === 'boy' ? '儿子' : '女儿'}`,
        avatar: c.avatar || getDefaultAvatar(c.gender, c.age),
        stars: 0,
        role: 'child' as const,
        pin: hashMemberCredential(memberId, 'pin', '0000'),
      };
      importMembers.push(memberData);
      childIds.push(memberId);
    }

    // 如果没有新创建的孩子，使用已有的
    const finalChildIds = childIds.length > 0 ? childIds : members.filter(m => m.role === 'child').map(m => m.id);
    if (finalChildIds.length === 0) {
      showToastGlobal('⚠️ 没有可分配的孩子账户', 'error');
      return;
    }
    console.log('[Import] 孩子账户:', finalChildIds);
    const importSummary = buildOnboardingImportSummary(profile, selectedItems);
    const onboardingPlan: DataPlan = {
      id: onboardingPlanId,
      name: importSummary.planName,
      type: 'AI智能建档',
      metadata: {
        kind: 'onboarding_profile',
        source: 'ai_onboarding',
        childCount: profile.children.length,
        selectedTaskCount: selectedItems.length,
        taskCount: importSummary.taskCount,
        habitCount: importSummary.habitCount,
        fixedClassSetupCount: importSummary.fixedClassSetupCount,
        rewardCount: importSummary.rewardCount,
        focusLabels: importSummary.focusLabels,
        nextStepHints: importSummary.nextStepHints,
      },
      sortOrder: Date.now(),
      isActive: true,
      familyId: familyId || 'guest-family',
      createdAt: now,
      updatedAt: now,
      actorMemberId: currentUser.id,
    };
    importPlans.push(onboardingPlan);

    // 2. 构建任务和习惯数据
    // 建立孩子名字 → ID 的映射
    const childNameToId: Record<string, string> = {};
    for (let i = 0; i < profile.children.length; i++) {
      const c = profile.children[i];
      childNameToId[c.name || ''] = childIds[i];
    }
    for (const item of selectedItems) {
      // 根据 assigneeChildNames 确定指派给哪些孩子
      let targetChildIds: string[];
      if (item.assigneeChildNames && item.assigneeChildNames.length > 0) {
        // 专属任务：只指派给指定孩子
        targetChildIds = item.assigneeChildNames
          .map(name => childNameToId[name])
          .filter(Boolean);
        if (targetChildIds.length === 0) targetChildIds = finalChildIds; // fallback
      } else {
        // 通用任务：指派给所有孩子
        targetChildIds = finalChildIds;
      }
      const scheduleSuggestion = suggestOnboardingTaskSchedule(profile, {
        title: item.title,
        type: item.type,
        suggestedTime: item.suggestedTime,
        assigneeChildNames: item.assigneeChildNames,
      });
      const taskData: Task = {
        id: crypto.randomUUID(),
        title: item.title,
        description: `${item.description}${scheduleSuggestion.note ? `\n建档排程：${scheduleSuggestion.note}` : ''}`,
        type: item.type === 'habit' ? 'daily' : (item.type || 'daily'),
        rewardStars: item.rewardStars,
        icon: item.icon === 'Sparkles' ? 'Star' : item.icon || 'Star',
        status: 'pending' as TaskStatus,
        assigneeIds: targetChildIds,
        creatorId: currentUser?.id || 'parent',
        startTime: scheduleSuggestion.startTime,
        deadline: scheduleSuggestion.deadline,
        planId: onboardingPlanId,
        isHabit: item.type === 'habit',
        targetCount: item.type === 'habit' ? 21 : 1,
        currentCount: 0,
      };
      importTasks.push(taskData);
    }

    const fixedClassSetups = buildFixedClassSetupSuggestions(profile);
    for (const setup of fixedClassSetups) {
      const childId = childNameToId[setup.childName] || finalChildIds[0];
      importTasks.push({
        id: crypto.randomUUID(),
        title: setup.title,
        description: setup.description,
        type: 'interest',
        frequency: 'weekly',
        rewardStars: 0,
        icon: 'CalendarCheck',
        status: 'pending' as TaskStatus,
        assigneeIds: [currentUser.id],
        creatorId: currentUser.id,
        planId: onboardingPlanId,
        startTime: setup.startTime,
        deadline: setup.deadline,
        memberProgress: {
          [currentUser.id]: 'pending',
          [childId]: 'pending',
        },
      });
    }
    console.log('[Import] 待导入任务:', importTasks.length, '（习惯:', importTasks.filter(t => t.isHabit).length, '）');

    // 3. 构建心愿奖励数据
    const wishIdeas: Array<{ name: string; cost: number; icon: string; desc: string; category: string }> = [];
    for (const child of profile.children) {
      const acts = [
        ...(child.afterSchoolActivities || []),
        ...(child.customActivities || []),
        ...(child.dailyPractices || []),
        ...(child.customPractices || []),
      ];
      if (child.age <= 6) {
        wishIdeas.push(
          { name: `${child.name}想要的玩具`, cost: 20, icon: 'Gift', desc: '完成7天任务可兑换', category: '玩具' },
          { name: '去游乐场玩一天', cost: 30, icon: 'PartyPopper', desc: '周末亲子时光', category: '体验' },
          { name: '选一本新绘本', cost: 15, icon: 'BookOpen', desc: '阅读奖励', category: '学习' },
        );
      } else if (child.age <= 12) {
        wishIdeas.push(
          { name: `${child.name}的新文具套装`, cost: 25, icon: 'PenTool', desc: '学习用品', category: '学习' },
          { name: '选择周末去哪玩', cost: 35, icon: 'MapPin', desc: '自主决策奖励', category: '体验' },
          { name: '买一套乐高积木', cost: 50, icon: 'Blocks', desc: acts.includes('编程') ? 'STEM兴趣培养' : '动手能力培养', category: '玩具' },
          { name: '游戏时间+1小时', cost: 20, icon: 'Gamepad2', desc: '适度娱乐放松', category: '娱乐' },
        );
      } else {
        wishIdeas.push(
          { name: `${child.name}想要的新装备`, cost: 60, icon: 'Headphones', desc: '运动/数码装备', category: '装备' },
          { name: '和朋友出去聚会', cost: 40, icon: 'Users', desc: '社交奖励', category: '社交' },
          { name: '购买喜欢的书籍', cost: 25, icon: 'BookOpen', desc: '知识投资', category: '学习' },
        );
      }
      if (acts.some(a => ['绘画', '绘画练习', '书法', '练字'].includes(a))) {
        wishIdeas.push({ name: '新的画具套装', cost: 35, icon: 'Palette', desc: '艺术创作支持', category: '兴趣' });
      }
      if (acts.some(a => ['游泳', '足球', '篮球', '跑步', '跳绳', '运动打卡'].includes(a))) {
        wishIdeas.push({ name: '运动装备一件', cost: 30, icon: 'Dumbbell', desc: '运动支持', category: '体育' });
      }
      if (acts.some(a => ['钢琴', '练琴', '舞蹈', '主持'].includes(a))) {
        wishIdeas.push({ name: '演出门票一张', cost: 45, icon: 'Music', desc: '艺术欣赏奖励', category: '兴趣' });
      }
    }
    const seenWish = new Set<string>();
    const uniqueWishes = wishIdeas.filter(w => { if (seenWish.has(w.name)) return false; seenWish.add(w.name); return true; }).slice(0, 5);
    for (const wish of uniqueWishes) {
      importRewards.push({
        id: crypto.randomUUID(),
        planId: onboardingPlanId,
        name: wish.name,
        description: wish.desc,
        cost: wish.cost,
        icon: wish.icon,
        image: '',
        category: wish.category,
      });
    }
    console.log('[Import] 待导入心愿:', importRewards.length);

    // ========== 执行导入（统一使用 localImport，绕过 API） ==========
    console.log('[Import] ========== 准备执行导入 ==========');
    console.log('[Import] localImport 函数存在:', typeof localImport === 'function');
    
    // Onboarding 场景统一使用本地导入：不依赖 API，直接写入 React state
    // 这样即使网络不通也能成功完成初始化
    try {
      console.log('[Import] >>> 调用 localImport <<<');
      console.log('[Import] 调用前 members:', members.length, 'tasks:', tasks.length);
      await localImport({
        members: importMembers,
        plans: importPlans,
        tasks: importTasks,
        rewards: importRewards,
      });
      console.log('[Import] ✅ localImport 调用完成！');
      
      localStorage.removeItem(SAVE_KEY);
      setSavedData(null);

      const habitCount = importTasks.filter(t => t.isHabit).length;
      const taskCount = importTasks.length - habitCount;
      showToastGlobal(`✅ 已生成${onboardingPlan.name}：${taskCount}个任务、${habitCount}个习惯、${importRewards.length}个心愿`, 'success');
      setCurrentStep('success');
    } catch (err: any) {
      console.error('[Import] 导入失败:', err);
      showToastGlobal(`❌ 导入失败：${err.message}`, 'error');
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome': {
        const hasSaved = !!savedData;
        const savedTasks = savedData?.recommendations?.length || 0;
        const savedChildren = savedData?.profile?.children?.length || 0;
        const language = i18n.language || 'zh-CN';
        const english = language.toLowerCase().startsWith('en');
        const savedDate = savedData?.savedAt ? new Date(savedData.savedAt).toLocaleString(english ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div className="flex flex-col min-h-[calc(100vh-120px)]">
            {/* 头部图标 */}
            <div className="text-center pt-4 pb-2">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-on-surface mt-4 mb-2">
                {t('onboarding.welcome_title', english ? 'Welcome to WishCard' : '欢迎使用星愿卡')}
              </h1>
              <p className="text-on-surface-variant font-bold text-sm">
                {t('onboarding.welcome_subtitle', english ? 'Set up your family schedule quickly' : '快速建立家庭日程管理')}
              </p>
            </div>

            {/* 上次保存的分析记录 */}
            {hasSaved && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                    <Clock size={16} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-amber-800">
                      {t('onboarding.saved_record', english ? 'Saved setup record' : '上次的分析记录')}
                    </p>
                    <p className="text-[10px] text-amber-600/60">
                      {t('onboarding.saved_at', english ? 'Saved at' : '保存于')} {savedDate}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 bg-white/60 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-amber-800">{savedChildren}</p>
                    <p className="text-[10px] font-bold text-amber-600/60">{t('onboarding.children', english ? 'Children' : '孩子')}</p>
                  </div>
                  <div className="flex-1 bg-white/60 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-amber-800">{savedTasks}</p>
                    <p className="text-[10px] font-bold text-amber-600/60">{t('onboarding.recommended_tasks', english ? 'Tasks' : '推荐任务')}</p>
                  </div>
                  <div className="flex-1 bg-white/60 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-amber-800">
                      {english ? savedData?.profile?.careStructure?.split('-')[0] || 'Care' : getCareStructureOption(savedData?.profile?.careStructure || 'parents-together').label.slice(0, 2)}
                    </p>
                    <p className="text-[10px] font-bold text-amber-600/60">{t('onboarding.care_structure', english ? 'Care' : '照看结构')}</p>
                  </div>
                </div>
                {/* 操作按钮 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => restoreSavedData('family-type')}
                    className="py-2.5 rounded-xl bg-white border-2 border-amber-300 text-amber-800 font-bold text-sm active:scale-95 transition-all"
                  >
                    {t('onboarding.continue_edit', english ? 'Continue Editing' : '继续编辑')}
                  </button>
                  <button
                    onClick={restoreAndAnalyze}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <Sparkles size={14} />
                    {t('onboarding.reanalyze', english ? 'Analyze Again' : '重新分析')}
                  </button>
                </div>
                <button
                  onClick={clearSavedData}
                  className="w-full mt-2 py-2 rounded-xl bg-white/40 text-amber-600/60 font-bold text-xs active:scale-95 transition-all"
                >
                  {t('onboarding.clear_and_restart', english ? 'Clear and restart' : '清除记录，重新开始')}
                </button>
              </div>
            )}

            {profileArchives.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-black text-on-surface">{t('onboarding.profile_archives', english ? 'Family Profile Archives' : '家庭画像档案')}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/50">
                      {english ? `${profileArchives.length} recent records can be restored` : `最近 ${profileArchives.length} 次，可直接恢复微调`}
                    </p>
                  </div>
                  <Save size={17} className="text-primary shrink-0" />
                </div>
                <div className="space-y-2">
                  {profileArchives.slice(0, 3).map(archive => (
                    <button
                      key={archive.id}
                      type="button"
                      onClick={() => restoreArchive(archive, 'family-type')}
                      className="w-full rounded-2xl bg-surface-container-low p-3 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-safe text-xs font-black text-on-surface truncate">{archive.title}</p>
                        <span className="text-[10px] font-black text-primary shrink-0">{t('onboarding.refine', english ? 'Refine' : '微调')}</span>
                      </div>
                      <p className="text-safe text-[10px] font-bold text-on-surface-variant/50 mt-1">
                        {english
                          ? `${archive.scheduleSummary.childrenCount} children · ${archive.scheduleSummary.weeklyClassCount} fixed classes · ${archive.scheduleSummary.dailyPracticeCount} daily practices`
                          : `${archive.scheduleSummary.childrenCount}个孩子 · ${archive.scheduleSummary.weeklyClassCount}个固定课外班 · ${archive.scheduleSummary.dailyPracticeCount}个日常练习`}
                      </p>
                      {archive.scheduleSummary.riskHints[0] && (
                        <p className="text-safe text-[10px] font-bold text-amber-700/75 mt-1">
                          {archive.scheduleSummary.riskHints[0]}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 全新开始的引导文案 */}
            {!hasSaved && (
              <div className="text-center">
                <p className="text-sm text-on-surface-variant/60 px-4">
                  {t('onboarding.welcome_desc', english
                    ? 'Answer a few simple questions and AI will recommend practical tasks and habits for your family.'
                    : '通过几个简单的问题，AI 将为您推荐适合的任务和习惯，让孩子养成良好的生活规律')}
                </p>
              </div>
            )}

            {/* 继续按钮 — 紧跟描述文字下方 */}
            <div className="pt-6 pb-2 px-1">
              <button
                onClick={handleNext}
                className="w-full py-[18px] rounded-[2.5rem] bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 active:scale-[0.97] hover:bg-primary-container transition-all flex items-center justify-center gap-2"
              >
                {t('common.continue', english ? 'Continue' : '继续')} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        );
      }

      case 'family-type': {
        const adjustChildrenCount = (nextCount: number) => {
          setProfile(prev => {
            const count = Math.max(1, Math.min(4, nextCount));
            const children = prev.children.slice(0, count);
            while (children.length < count) {
              const childIndex = children.length;
              children.push({
                name: getDefaultChildName(childIndex),
                birthday: '',
                age: 8,
                gender: childIndex % 2 === 0 ? 'boy' : 'girl',
                avatar: getAvatarList(childIndex % 2 === 0 ? 'boy' : 'girl')[0],
                grade: '小学二年级',
                schoolTime: { start: '08:00', end: '16:00' },
                hasAfterSchool: false,
                afterSchoolActivities: [],
                customActivities: [],
                dailyPractices: [],
                customPractices: []
              });
            }
            return { ...prev, hasChildren: true, childrenCount: count, children };
          });
          setCurrentChildIndex(0);
        };

        return (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-black text-on-surface">{t('onboarding.family_profile_title', { defaultValue: od('家庭日常画像', 'Family daily picture') })}</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 mt-1">
                {t('onboarding.family_profile_desc', { defaultValue: od('只填影响日程安排的关键信息，之后可以在存档里继续微调。', 'Only add the details that affect scheduling. You can fine-tune them later in the saved profile.') })}
              </p>
            </div>

            <section className="bg-white rounded-3xl p-4 border border-outline-variant/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-on-surface">{t('onboarding.children_count_label', { defaultValue: od('孩子数量', 'Number of children') })}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/50">{t('onboarding.children_count_hint', { defaultValue: od('用于生成成员和任务分配', 'Used to create family members and assign tasks.') })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustChildrenCount(profile.childrenCount - 1)}
                    className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-2xl font-black text-primary w-8 text-center">{profile.childrenCount}</span>
                  <button
                    onClick={() => adjustChildrenCount(profile.childrenCount + 1)}
                    className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-on-surface mb-1">{t('onboarding.care_structure_label', { defaultValue: od('日常照看结构', 'Daily care setup') })}</p>
                <p className="text-[10px] font-bold text-on-surface-variant/50 mb-2">{t('onboarding.care_structure_hint', { defaultValue: od('会影响接送、陪作业、睡前流程和父母兑现提醒。', 'This affects pickup, homework support, bedtime routines, and parent promise reminders.') })}</p>
                <div className="grid grid-cols-1 gap-2">
                  {careStructureOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setProfile(prev => ({ ...prev, careStructure: option.id }))}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      profile.careStructure === option.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/10 bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    <span className="text-xs font-black text-on-surface">{option.label}</span>
                    <span className="block text-[10px] font-bold text-on-surface-variant/60 mt-0.5">{option.desc}</span>
                  </button>
                  ))}
                </div>
              </div>
            </section>

          </div>
        );
      }

      case 'children-count':
        return (
            <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {t('onboarding.how_many_children', { defaultValue: od('您有几个孩子？', 'How many children do you have?') })}
            </h2>
            <div className="flex items-center justify-center gap-6 py-8">
              <button
                onClick={() => {
                  if (profile.childrenCount > 1) {
                    setProfile(prev => ({ 
                      ...prev, 
                      childrenCount: prev.childrenCount - 1,
                      children: prev.children.slice(0, -1)
                    }));
                  }
                }}
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
              >
                <Minus size={24} />
              </button>
              <span className="text-5xl font-black text-primary w-16 text-center">
                {profile.childrenCount}
              </span>
              <button
                onClick={() => {
                  if (profile.childrenCount < 4) {
                    setProfile(prev => ({ 
                      ...prev, 
                      childrenCount: prev.childrenCount + 1,
                        children: [...prev.children, {
                          name: getDefaultChildName(prev.children.length),
                          birthday: '',
	                        age: 8,
                          gender: prev.children.length % 2 === 0 ? 'boy' : 'girl',
                          avatar: getAvatarList(prev.children.length % 2 === 0 ? 'boy' : 'girl')[0],
	                        grade: '小学二年级',
                        schoolTime: { start: '08:00', end: '16:00' },
                        hasAfterSchool: false,
                        afterSchoolActivities: [],
                        customActivities: [],
                        dailyPractices: [],
                        customPractices: []
                      }]
                    }));
                  }
                }}
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>
            <p className="text-center text-sm text-on-surface-variant">
              {t('onboarding.children_next_hint', { defaultValue: od('接下来我们会了解每个孩子的具体情况', 'Next, we will learn a little about each child.') })}
            </p>
          </div>
        );

      case 'child-details':
        const child = profile.children[currentChildIndex];
        const childGradeCandidates = getGradeCandidatesFromAge(child.age, child.grade);
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {profile.children[currentChildIndex]?.name
                ? t('onboarding.child_info_named', { defaultValue: od('{{name}} 的信息', '{{name}}’s information'), name: profile.children[currentChildIndex].name })
                : t('onboarding.child_info_index', { defaultValue: od('孩子 {{index}} 的信息', 'Child {{index}} information'), index: currentChildIndex + 1 })}
            </h2>
            <div className="flex justify-center gap-2 mb-4">
              {profile.children.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentChildIndex ? 'bg-primary' : 'bg-outline-variant/30'
                  }`}
                />
              ))}
            </div>

            {/* 头像选择器 */}
            <div className="flex justify-center relative">
              {/* 当前头像 - 点击打开选择器 */}
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border-3 border-primary shadow-lg active:scale-95 transition-all relative group"
              >
                {child.avatar ? (
                  <img 
                    src={child.avatar} 
                    alt={t('onboarding.avatar_alt_plain', { defaultValue: od('头像', 'Avatar') })}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-4xl">{child.gender === 'boy' ? '👦' : '👧'}</span>
                )}
                {/* 选择提示 */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">{t('onboarding.change_avatar_hint', { defaultValue: od('点击更换', 'Tap to change') })}</span>
                </div>
              </button>

              {/* 头像选择弹窗 */}
              <AnimatePresence>
                {showAvatarPicker && (
                  <>
                    {/* 遮罩层 */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/50 z-50"
                      onClick={() => setShowAvatarPicker(false)}
                    />
                    {/* 选择面板 */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="absolute top-32 left-1/2 -translate-x-1/2 z-50 w-[320px] bg-surface rounded-3xl p-4 shadow-2xl border border-outline-variant/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-on-surface">
                          {t('onboarding.choose_avatar_for', {
                            defaultValue: od('选择头像 · {{gender}}', 'Choose avatar · {{gender}}'),
                            gender: child.gender === 'boy'
                              ? t('common.boy', { defaultValue: od('男孩', 'Boy') })
                              : t('common.girl', { defaultValue: od('女孩', 'Girl') }),
                          })}
                        </h3>
                        <button
                          onClick={() => setShowAvatarPicker(false)}
                          className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto">
                        {getAvatarList(child.gender).map((avatarUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              updateChild(currentChildIndex, { avatar: avatarUrl });
                              setShowAvatarPicker(false);
                            }}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-90 ${
                              child.avatar === avatarUrl 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-transparent hover:border-outline-variant'
                            }`}
                          >
                            <img 
                              src={avatarUrl} 
                              alt={t('onboarding.avatar_alt', { index: idx + 1, defaultValue: od(`头像${idx + 1}`, `Avatar ${idx + 1}`) })}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* 名字 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant">{t('onboarding.child_name_label', { defaultValue: od('名字', 'Name') })}</label>
              <input
                value={child.name}
                onChange={(e) => updateChild(currentChildIndex, { name: e.target.value })}
                placeholder={t('onboarding.child_name_placeholder', { defaultValue: od('请输入孩子名字或昵称', 'Enter your child’s name or nickname') })}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
              />
              <p className="text-[10px] text-on-surface-variant/40">{t('onboarding.child_account_hint', { defaultValue: od('创建后将直接建立孩子的账户', 'An account will be created for this child.') })}</p>
            </div>

            {/* 生日 - 优先推断年龄和学段 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant">{t('onboarding.birthday_label', { defaultValue: od('生日', 'Birthday') })}</label>
              <input
                type="date"
                value={child.birthday || ''}
                onChange={(e) => {
                  const birthday = e.target.value;
                  const age = getAgeFromBirthday(birthday);
                  updateChild(currentChildIndex, {
                    birthday,
                    ...(age !== null ? {
                      age,
                      grade: getGradeFromAge(age),
                      avatar: getDefaultAvatar(child.gender, age),
                    } : {}),
                  });
                }}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
              />
              <p className="text-[10px] text-primary/70 font-bold">
                {child.birthday
                  ? t('onboarding.birthday_inferred', { defaultValue: od('已自动推断：{{age}}岁 · {{stage}}，下方只显示适龄年级候选。', 'Auto inferred: age {{age}} · {{stage}}. Suitable grade options are shown below.'), age: child.age, stage: getStageLabel(child.age) })
                  : t('onboarding.birthday_hint', { defaultValue: od('填写生日后，系统会自动推断年龄、学段和后续适龄选项。', 'After birthday is filled, age, stage, and suitable options will be inferred automatically.') })}
              </p>
            </div>

            {/* 年龄 - 自动推算年级 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant">{t('common.age', { defaultValue: od('年龄', 'Age') })}</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="18"
                  value={child.age}
                  onChange={(e) => {
                    const newAge = parseInt(e.target.value);
                    // 自动推算年级
                    const autoGrade = getGradeFromAge(newAge);
                    updateChild(currentChildIndex, { 
                      age: newAge,
                      grade: autoGrade,
                      avatar: getDefaultAvatar(child.gender, newAge),
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-2xl font-black text-primary w-12 text-center">
                  {child.age}<span className="text-sm">{t('common.years_old_suffix', { defaultValue: od('岁', 'y') })}</span>
                </span>
              </div>
            </div>

            {/* 性别 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant">{t('common.gender', { defaultValue: od('性别', 'Gender') })}</label>
              <div className="flex gap-3">
                {[
                  { id: 'boy', label: t('common.boy', { defaultValue: od('男孩', 'Boy') }), emoji: '👦' },
                  { id: 'girl', label: t('common.girl', { defaultValue: od('女孩', 'Girl') }), emoji: '👧' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => updateChild(currentChildIndex, { 
                      gender: option.id as any,
                      avatar: getDefaultAvatar(option.id as 'boy' | 'girl', child.age),
                    })}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                      child.gender === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/20 bg-surface-container'
                    }`}
                  >
                    <span className="text-2xl mr-2">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 年级（可自定义修改） */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant">
                {t('common.grade', { defaultValue: od('年级', 'Grade') })} <span className="text-on-surface-variant/40">{t('onboarding.grade_auto_hint_inline', { defaultValue: od('（已根据年龄自动推荐）', '(auto recommended by age)') })}</span>
              </label>
              <select
                value={child.grade}
                onChange={(e) => updateChild(currentChildIndex, { grade: e.target.value })}
                className="w-full p-3 rounded-xl bg-surface-container border-2 border-outline-variant/20 font-bold"
              >
                {childGradeCandidates.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'daily-schedule':
        const scheduleChild = profile.children[currentChildIndex];
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {profile.children[currentChildIndex]?.name
                ? t('onboarding.schedule_named', { defaultValue: od('{{name}} 的作息时间', '{{name}}’s daily schedule'), name: profile.children[currentChildIndex].name })
                : t('onboarding.schedule_index', { defaultValue: od('孩子 {{index}} 的作息时间', 'Child {{index}} schedule'), index: currentChildIndex + 1 })}
            </h2>
            <div className="flex justify-center gap-2 mb-4">
              {profile.children.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentChildIndex ? 'bg-primary' : 'bg-outline-variant/30'
                  }`}
                />
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-surface-container rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <School size={18} />
                  <span className="font-bold">{t('onboarding.school_time', { defaultValue: od('上学时间', 'School time') })}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-on-surface-variant/60">{t('onboarding.arrive_school', { defaultValue: od('到校', 'Arrive') })}</label>
                    <input
                      type="time"
                      value={scheduleChild.schoolTime.start}
                      onChange={(e) => updateChild(currentChildIndex, { 
                        schoolTime: { ...scheduleChild.schoolTime, start: e.target.value }
                      })}
                      className="w-full p-2 rounded-lg bg-surface font-bold"
                    />
                  </div>
                  <ArrowRight className="text-on-surface-variant/30" />
                  <div className="flex-1">
                    <label className="text-xs text-on-surface-variant/60">{t('onboarding.leave_school', { defaultValue: od('放学', 'Dismissal') })}</label>
                    <input
                      type="time"
                      value={scheduleChild.schoolTime.end}
                      onChange={(e) => updateChild(currentChildIndex, { 
                        schoolTime: { ...scheduleChild.schoolTime, end: e.target.value }
                      })}
                      className="w-full p-2 rounded-lg bg-surface font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-surface-container rounded-2xl">
                <input
                  type="checkbox"
                  id="hasAfterSchool"
                  checked={scheduleChild.hasAfterSchool}
                  onChange={(e) => updateChild(currentChildIndex, { hasAfterSchool: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-primary text-primary"
                />
                <label htmlFor="hasAfterSchool" className="font-bold text-on-surface">
                  有课外班/托管班
                </label>
              </div>
            </div>
          </div>
        );

      case 'activities':
        const activityChild = profile.children[currentChildIndex];
        const genderSpecificActivities = getActivityOptions(activityChild);
        
        // 按类别分组
        const groupedActivities = genderSpecificActivities.reduce((acc, act) => {
          if (!acc[act.category]) acc[act.category] = [];
          acc[act.category].push(act);
          return acc;
        }, {} as Record<string, typeof genderSpecificActivities>);
        
        const categoryNames: Record<string, string> = {
          sports: t('onboarding.activity_category.sports', { defaultValue: od('体育类', 'Sports') }),
          arts: t('onboarding.activity_category.arts', { defaultValue: od('艺术类', 'Arts') }),
          stem: t('onboarding.activity_category.stem', { defaultValue: od('STEM类', 'STEM') }),
          language: t('onboarding.activity_category.language', { defaultValue: od('语言类', 'Language') }),
        };

        // 合并预置和自定义活动，用于显示
        const allActivities = [...activityChild.afterSchoolActivities, ...activityChild.customActivities];
        
        const handleAddCustomActivity = () => {
          const act = customActivityInput.trim();
          if (act && !activityChild.customActivities.includes(act)) {
            updateChild(currentChildIndex, { customActivities: [...activityChild.customActivities, act] });
            setCustomActivityInput('');
          }
        };
        
        const handleRemoveCustomActivity = (act: string) => {
          updateChild(currentChildIndex, { customActivities: activityChild.customActivities.filter(a => a !== act) });
        };
        
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {profile.children[currentChildIndex]?.name
                ? t('onboarding.activities_named', { defaultValue: od('{{name}} 的课外活动', '{{name}}’s activities'), name: profile.children[currentChildIndex].name })
                : t('onboarding.activities_index', { defaultValue: od('孩子 {{index}} 的课外活动', 'Child {{index}} activities'), index: currentChildIndex + 1 })}
            </h2>
            <p className="text-center text-sm text-on-surface-variant">
              {activityChild.gender === 'boy'
                ? t('onboarding.recommended_for_boy', { defaultValue: od('👦 为男孩推荐', 'Suggested for boys') })
                : t('onboarding.recommended_for_girl', { defaultValue: od('👧 为女孩推荐', 'Suggested for girls') })} · {t('onboarding.choose_or_enter_activity', { defaultValue: od('选择或输入正在参加的活动', 'Choose or type activities your child currently joins') })}
            </p>
            <div className="flex justify-center gap-2 mb-4">
              {profile.children.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentChildIndex ? 'bg-primary' : 'bg-outline-variant/30'
                  }`}
                />
              ))}
            </div>
            
            {/* 自定义活动输入 */}
            <div className="bg-surface-container rounded-2xl p-3">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1 mb-2">
                <Plus size={12} /> {t('onboarding.custom_activity_label', { defaultValue: od('自定义活动（如有未列出的活动可手动添加）', 'Custom activities (add anything not listed)') })}
              </label>
              <div className="flex gap-2">
                <input
                  value={customActivityInput}
                  onChange={e => setCustomActivityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomActivity()}
                  placeholder={t('onboarding.custom_activity_placeholder', { defaultValue: od('输入活动名称，如：跆拳道、击剑...', 'Enter an activity, e.g. taekwondo, fencing...') })}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
                />
                <button
                  onClick={handleAddCustomActivity}
                  disabled={!customActivityInput.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
                >
                  {t('common.add', { defaultValue: od('添加', 'Add') })}
                </button>
              </div>
              {activityChild.customActivities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {activityChild.customActivities.map(act => (
                    <span key={act} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {act}
                      <button onClick={() => handleRemoveCustomActivity(act)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* 预置活动网格 */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {Object.entries(groupedActivities).map(([category, activities]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    {categoryNames[category] || category}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {activities.slice(0, 6).map(activity => {
                      const isSelected = activityChild.afterSchoolActivities.includes(activity.id);
                      return (
                        <button
                          key={activity.id}
                          onClick={() => {
                            const newActivities = isSelected
                              ? activityChild.afterSchoolActivities.filter(a => a !== activity.id)
                              : [...activityChild.afterSchoolActivities, activity.id];
                            updateChild(currentChildIndex, { afterSchoolActivities: newActivities });
                          }}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-outline-variant/20 bg-surface-container'
                          }`}
                        >
                          <activity.icon size={20} className={`mx-auto ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <p className={`text-xs font-bold mt-1 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                            {activity.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {allActivities.length > 0 && (
              <div className="bg-surface-container rounded-2xl p-3">
                <p className="text-xs font-bold text-on-surface-variant mb-1">
                  {t('onboarding.selected_activities_count', { defaultValue: od('已选活动（{{count}}项）', '{{count}} selected activities'), count: allActivities.length })}
                </p>
                <div className="flex flex-wrap gap-1">
                  {allActivities.map((act, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'holiday-schedule':
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {t('onboarding.holiday_change_title', { defaultValue: od('您的孩子有假期作息变化吗？', 'Does the holiday routine change?') })}
            </h2>
            <p className="text-center text-sm text-on-surface-variant">
              {t('onboarding.holiday_change_desc', { defaultValue: od('寒暑假、小长假期间日程会和平日不同，我们可以酌情推荐假期专属任务', 'During winter/summer breaks or short holidays, routines can differ from school days. We can suggest holiday-specific tasks when useful.') })}
            </p>
            
            {/* 是否有假期作息变化 */}
            <div className="flex items-center gap-3 p-4 bg-surface-container rounded-2xl">
              <input
                type="checkbox"
                id="hasHolidaySchedule"
                checked={profile.hasHolidaySchedule}
                onChange={(e) => setProfile(prev => ({ ...prev, hasHolidaySchedule: e.target.checked }))}
                className="w-5 h-5 rounded border-2 border-primary text-primary"
              />
              <label htmlFor="hasHolidaySchedule" className="font-bold text-on-surface">
                {t('onboarding.holiday_differs', { defaultValue: od('假期作息与平日不同', 'Holiday routine is different from school days') })}
              </label>
            </div>

            {profile.hasHolidaySchedule && (
              <div className="space-y-4">
                <div className="p-4 bg-surface-container rounded-2xl">
                  <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                    <Sun size={18} />
                    <span className="font-bold">{t('onboarding.holiday_rough_schedule', { defaultValue: od('假期大致作息', 'Holiday daily rhythm') })}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant/60">{t('onboarding.wake_up', { defaultValue: od('起床', 'Wake up') })}</label>
                      <input
                        type="time"
                        value={profile.holidayDaySchedule.start}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          holidayDaySchedule: { ...prev.holidayDaySchedule, start: e.target.value }
                        }))}
                        className="w-full p-2 rounded-lg bg-surface font-bold"
                      />
                    </div>
                    <ArrowRight className="text-on-surface-variant/30" />
                    <div className="flex-1">
                      <label className="text-xs text-on-surface-variant/60">{t('onboarding.bedtime', { defaultValue: od('就寝', 'Bedtime') })}</label>
                      <input
                        type="time"
                        value={profile.holidayDaySchedule.end}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          holidayDaySchedule: { ...prev.holidayDaySchedule, end: e.target.value }
                        }))}
                        className="w-full p-2 rounded-lg bg-surface font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-container rounded-2xl">
                  <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                    <CalendarRange size={18} />
                    <span className="font-bold">{t('onboarding.holiday_special_activities', { defaultValue: od('假期特别活动', 'Holiday activities') })}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['夏令营', '阅读打卡', '家务劳动', '创意手工', '运动打卡', '家庭旅行', '兴趣班'].map(act => {
                      const isSelected = profile.holidayCustomActivities.includes(act);
                      return (
                        <button
                          key={act}
                          onClick={() => {
                            const newActs = isSelected
                              ? profile.holidayCustomActivities.filter(a => a !== act)
                              : [...profile.holidayCustomActivities, act];
                            setProfile(prev => ({ ...prev, holidayCustomActivities: newActs }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-primary-surface text-primary-text'
                              : 'bg-surface text-on-surface-variant/60'
                          }`}
                        >
                          {act}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <section className="bg-white rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
              <h3 className="text-sm font-black text-on-surface mb-1">{t('onboarding.what_to_improve_first', { defaultValue: od('家长最想先改善什么？', 'What do you want to improve first?') })}</h3>
              <p className="text-[10px] font-bold text-on-surface-variant/50 mb-3">{t('onboarding.priority_pick_hint', { defaultValue: od('选 1-3 个即可，不选也可以继续。', 'Pick 1 to 3, or continue without choosing.') })}</p>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map(priority => {
                  const isSelected = profile.priorities.includes(priority.id);
                  return (
                    <button
                      key={priority.id}
                      onClick={() => {
                        const newPriorities = isSelected
                          ? profile.priorities.filter(p => p !== priority.id)
                          : [...profile.priorities, priority.id];
                        setProfile(prev => ({ ...prev, priorities: newPriorities }));
                      }}
                      className={`px-3 py-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline-variant/10 bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="mr-1">{priority.emoji}</span>
                      <span className="text-xs font-black">{priority.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
              <h3 className="text-sm font-black text-on-surface mb-2">
                {t('onboarding.add_one_sentence_title', { defaultValue: od('补充一句话', 'Add one sentence') })}
              </h3>
              <textarea
                value={profile.specialRequests}
                onChange={e => setProfile(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder={t('onboarding.special_request_short_placeholder', { defaultValue: od('例如：希望先把放学后到睡前的时间安排清楚；孩子写作业拖拉；周末想留出家庭活动时间。', 'Example: I want to organize after-school to bedtime first; homework takes too long; weekends should keep family time.') })}
                rows={3}
                className="w-full p-3 rounded-xl bg-surface-container text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors resize-none"
              />
            </section>

            <button
              onClick={saveProfileToLocal}
              className="w-full py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Save size={16} />
              {t('onboarding.save_archive_continue_later', { defaultValue: od('保存建档存档，稍后继续微调', 'Save this setup and refine later') })}
            </button>
          </div>
        );

      case 'priorities':
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-on-surface text-center">
              {t('onboarding.priorities_title', { defaultValue: od('您最看重哪些方面？', 'What matters most to you?') })}
            </h2>
            <p className="text-center text-sm text-on-surface-variant">
              {t('onboarding.priorities_subtitle', { defaultValue: od('选择 2-3 个优先级，AI 将据此推荐任务', 'Choose 2 to 3 priorities. AI will recommend tasks around them.') })}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {priorityOptions.map(priority => {
                const isSelected = profile.priorities.includes(priority.id);
                return (
                  <button
                    key={priority.id}
                    onClick={() => {
                      const newPriorities = isSelected
                        ? profile.priorities.filter(p => p !== priority.id)
                        : [...profile.priorities, priority.id];
                      setProfile(prev => ({ ...prev, priorities: newPriorities }));
                    }}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/20 bg-surface-container'
                    }`}
                  >
                    <span className="text-3xl">{priority.emoji}</span>
                    <p className={`font-bold mt-2 ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {priority.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'analyzing':
        const analyzingSteps = getAnalyzingSteps();
        const isAiWaiting = aiStatus === 'waiting';
        const isAiTimeout = aiStatus === 'timeout' || aiStatus === 'local-fallback';
        const isAiDone = aiStatus === 'done';

        return (
          <div className="text-center space-y-5 py-6">
            {/* 旋转图标 + 状态 */}
            <motion.div
              animate={isAiDone ? { scale: [1, 1.2, 1] } : { rotate: 360 }}
              transition={isAiDone ? { duration: 0.5 } : { duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isAiDone ? 'bg-green-100' : isAiTimeout ? 'bg-amber-100' : 'bg-primary/10'
              }`}
            >
              {isAiDone ? (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              ) : isAiTimeout ? (
                <Lightbulb className="w-10 h-10 text-amber-500" />
              ) : (
                <Sparkles className="w-10 h-10 text-primary" />
              )}
            </motion.div>

            <div>
              <h2 className="text-xl font-black text-on-surface mb-1">
                {isAiDone
                  ? t('onboarding.ai_done', { defaultValue: od('AI 分析完成！', 'AI analysis complete!') })
                  : isAiTimeout
                    ? t('onboarding.local_generating', { defaultValue: od('正在生成本地推荐...', 'Generating local suggestions...') })
                    : t('onboarding.ai_analyzing', { defaultValue: od('AI 正在分析...', 'AI is analyzing...') })}
              </h2>
              <p className="text-on-surface-variant font-bold text-sm">
                {isAiDone
                  ? t('onboarding.ai_done_desc', { defaultValue: od('已为您生成个性化任务建议', 'Personalized task suggestions are ready.') })
                  : isAiTimeout
                  ? t('onboarding.local_generating_desc', { defaultValue: od('基于孩子年龄和您的关注点智能推荐', 'Suggestions are based on age and family priorities.') })
                  : t('onboarding.ai_analyzing_desc', { defaultValue: od('正在调用 AI 模型分析家庭画像', 'Analyzing the family picture with AI.') })}
              </p>
            </div>

            {/* 等待进度条 + 计时器 */}
            {isAiWaiting && (
              <div className="mx-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">
                    {t('onboarding.waited_seconds', { defaultValue: od('已等待 ', 'Waited ') })}<span className="text-primary font-black">{aiElapsedSec}</span> {t('common.seconds', { defaultValue: od('秒', 's') })}
                  </span>
                  <span className={`font-black ${aiElapsedSec > 10 ? 'text-amber-500' : 'text-primary/50'}`}>
                    {aiElapsedSec <= 5
                      ? t('onboarding.connecting', { defaultValue: od('连接中...', 'Connecting...') })
                      : aiElapsedSec <= 10
                        ? t('onboarding.ai_thinking', { defaultValue: od('AI 思考中...', 'AI is thinking...') })
                        : t('onboarding.response_slow', { defaultValue: od('响应较慢...', 'Taking longer than usual...') })}
                  </span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${aiElapsedSec > 12 ? 'bg-amber-400' : 'bg-primary'}`}
                    animate={{ width: `${Math.min((aiElapsedSec / 15) * 100, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {/* 跳过按钮 */}
                <button
                  onClick={() => {
                    // 用户手动跳过：直接用本地规则
                    setAiStatus('timeout');
                    showToastGlobal(t('onboarding.switched_to_local', { defaultValue: od('已切换为本地智能推荐', 'Switched to local smart suggestions.') }), 'info');
                    clearInterval(undefined); // timerInterval 在外部，通过状态触发
                    const localTasks = generateLocalRecommendations();
                    setRecommendations(localTasks);
                    setSelectedRecommendations(new Set(localTasks.map(t => t.id)));
                    setIsGenerating(false);
                    setCurrentStep('recommendations');
                  }}
                  disabled={!isAiWaiting}
                  className={`w-full py-2 rounded-xl font-bold text-xs transition-all border ${
                    isAiWaiting
                      ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 active:scale-95'
                      : 'text-gray-300 bg-gray-50 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  {t('onboarding.skip_to_local', { defaultValue: od('跳过等待，使用本地推荐', 'Skip and use local suggestions') })}
                </button>
              </div>
            )}

            {/* 超时提示 */}
            {isAiTimeout && (
              <div className="mx-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[11px] text-amber-700 font-bold">
                  {t('onboarding.ai_timeout_local_desc', { defaultValue: od('AI 服务响应超时，已自动切换为本地智能推荐引擎（同样会结合孩子年龄、作息时间等生成个性化建议）', 'AI response timed out, so local smart suggestions were used instead. They still consider age, schedule, and family priorities.') })}
                </p>
              </div>
            )}

            {/* 分析维度卡片 */}
            <div className="bg-surface-container rounded-2xl p-4 mx-4 text-left">
              <h3 className="text-sm font-bold text-on-surface-variant mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-primary" />
                {t('onboarding.analysis_dimensions', { defaultValue: od('分析维度', 'Analysis dimensions') })}
              </h3>
              <div className="space-y-2">
                {analyzingSteps.map((step, idx) => (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15, duration: 0.3 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${step.key === 'ai' ? (isAiDone ? 'text-green-500' : isAiTimeout ? 'text-amber-500' : 'text-primary/40 animate-pulse') : 'text-primary'}`} />
                    <div>
                      <span className="font-bold text-on-surface">{step.label}</span>
                      {step.key === 'ai' ? (
                        <p className="text-xs text-on-surface-variant">
                          {isAiDone
                            ? t('onboarding.ai_recommendation_done', { defaultValue: od('AI 推荐已完成 ✓', 'AI suggestions complete') })
                            : isAiTimeout
                              ? t('onboarding.local_engine_used', { defaultValue: od('已切换为本地推荐引擎', 'Local suggestion engine used') })
                              : t('onboarding.waiting_with_seconds', { defaultValue: od('等待中 ({{seconds}}s)...', 'Waiting ({{seconds}}s)...'), seconds: aiElapsedSec })}
                        </p>
                      ) : (
                        <p className="text-xs text-on-surface-variant">{step.detail}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'recommendations': {
        const allSelected = recommendations.filter(t => selectedRecommendations.has(t.id));
        const selectedTasks = allSelected.filter(t => t.type !== 'habit');
        const selectedHabits = allSelected.filter(t => t.type === 'habit');
        const taskList = recommendations.filter(t => t.type !== 'habit');
        const habitList = recommendations.filter(t => t.type === 'habit');

        // 渲染单个任务卡片
        const renderTaskCard = (task: RecommendedTask) => {
          const isSelected = selectedRecommendations.has(task.id);
          return (
            <motion.button
              key={task.id}
              onClick={() => toggleRecommendation(task.id)}
              whileTap={{ scale: 0.97 }}
              className={`w-full p-4 rounded-3xl border text-left transition-all ${
                isSelected
                  ? 'border-primary/30 bg-white shadow-sm'
                  : 'border-outline-variant/10 bg-surface-container opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* 左侧图标容器 */}
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                  isSelected ? 'bg-primary-surface' : 'bg-surface-container-high'
                }`}>
                  {task.icon === 'BookOpen' && <BookOpen size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                  {task.icon === 'Sparkles' && <Sparkles size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                  {task.icon === 'GraduationCap' && <GraduationCap size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                  {task.icon === 'Clock' && <Clock size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                  {task.icon === 'Music' && <Music size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                  {task.icon === 'Dumbbell' && <Dumbbell size={22} className={isSelected ? 'text-green-700' : 'text-on-surface-variant'} />}
                </div>

                {/* 中间内容区 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-[15px] ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {task.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-surface/50 text-amber-text text-[10px] font-black">
                      +{task.rewardStars}⭐
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 line-clamp-2 ${isSelected ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
                    {task.description}
                  </p>
                  {task.suggestedTime && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-primary-surface/30 text-primary-text text-[10px] font-bold">
                      <Clock size={10} />
                      {task.suggestedTime}
                    </span>
                  )}
                </div>

                {/* 右侧选中指示 */}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  isSelected ? 'bg-primary border-primary shadow-sm shadow-primary/20' : 'border-outline-variant'
                }`}>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                      <CheckCircle2 size={15} className="text-white" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        };

        // 渲染习惯卡片
        const renderHabitCard = (habit: RecommendedTask) => {
          const isSelected = selectedRecommendations.has(habit.id);
          return (
            <motion.button
              key={habit.id}
              onClick={() => toggleRecommendation(habit.id)}
              whileTap={{ scale: 0.97 }}
              className={`w-full p-4 rounded-3xl border text-left transition-all ${
                isSelected
                  ? 'border-purple-300 bg-purple-50/40 shadow-sm'
                  : 'border-outline-variant/10 bg-surface-container opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* 左侧图标 - 紫色系 */}
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                  isSelected ? 'bg-purple-surface' : 'bg-surface-container-high'
                }`}>
                  <Sparkles size={22} className={isSelected ? 'purple-text' : 'text-on-surface-variant'} />
                </div>

                {/* 中间内容区 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-[15px] ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {habit.title}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-surface text-purple-text text-[10px] font-black flex items-center gap-0.5">
                      +{habit.rewardStars}⭐ · 21天
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 line-clamp-2 ${isSelected ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
                    {habit.description}
                  </p>
                </div>

                {/* 右侧选中指示 - 紫色 */}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  isSelected ? 'bg-purple-500 border-purple-500 shadow-sm shadow-purple-200' : 'border-outline-variant'
                }`}>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                      <CheckCircle2 size={15} className="text-white" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        };

        return (
          <div className="space-y-6">
            {/* 页面标题 */}
            <div className="text-center pt-2 pb-1">
              <h2 className="text-xl font-black text-on-surface tracking-tight text-primary">
                {t('onboarding.select_needed_items', { defaultValue: od('选择您需要的项目（可多选）', 'Choose what you need') })}
              </h2>
            </div>

            {/* 📋 每日任务区块 */}
            {taskList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    <Target size={14} className="text-primary" />
                    每日任务
                  </h3>
                  <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                    {selectedTasks.length}/{taskList.length}
                  </span>
                </div>
                <div className="space-y-2.5 pr-1">
                  {taskList.map((task) => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* ✨ 养成习惯区块 */}
            {habitList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant">
                    <Sparkles size={14} className="text-purple-500" />
                    养成习惯
                  </h3>
                  <span className="text-[11px] font-bold bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full">
                    {selectedHabits.length}/{habitList.length}
                  </span>
                </div>
                <div className="space-y-2.5 pr-1">
                  {habitList.map((habit) => renderHabitCard(habit))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'preview': {
        const selectedItems = recommendations.filter(t => selectedRecommendations.has(t.id));
        const taskItems = selectedItems.filter(t => t.type !== 'habit');
        const habitItems = selectedItems.filter(t => t.type === 'habit');
        const totalStars = selectedItems.reduce((s, t) => s + t.rewardStars, 0);
        const allWeeklyClasses = profile.children.flatMap(c =>
          [...(c.afterSchoolActivities || []), ...(c.customActivities || [])]
        );
        const allDailyPractices = profile.children.flatMap(c =>
          [...(c.dailyPractices || []), ...(c.customPractices || [])]
        );
        const fixedClassSetupCount = buildFixedClassSetupSuggestions(profile).length;
        const importSummary = buildOnboardingImportSummary(profile, selectedItems);
        // 家庭名称：用孩子名字拼接
        const familyName = profile.children.map(c => c.name).join('、');
        return (
          <div className="space-y-4 pb-4">
            {/* 顶部：家庭成员 */}
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-4 sm:p-5 text-white">
              <h2 className="text-safe text-xl sm:text-2xl font-black">{familyName}的家</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.children.map((c, i) => (
                  <div key={i} className="min-w-0 flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg">{c.gender === 'boy' ? '👦' : '👧'}</span>
                    )}
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-black">{c.name}</span>
                      <span className="text-[10px] text-white/70 ml-1">{c.age}岁 · {c.grade}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary-container rounded-2xl p-4 shadow-sm border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/75 text-primary flex items-center justify-center shrink-0">
                  <CalendarRange size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-safe text-sm font-black text-primary-text">{importSummary.planName}</h3>
                  <p className="text-safe text-[11px] font-bold text-primary-text/65 leading-relaxed mt-1">
                    {t('onboarding.import_summary_desc', { defaultValue: od('导入后会作为一条计划保存，任务、习惯、课外班占位和心愿都会关联到这次建档方案，后续可在计划页和家庭复盘里继续追踪。', 'After import, this will be saved as a plan. Tasks, habits, class placeholders, and wishes will be linked to this setup and can be tracked later.') })}
                  </p>
                  {importSummary.nextStepHints.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {importSummary.nextStepHints.slice(0, 3).map(hint => (
                        <span key={hint} className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black text-primary">
                          {hint}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 日程概览 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
              <h3 className="font-black text-sm text-on-surface mb-2 flex items-center gap-2">
                <Clock size={14} /> {t('onboarding.routine_overview', { defaultValue: od('作息概览', 'Routine overview') })}
              </h3>
              {profile.children.map((c, idx) => (
                <div key={idx} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-outline-variant/10' : ''}`}>
                  <p className="text-xs font-bold text-on-surface-variant mb-1.5">{c.name || t('onboarding.child_index', { defaultValue: od('孩子 {{index}}', 'Child {{index}}'), index: idx + 1 })}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant/50">{t('onboarding.school_time', { defaultValue: od('上学时间', 'School time') })}</p>
                      <p className="text-sm font-black">{c.schoolTime.start}-{c.schoolTime.end}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-bold text-on-surface-variant/50">{t('onboarding.bedtime', { defaultValue: od('就寝时间', 'Bedtime') })}</p>
                      <p className="text-sm font-black">{c.schoolTime.start >= '08:00' ? '21:00' : '21:30'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {allWeeklyClasses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant/40 mb-1">{t('onboarding.weekly_fixed_classes', { defaultValue: od('每周固定课外班', 'Weekly fixed classes') })}</p>
                  <div className="flex flex-wrap gap-1">
                    {allWeeklyClasses.map((act, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary text-[10px] font-bold">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {allDailyPractices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 mr-1">{t('onboarding.daily_practice_label', { defaultValue: od('日常练习：', 'Daily practice:') })}</span>
                  {allDailyPractices.map((act, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                      {act}
                    </span>
                  ))}
                </div>
              )}
              {profile.priorities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] font-bold text-on-surface-variant/40 mr-1">{t('onboarding.priority_label', { defaultValue: od('关注重点：', 'Focus:') })}</span>
                  {profile.priorities.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                      {({
                        study: od('📚学习', 'Study'),
                        health: od('💪健康', 'Health'),
                        housework: od('🧹家务', 'Housework'),
                        social: od('🤝社交', 'Social'),
                        hobby: od('🎨兴趣', 'Hobbies'),
                        responsibility: od('⭐责任', 'Responsibility'),
                      }[p] || p)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 📋 任务列表 */}
            {taskItems.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-black text-sm text-on-surface flex min-w-0 items-center gap-2">
                    <Target size={14} /> {t('onboarding.daily_tasks_title', { defaultValue: od('每日任务', 'Daily tasks') })}
                  </h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {t('onboarding.task_count', { defaultValue: od('{{count}} 个任务', '{{count}} tasks'), count: taskItems.length })}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {taskItems.map((task, i) => (
                    <div key={task.id} className="flex items-start gap-2 bg-surface-container-low rounded-xl p-2.5">
                      <span className="text-xs font-black text-primary w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="text-safe text-xs font-black text-on-surface">{task.title}</span>
                          <span className="shrink-0 text-[10px] text-amber-600 font-bold">+{task.rewardStars}⭐</span>
                        </div>
                        {task.suggestedTime && (
                          <span className="text-[10px] text-primary font-bold block">{task.suggestedTime}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant/40 px-1.5 py-0.5 rounded bg-surface-container">
                        {task.type === 'weekly' ? t('common.weekly', { defaultValue: od('每周', 'Weekly') }) : t('common.daily', { defaultValue: od('每日', 'Daily') })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✨ 习惯列表 */}
            {habitItems.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-black text-sm text-on-surface flex min-w-0 items-center gap-2">
                    <Sparkles size={14} /> {t('onboarding.habits_title', { defaultValue: od('养成习惯', 'Habits') })}
                  </h3>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                    {t('onboarding.habit_count', { defaultValue: od('{{count}} 个习惯', '{{count}} habits'), count: habitItems.length })}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                  {habitItems.map((habit, i) => (
                    <div key={habit.id} className="flex items-start gap-2 bg-purple-50/50 rounded-xl p-2.5">
                      <span className="text-xs font-black text-purple-600 w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="text-safe text-xs font-black text-on-surface">{habit.title}</span>
                          <span className="shrink-0 text-[10px] text-amber-600 font-bold">+{habit.rewardStars}⭐</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-1">{habit.description}</p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 px-1.5 py-0.5 rounded-full bg-purple-100">
                        21天
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🎁 心愿推荐（根据年龄自动生成） */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-black text-sm text-on-surface flex min-w-0 items-center gap-2">
                  {t('onboarding.wish_recommendations', { defaultValue: od('心愿推荐', 'Wish ideas') })}
                </h3>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  {t('onboarding.generated_by_interests', { defaultValue: od('根据孩子兴趣生成', 'Based on child interests') })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  // 根据年龄和兴趣生成心愿建议
                  const wishIdeas: Array<{ name: string; cost: number; icon: string; desc: string }> = [];
                  for (const child of profile.children) {
                    const acts = [
                      ...(child.afterSchoolActivities || []),
                      ...(child.customActivities || []),
                      ...(child.dailyPractices || []),
                      ...(child.customPractices || []),
                    ];
                    if (child.age <= 6) {
                      wishIdeas.push(
                        { name: `${child.name}想要的玩具`, cost: 20, icon: '🧸', desc: '完成7天任务可兑换' },
                        { name: '去游乐场玩一天', cost: 30, icon: '🎡', desc: '周末亲子时光' },
                        { name: '选一本新绘本', cost: 15, icon: '📖', desc: '阅读奖励' },
                        { name: '多看30分钟动画', cost: 10, icon: '📺', desc: '娱乐放松' },
                      );
                    } else if (child.age <= 12) {
                      wishIdeas.push(
                        { name: `${child.name}的新文具套装`, cost: 25, icon: '✏️', desc: '学习用品' },
                        { name: '选择周末去哪玩', cost: 35, icon: '🎢', desc: '自主决策奖励' },
                        { name: '买一套乐高积木', cost: 50, icon: '🧱', desc: acts.includes('编程') ? 'STEM兴趣培养' : '动手能力' },
                        { name: '游戏时间+1小时', cost: 20, icon: '🎮', desc: '适度娱乐' },
                      );
                    } else {
                      wishIdeas.push(
                        { name: `${child.name}想要的新装备`, cost: 60, icon: '🎧', desc: '运动/数码装备' },
                        { name: '和朋友出去聚会', cost: 40, icon: '🍕', desc: '社交奖励' },
                        { name: '购买喜欢的书籍', cost: 25, icon: '📚', desc: '知识投资' },
                        { name: '增加零花钱', cost: 30, icon: '💰', desc: '理财教育' },
                      );
                    }
                    // 根据兴趣定制
                    if (acts.some(a => ['绘画', '绘画练习', '书法', '练字'].includes(a))) {
                      wishIdeas.push({ name: '新的画具套装', cost: 35, icon: '🎨', desc: '艺术创作支持' });
                    }
                    if (acts.some(a => ['游泳', '足球', '篮球', '跑步', '跳绳', '运动打卡', '羽毛球', '武术', '体操'].includes(a))) {
                      wishIdeas.push({ name: '运动装备一件', cost: 30, icon: '⚽', desc: '运动支持' });
                    }
                    if (acts.some(a => ['钢琴', '练琴', '舞蹈', '主持'].includes(a))) {
                      wishIdeas.push({ name: '演出门票一张', cost: 45, icon: '🎭', desc: '艺术欣赏' });
                    }
                  }
                  // 去重并限制数量
                  const seen = new Set<string>();
                  return wishIdeas.filter(w => { if (seen.has(w.name)) return false; seen.add(w.name); return true; }).slice(0, 6);
                })().map((wish, i) => (
                  <div key={i} className="bg-orange-50/60 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-xl">{wish.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-on-surface truncate">{wish.name}</p>
                      <p className="text-safe text-[10px] text-on-surface-variant">{wish.desc}</p>
                    </div>
                    <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {wish.cost}⭐
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 特别需求输入框 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10">
              <h3 className="font-black text-sm text-on-surface flex items-center gap-2 mb-2">
                <Lightbulb size={14} className="text-primary" /> {t('onboarding.other_needs_title', { defaultValue: od('还有其他需求？', 'Anything else?') })}
              </h3>
              <p className="text-[10px] text-on-surface-variant/60 mb-2">
                {t('onboarding.other_needs_desc', { defaultValue: od('在这里补充您的特殊需求，AI将据此优化推荐（如：孩子有过敏、需要特别注意某方面等）', 'Add any special needs here so AI can improve the recommendations.') })}
              </p>
              <textarea
                value={profile.specialRequests}
                onChange={e => setProfile(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder={t('onboarding.other_needs_placeholder', { defaultValue: od('例如：孩子对花粉过敏、希望加强数学方面的练习、家里有宠物需要帮忙照顾...', 'Example: pollen allergy, more math practice, help caring for a pet...') })}
                rows={3}
                className="w-full p-3 rounded-xl bg-surface-container text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* 底部确认 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                className="w-full px-4 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-black text-sm sm:text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-center"
              >
                <CheckCircle2 size={20} />
                <span className="text-safe">
                  {t('onboarding.confirm_import_summary', {
                    children: profile.children.length,
                    tasks: taskItems.length,
                    habits: habitItems.length,
                    fixedClasses: fixedClassSetupCount,
                    defaultValue: od(
                      `确认导入 · ${profile.children.length}个孩子 · ${taskItems.length}任务 · ${habitItems.length}习惯 · ${fixedClassSetupCount}课外班占位 · 心愿`,
                      `Confirm import · ${profile.children.length} children · ${taskItems.length} tasks · ${habitItems.length} habits · ${fixedClassSetupCount} class slots · wishes`
                    )
                  })}
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={saveProfileToLocal}
                  className="py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Save size={16} />
                  {t('onboarding.save_settings', { defaultValue: od('保存设置', 'Save settings') })}
                </button>
                <button
                  onClick={retryAIRecommendations}
                  disabled={retryingAI}
                  className="py-3 rounded-2xl bg-amber-50 text-amber-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  {retryingAI ? t('common.retrying', { defaultValue: od('正在重试...', 'Retrying...') }) : t('onboarding.regenerate_ai', { defaultValue: od('重新AI生成', 'Regenerate with AI') })}
                </button>
              </div>
              <button
                onClick={() => setCurrentStep('recommendations')}
                className="w-full py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm"
              >
                {t('onboarding.back_to_adjust_recommendations', { defaultValue: od('返回调整推荐内容', 'Back to adjust recommendations') })}
              </button>
            </div>
          </div>
        );
      }

      case 'success':
        return (
          <div className="text-center space-y-6 py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-black text-on-surface mb-2">
                {t('onboarding.setup_complete', { defaultValue: od('设置完成！🎉', 'Setup complete!') })}
              </h2>
              <p className="text-on-surface-variant font-bold">
                {t('onboarding.setup_complete_desc', { defaultValue: od('已创建 {{count}} 个孩子账户，并生成 AI 建档方案', '{{count}} child profiles created and AI setup plan generated'), count: profile.children.length })}
              </p>
            </div>
            <div className="p-4 bg-surface-container rounded-2xl mx-4">
              <p className="text-sm text-on-surface-variant">
                {t('onboarding.setup_complete_tip', { defaultValue: od('提示：接下来可以先补全课外班具体时间，再用周报观察孩子一周适应情况。', 'Tip: Next, fill in exact class times and use the weekly report to observe how the child adapts.') })}
              </p>
            </div>
            {/* 前往首页按钮 */}
            <div className="px-6 pt-4 space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 rounded-[2.5rem] bg-gradient-to-r from-primary to-primary-container text-white font-black text-base shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Home size={20} />
                {t('onboarding.start_using', { defaultValue: od('开始使用', 'Start using') })}
              </button>
              <button
                onClick={() => navigate('/plans')}
                className="w-full py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
              >
                {t('onboarding.view_setup_plan', { defaultValue: od('查看建档方案', 'View setup plan') })}
              </button>
              <button
                onClick={() => navigate('/reports?period=week')}
                className="w-full py-3 rounded-2xl bg-surface-container text-on-surface-variant font-bold text-sm active:scale-95 transition-all"
              >
                {t('onboarding.view_weekly_report', { defaultValue: od('查看家庭周报', 'View family weekly report') })}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // AI分析步骤展示的维度信息
  const getAnalyzingSteps = () => [
    { key: 'age', label: '年龄与阶段分析', detail: profile.children.map(c => `${c.age}岁 · ${c.grade}`).join('、') },
    { key: 'school', label: '作息时间分析', detail: `上学 ${profile.children[0]?.schoolTime.start}-${profile.children[0]?.schoolTime.end}` },
    { key: 'activities', label: '固定课外班分析', detail: profile.children.some(c => (c.afterSchoolActivities || []).length > 0 || (c.customActivities || []).length > 0) ? profile.children.flatMap(c => [...(c.afterSchoolActivities || []), ...(c.customActivities || [])]).join('、') : '暂无固定课外班' },
    { key: 'practices', label: '日常练习分析', detail: profile.children.some(c => (c.dailyPractices || []).length > 0 || (c.customPractices || []).length > 0) ? profile.children.flatMap(c => [...(c.dailyPractices || []), ...(c.customPractices || [])]).join('、') : '暂无日常练习' },
    { key: 'priorities', label: '家长关注重点', detail: profile.priorities.map(p => ({ study: '学习习惯', health: '健康生活', housework: '家务劳动', social: '社交能力', hobby: '兴趣培养', responsibility: '责任心' }[p] || p)).join('、') },
    { key: 'ai', label: 'AI 智能推荐', detail: '正在调用 MiniMax 生成个性化建议...' },
  ];

  // 判断是否显示底部按钮
  const showBottomButtons = !['analyzing', 'success', 'preview', 'welcome'].includes(currentStep);
  const progressIndex = PROGRESS_STEPS.indexOf(currentStep);
  const progressPercent = progressIndex >= 0 ? ((progressIndex + 1) / PROGRESS_STEPS.length) * 100 : 0;
  const canProceed = () => {
    switch (currentStep) {
      case 'recommendations':
        return selectedRecommendations.size > 0;
      default:
        return true;
    }
  };

  return (
    <div className="ui-ai-subpage min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl">
        {currentStep !== 'welcome' && currentStep !== 'success' ? (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
        
        {/* 进度条 */}
        {currentStep !== 'welcome' && currentStep !== 'success' && currentStep !== 'analyzing' && (
          <div className="flex-1 mx-4">
            <div className="h-1 bg-surface-container rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
        
        {currentStep !== 'success' ? (
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:scale-95"
          >
            <X size={20} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 pb-56">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentStep}-${CHILD_INDEXED_STEPS.has(currentStep) ? currentChildIndex : 'single'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {!['welcome', 'analyzing', 'recommendations', 'preview', 'success'].includes(currentStep) && renderGuidedDialogueCard()}

      {/* Bottom Buttons */}
      {showBottomButtons && (
        <div className="sticky bottom-0 z-30 w-full max-w-md mx-auto p-4 bottom-action-bar space-y-3 bg-background/90 backdrop-blur-xl border-t border-outline-variant/10">
          {currentStep === 'recommendations' ? (
            <>
              <button
                onClick={() => setCurrentStep('preview')}
                disabled={!canProceed()}
                className="w-full px-4 py-4 rounded-[2.5rem] bg-primary text-white font-black text-base sm:text-lg shadow-xl shadow-primary/20 disabled:opacity-40 active:scale-[0.97] hover:bg-primary-container transition-all flex items-center justify-center gap-2 text-center"
              >
                <CheckCircle2 size={20} />
                <span className="text-safe">{t('onboarding.ai_recommend_settings_count', { defaultValue: od('AI推荐设置 ({{count}}个任务)', 'AI recommendations ({{count}} tasks)'), count: selectedRecommendations.size })}</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-full bg-surface-container text-on-surface-variant font-bold shadow-sm active:scale-95 transition-all"
              >
                {t('onboarding.skip_set_later', { defaultValue: od('跳过，稍后自行设置', 'Skip and set later') })}
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full px-4 py-4 rounded-[2.5rem] bg-primary text-white font-black text-base sm:text-lg shadow-xl shadow-primary/20 disabled:opacity-40 active:scale-[0.97] hover:bg-primary-container transition-all flex items-center justify-center gap-2 text-center"
            >
              {(['child-details', 'daily-schedule', 'activities'].includes(currentStep) && 
                currentChildIndex < profile.childrenCount - 1) ? (
                <><span className="text-safe">{t('onboarding.next_child', { defaultValue: od('下一个：{{name}}', 'Next: {{name}}'), name: profile.children[currentChildIndex + 1]?.name || t('onboarding.child_index', { defaultValue: od('孩子 {{index}}', 'Child {{index}}'), index: currentChildIndex + 2 }) })}</span> <ArrowRight size={20} /></>
              ) : (
                <><span>{t('common.continue', { defaultValue: od('继续', 'Continue') })}</span> <ArrowRight size={20} /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Preview Button (Success 步骤已在内容区内置按钮，无需底部重复) */}
      {currentStep === 'preview' && (
        <div className="sticky bottom-0 z-30 w-full max-w-md mx-auto p-4 bottom-action-bar bg-background/90 backdrop-blur-xl border-t border-outline-variant/10">
          <button
            onClick={() => {
              // 确认创建所有推荐任务后进入预览完成
              navigate('/');
            }}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black shadow-lg active:scale-[0.98] transition-all"
          >
            {t('onboarding.finish_setup', { defaultValue: od('完成设置', 'Finish setup') })}
          </button>
        </div>
      )}
    </div>
  );
}
