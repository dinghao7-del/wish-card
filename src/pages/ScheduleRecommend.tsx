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
  buildScheduleOptimizationSkill,
  sanitizeChildProfileForScheduleStage,
} from '../lib/scheduleRecommendAI';
import { getRecommendationConsent, type RecommendationConsentState } from '../lib/recommendationConsent';
import { recordRecommendationEvent } from '../lib/recommendationEvents';
import { toAgeRange, toGradeBand } from '../lib/communityShare';
import { getDataLayer } from '../lib/DataLayer';
import { showToastGlobal } from '../components/Toast';
import { saveGuestPlan } from '../lib/guestPlans';
import { buildPlanExecutionTaskBundle, buildUiTaskFromDraft } from '../lib/planExecutionTasks';
import { localeCountText, localeText } from '../lib/localeText';

// ==================== 常量 ====================

const GRADE_OPTIONS = [
  '幼儿园小班', '幼儿园中班', '幼儿园大班',
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三',
  '高一', '高二', '高三',
];

const PERSONALITY_OPTIONS = [
  '外向活泼', '内向文静', '好动坐不住', '专注力好',
  '胆小谨慎', '勇于尝试', '敏感细腻', '大大咧咧',
  '喜欢社交', '喜欢独处', '争强好胜', '随和佛系',
  '动手能力强', '语言表达好', '逻辑思维强', '想象力丰富',
];

const CITY_OPTIONS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉',
  '南京', '西安', '重庆', '长沙', '苏州', '天津', '郑州',
  '东莞', '青岛', '沈阳', '宁波', '昆明', '其他',
];

const GRADE_LABEL_EN: Record<string, string> = {
  '幼儿园小班': 'Kindergarten K1',
  '幼儿园中班': 'Kindergarten K2',
  '幼儿园大班': 'Kindergarten K3',
  '一年级': 'Grade 1',
  '二年级': 'Grade 2',
  '三年级': 'Grade 3',
  '四年级': 'Grade 4',
  '五年级': 'Grade 5',
  '六年级': 'Grade 6',
  '初一': 'Grade 7',
  '初二': 'Grade 8',
  '初三': 'Grade 9',
  '高一': 'Grade 10',
  '高二': 'Grade 11',
  '高三': 'Grade 12',
};

const GRADE_LABEL_MULTI: Record<string, Record<string, string>> = {
  '幼儿园小班': { 'ja-JP': '年少', 'ko-KR': '유치원 만 3세', 'es-ES': 'Infantil 3 años', 'fr-FR': 'Maternelle petite section' },
  '幼儿园中班': { 'ja-JP': '年中', 'ko-KR': '유치원 만 4세', 'es-ES': 'Infantil 4 años', 'fr-FR': 'Maternelle moyenne section' },
  '幼儿园大班': { 'ja-JP': '年長', 'ko-KR': '유치원 만 5세', 'es-ES': 'Infantil 5 años', 'fr-FR': 'Maternelle grande section' },
  '一年级': { 'ja-JP': '小学1年', 'ko-KR': '초1', 'es-ES': '1.º primaria', 'fr-FR': 'CP' },
  '二年级': { 'ja-JP': '小学2年', 'ko-KR': '초2', 'es-ES': '2.º primaria', 'fr-FR': 'CE1' },
  '三年级': { 'ja-JP': '小学3年', 'ko-KR': '초3', 'es-ES': '3.º primaria', 'fr-FR': 'CE2' },
  '四年级': { 'ja-JP': '小学4年', 'ko-KR': '초4', 'es-ES': '4.º primaria', 'fr-FR': 'CM1' },
  '五年级': { 'ja-JP': '小学5年', 'ko-KR': '초5', 'es-ES': '5.º primaria', 'fr-FR': 'CM2' },
  '六年级': { 'ja-JP': '小学6年', 'ko-KR': '초6', 'es-ES': '6.º primaria', 'fr-FR': '6e' },
  '初一': { 'ja-JP': '中学1年', 'ko-KR': '중1', 'es-ES': '1.º ESO', 'fr-FR': '5e' },
  '初二': { 'ja-JP': '中学2年', 'ko-KR': '중2', 'es-ES': '2.º ESO', 'fr-FR': '4e' },
  '初三': { 'ja-JP': '中学3年', 'ko-KR': '중3', 'es-ES': '3.º ESO', 'fr-FR': '3e' },
  '高一': { 'ja-JP': '高校1年', 'ko-KR': '고1', 'es-ES': '1.º bachillerato', 'fr-FR': '2nde' },
  '高二': { 'ja-JP': '高校2年', 'ko-KR': '고2', 'es-ES': '2.º bachillerato', 'fr-FR': '1re' },
  '高三': { 'ja-JP': '高校3年', 'ko-KR': '고3', 'es-ES': 'Último año', 'fr-FR': 'Terminale' },
};

const CITY_LABEL_EN: Record<string, string> = {
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '广州': 'Guangzhou',
  '深圳': 'Shenzhen',
  '杭州': 'Hangzhou',
  '成都': 'Chengdu',
  '武汉': 'Wuhan',
  '南京': 'Nanjing',
  '西安': "Xi'an",
  '重庆': 'Chongqing',
  '长沙': 'Changsha',
  '苏州': 'Suzhou',
  '天津': 'Tianjin',
  '郑州': 'Zhengzhou',
  '东莞': 'Dongguan',
  '青岛': 'Qingdao',
  '沈阳': 'Shenyang',
  '宁波': 'Ningbo',
  '昆明': 'Kunming',
  '其他': 'Other',
};

const SCHOOL_TYPE_EN: Record<string, string> = {
  '公立': 'Public',
  '私立': 'Private',
  '国际': 'International',
};

function gradeLabel(value: string, language?: string): string {
  return localeText(language, {
    'zh-CN': value,
    'en-US': GRADE_LABEL_EN[value] || value,
    'ja-JP': GRADE_LABEL_MULTI[value]?.['ja-JP'] || GRADE_LABEL_EN[value] || value,
    'ko-KR': GRADE_LABEL_MULTI[value]?.['ko-KR'] || GRADE_LABEL_EN[value] || value,
    'es-ES': GRADE_LABEL_MULTI[value]?.['es-ES'] || GRADE_LABEL_EN[value] || value,
    'fr-FR': GRADE_LABEL_MULTI[value]?.['fr-FR'] || GRADE_LABEL_EN[value] || value,
  });
}

function cityLabel(value: string, language?: string): string {
  return localeText(language, {
    'zh-CN': value,
    'en-US': CITY_LABEL_EN[value] || value,
    'ja-JP': CITY_LABEL_EN[value] || value,
    'ko-KR': CITY_LABEL_EN[value] || value,
    'es-ES': CITY_LABEL_EN[value] || value,
    'fr-FR': CITY_LABEL_EN[value] || value,
  });
}

function schoolTypeLabel(value: string, language?: string): string {
  const labels: Record<string, Record<string, string>> = {
    '公立': { 'ja-JP': '公立', 'ko-KR': '공립', 'es-ES': 'Pública', 'fr-FR': 'Public' },
    '私立': { 'ja-JP': '私立', 'ko-KR': '사립', 'es-ES': 'Privada', 'fr-FR': 'Privé' },
    '国际': { 'ja-JP': '国際', 'ko-KR': '국제', 'es-ES': 'Internacional', 'fr-FR': 'International' },
  };
  return localeText(language, {
    'zh-CN': value,
    'en-US': SCHOOL_TYPE_EN[value] || value,
    'ja-JP': labels[value]?.['ja-JP'] || SCHOOL_TYPE_EN[value] || value,
    'ko-KR': labels[value]?.['ko-KR'] || SCHOOL_TYPE_EN[value] || value,
    'es-ES': labels[value]?.['es-ES'] || SCHOOL_TYPE_EN[value] || value,
    'fr-FR': labels[value]?.['fr-FR'] || SCHOOL_TYPE_EN[value] || value,
  });
}

const COMMON_LABELS: Record<string, Partial<Record<'en-US' | 'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR', string>>> = {
  '基本信息': { 'en-US': 'Basic info', 'ja-JP': '基本情報', 'ko-KR': '기본 정보', 'es-ES': 'Datos básicos', 'fr-FR': 'Infos de base' },
  '孩子的年龄、年级和基本情况': { 'en-US': "Child age, grade and context", 'ja-JP': '年齢・学年・基本状況', 'ko-KR': '나이, 학년, 기본 상황', 'es-ES': 'Edad, curso y contexto', 'fr-FR': 'Âge, classe et contexte' },
  '兴趣与特长': { 'en-US': 'Interests', 'ja-JP': '興味・得意分野', 'ko-KR': '관심과 특기', 'es-ES': 'Intereses', 'fr-FR': 'Centres d’intérêt' },
  '已有的兴趣班和特长爱好': { 'en-US': 'Current classes and interests', 'ja-JP': '現在の習い事と興味', 'ko-KR': '현재 수업과 관심사', 'es-ES': 'Clases e intereses actuales', 'fr-FR': 'Activités et intérêts actuels' },
  '性格与期望': { 'en-US': 'Personality & hopes', 'ja-JP': '性格と期待', 'ko-KR': '성격과 기대', 'es-ES': 'Personalidad y expectativas', 'fr-FR': 'Personnalité et attentes' },
  '性格特点、家长期望和预算': { 'en-US': 'Personality, parent hopes and budget', 'ja-JP': '性格・保護者の期待・予算', 'ko-KR': '성격, 부모 기대, 예산', 'es-ES': 'Personalidad, expectativas y presupuesto', 'fr-FR': 'Personnalité, attentes et budget' },
  'AI 生成中...': { 'en-US': 'AI is working...', 'ja-JP': 'AIが作成中...', 'ko-KR': 'AI 생성 중...', 'es-ES': 'IA generando...', 'fr-FR': 'IA en cours...' },
  '正在生成个性化推荐方案': { 'en-US': 'Building a personalized plan', 'ja-JP': '個別プランを作成中', 'ko-KR': '맞춤 계획 생성 중', 'es-ES': 'Creando un plan personalizado', 'fr-FR': 'Création du plan personnalisé' },
  '语言表达': { 'en-US': 'Language expression', 'ja-JP': '言葉で表現', 'ko-KR': '언어 표현', 'es-ES': 'Expresión oral', 'fr-FR': 'Expression orale' },
  '生活自理': { 'en-US': 'Self-care', 'ja-JP': '身の回りの自立', 'ko-KR': '생활 자립', 'es-ES': 'Autonomía diaria', 'fr-FR': 'Autonomie quotidienne' },
  '同伴交往': { 'en-US': 'Peer social skills', 'ja-JP': '友だちとの関わり', 'ko-KR': '또래 관계', 'es-ES': 'Relación con pares', 'fr-FR': 'Relations avec les pairs' },
  '户外运动': { 'en-US': 'Outdoor play', 'ja-JP': '外遊び', 'ko-KR': '야외 활동', 'es-ES': 'Juego al aire libre', 'fr-FR': 'Jeux dehors' },
  '精细动作': { 'en-US': 'Fine motor skills', 'ja-JP': '手先の動き', 'ko-KR': '소근육', 'es-ES': 'Motricidad fina', 'fr-FR': 'Motricité fine' },
  '专注等待': { 'en-US': 'Focus & waiting', 'ja-JP': '集中と待つ力', 'ko-KR': '집중과 기다림', 'es-ES': 'Atención y espera', 'fr-FR': 'Attention et patience' },
  '情绪表达': { 'en-US': 'Emotional expression', 'ja-JP': '感情表現', 'ko-KR': '감정 표현', 'es-ES': 'Expresión emocional', 'fr-FR': 'Expression émotionnelle' },
  '亲子阅读': { 'en-US': 'Parent-child reading', 'ja-JP': '親子読書', 'ko-KR': '부모와 독서', 'es-ES': 'Lectura en familia', 'fr-FR': 'Lecture en famille' },
  '艺术感受': { 'en-US': 'Art appreciation', 'ja-JP': '芸術への感性', 'ko-KR': '예술 감각', 'es-ES': 'Sensibilidad artística', 'fr-FR': 'Éveil artistique' },
  '自然观察': { 'en-US': 'Nature observation', 'ja-JP': '自然観察', 'ko-KR': '자연 관찰', 'es-ES': 'Observación de la naturaleza', 'fr-FR': 'Observation de la nature' },
  '数学启蒙': { 'en-US': 'Early math play', 'ja-JP': '算数あそび', 'ko-KR': '수학 놀이', 'es-ES': 'Iniciación matemática', 'fr-FR': 'Éveil aux nombres' },
  '阅读表达': { 'en-US': 'Reading & expression', 'ja-JP': '読書と表現', 'ko-KR': '읽기와 표현', 'es-ES': 'Lectura y expresión', 'fr-FR': 'Lecture et expression' },
  '书写习惯': { 'en-US': 'Writing habits', 'ja-JP': '書く習慣', 'ko-KR': '쓰기 습관', 'es-ES': 'Hábito de escritura', 'fr-FR': 'Habitudes d’écriture' },
  '计算基础': { 'en-US': 'Basic numeracy', 'ja-JP': '計算の基礎', 'ko-KR': '기초 계산', 'es-ES': 'Cálculo básico', 'fr-FR': 'Calcul de base' },
  '英语听说': { 'en-US': 'English listening/speaking', 'ja-JP': '英語の聞く・話す', 'ko-KR': '영어 듣기/말하기', 'es-ES': 'Inglés oral', 'fr-FR': 'Anglais oral' },
  '专注完成': { 'en-US': 'Finish with focus', 'ja-JP': '集中してやり切る', 'ko-KR': '집중해서 완료', 'es-ES': 'Terminar con atención', 'fr-FR': 'Finir avec attention' },
  '整理书包': { 'en-US': 'Pack school bag', 'ja-JP': 'ランドセル整理', 'ko-KR': '가방 정리', 'es-ES': 'Preparar mochila', 'fr-FR': 'Préparer le cartable' },
  '运动习惯': { 'en-US': 'Exercise habit', 'ja-JP': '運動習慣', 'ko-KR': '운동 습관', 'es-ES': 'Hábito deportivo', 'fr-FR': 'Habitude sportive' },
  '科学探索': { 'en-US': 'Science exploration', 'ja-JP': '科学探究', 'ko-KR': '과학 탐구', 'es-ES': 'Exploración científica', 'fr-FR': 'Exploration scientifique' },
  '语文': { 'en-US': 'Chinese', 'ja-JP': '国語', 'ko-KR': '국어', 'es-ES': 'Lengua', 'fr-FR': 'Langue' },
  '数学': { 'en-US': 'Math', 'ja-JP': '算数', 'ko-KR': '수학', 'es-ES': 'Matemáticas', 'fr-FR': 'Maths' },
  '英语': { 'en-US': 'English', 'ja-JP': '英語', 'ko-KR': '영어', 'es-ES': 'Inglés', 'fr-FR': 'Anglais' },
  '科学': { 'en-US': 'Science', 'ja-JP': '理科', 'ko-KR': '과학', 'es-ES': 'Ciencias', 'fr-FR': 'Sciences' },
  '物理': { 'en-US': 'Physics', 'ja-JP': '物理', 'ko-KR': '물리', 'es-ES': 'Física', 'fr-FR': 'Physique' },
  '化学': { 'en-US': 'Chemistry', 'ja-JP': '化学', 'ko-KR': '화학', 'es-ES': 'Química', 'fr-FR': 'Chimie' },
  '生物': { 'en-US': 'Biology', 'ja-JP': '生物', 'ko-KR': '생물', 'es-ES': 'Biología', 'fr-FR': 'Biologie' },
  '历史': { 'en-US': 'History', 'ja-JP': '歴史', 'ko-KR': '역사', 'es-ES': 'Historia', 'fr-FR': 'Histoire' },
  '地理': { 'en-US': 'Geography', 'ja-JP': '地理', 'ko-KR': '지리', 'es-ES': 'Geografía', 'fr-FR': 'Géographie' },
  '体育': { 'en-US': 'PE', 'ja-JP': '体育', 'ko-KR': '체육', 'es-ES': 'Educación física', 'fr-FR': 'EPS' },
  '跳绳': { 'en-US': 'Jump rope', 'ja-JP': 'なわとび', 'ko-KR': '줄넘기', 'es-ES': 'Comba', 'fr-FR': 'Corde à sauter' },
  '游泳': { 'en-US': 'Swimming', 'ja-JP': '水泳', 'ko-KR': '수영', 'es-ES': 'Natación', 'fr-FR': 'Natation' },
  '绘画': { 'en-US': 'Drawing', 'ja-JP': '絵画', 'ko-KR': '그림', 'es-ES': 'Dibujo', 'fr-FR': 'Dessin' },
  '钢琴启蒙': { 'en-US': 'Piano starter', 'ja-JP': 'ピアノ入門', 'ko-KR': '피아노 입문', 'es-ES': 'Piano inicial', 'fr-FR': 'Piano débutant' },
  '钢琴': { 'en-US': 'Piano', 'ja-JP': 'ピアノ', 'ko-KR': '피아노', 'es-ES': 'Piano', 'fr-FR': 'Piano' },
  '规律作息': { 'en-US': 'Steady routine', 'ja-JP': '規則正しい生活', 'ko-KR': '규칙적인 생활', 'es-ES': 'Rutina estable', 'fr-FR': 'Routine stable' },
  '学习习惯': { 'en-US': 'Learning habits', 'ja-JP': '学習習慣', 'ko-KR': '학습 습관', 'es-ES': 'Hábitos de estudio', 'fr-FR': 'Habitudes d’étude' },
  '减少磨蹭': { 'en-US': 'Less dawdling', 'ja-JP': 'だらだらを減らす', 'ko-KR': '꾸물거림 줄이기', 'es-ES': 'Menos demora', 'fr-FR': 'Moins de lenteur' },
  '提升学习效率': { 'en-US': 'Study efficiency', 'ja-JP': '学習効率', 'ko-KR': '학습 효율', 'es-ES': 'Eficiencia de estudio', 'fr-FR': 'Efficacité d’étude' },
  '运动健康': { 'en-US': 'Health & exercise', 'ja-JP': '健康と運動', 'ko-KR': '건강과 운동', 'es-ES': 'Salud y deporte', 'fr-FR': 'Santé et sport' },
  '外向活泼': { 'en-US': 'Outgoing', 'ja-JP': '活発', 'ko-KR': '활발함', 'es-ES': 'Extrovertido', 'fr-FR': 'Sociable' },
  '内向文静': { 'en-US': 'Quiet', 'ja-JP': 'おとなしい', 'ko-KR': '조용함', 'es-ES': 'Tranquilo', 'fr-FR': 'Calme' },
  '好动坐不住': { 'en-US': 'Very active', 'ja-JP': 'よく動く', 'ko-KR': '활동적', 'es-ES': 'Muy activo', 'fr-FR': 'Très actif' },
  '专注力好': { 'en-US': 'Good focus', 'ja-JP': '集中力がある', 'ko-KR': '집중력이 좋음', 'es-ES': 'Buena atención', 'fr-FR': 'Bonne attention' },
  '胆小谨慎': { 'en-US': 'Cautious', 'ja-JP': '慎重', 'ko-KR': '조심스러움', 'es-ES': 'Cauto', 'fr-FR': 'Prudent' },
  '勇于尝试': { 'en-US': 'Tries new things', 'ja-JP': '挑戦する', 'ko-KR': '도전적', 'es-ES': 'Se atreve a probar', 'fr-FR': 'Ose essayer' },
  '敏感细腻': { 'en-US': 'Sensitive', 'ja-JP': '繊細', 'ko-KR': '섬세함', 'es-ES': 'Sensible', 'fr-FR': 'Sensible' },
  '大大咧咧': { 'en-US': 'Easygoing', 'ja-JP': 'おおらか', 'ko-KR': '느긋함', 'es-ES': 'Relajado', 'fr-FR': 'Décontracté' },
  '喜欢社交': { 'en-US': 'Social', 'ja-JP': '人付き合いが好き', 'ko-KR': '사교적', 'es-ES': 'Sociable', 'fr-FR': 'Aime le groupe' },
  '喜欢独处': { 'en-US': 'Likes solo time', 'ja-JP': '一人時間が好き', 'ko-KR': '혼자 시간을 선호', 'es-ES': 'Le gusta estar solo', 'fr-FR': 'Aime être seul' },
  '争强好胜': { 'en-US': 'Competitive', 'ja-JP': '負けず嫌い', 'ko-KR': '승부욕 있음', 'es-ES': 'Competitivo', 'fr-FR': 'Compétitif' },
  '随和佛系': { 'en-US': 'Laid-back', 'ja-JP': 'マイペース', 'ko-KR': '느긋한 편', 'es-ES': 'Flexible', 'fr-FR': 'Souple' },
  '动手能力强': { 'en-US': 'Hands-on', 'ja-JP': '手を動かすのが得意', 'ko-KR': '손재주 좋음', 'es-ES': 'Hábil con las manos', 'fr-FR': 'Habileté manuelle' },
  '语言表达好': { 'en-US': 'Good verbal skills', 'ja-JP': '言葉が得意', 'ko-KR': '말 표현이 좋음', 'es-ES': 'Buena expresión', 'fr-FR': 'Bonne expression' },
  '逻辑思维强': { 'en-US': 'Logical', 'ja-JP': '論理的', 'ko-KR': '논리적', 'es-ES': 'Lógico', 'fr-FR': 'Logique' },
  '想象力丰富': { 'en-US': 'Imaginative', 'ja-JP': '想像力豊か', 'ko-KR': '상상력이 풍부', 'es-ES': 'Imaginativo', 'fr-FR': 'Imaginatif' },
  '体能游戏': { 'en-US': 'Movement games', 'ja-JP': '体を使う遊び', 'ko-KR': '신체 놀이', 'es-ES': 'Juegos de movimiento', 'fr-FR': 'Jeux moteurs' },
  '游泳启蒙': { 'en-US': 'Swimming starter', 'ja-JP': '水泳入門', 'ko-KR': '수영 입문', 'es-ES': 'Natación inicial', 'fr-FR': 'Natation débutant' },
  '创意美术': { 'en-US': 'Creative art', 'ja-JP': '創作美術', 'ko-KR': '창의 미술', 'es-ES': 'Arte creativo', 'fr-FR': 'Arts créatifs' },
  '音乐律动': { 'en-US': 'Music & rhythm', 'ja-JP': '音楽リズム', 'ko-KR': '음악 리듬', 'es-ES': 'Música y ritmo', 'fr-FR': 'Musique et rythme' },
  '绘本阅读': { 'en-US': 'Picture books', 'ja-JP': '絵本読み', 'ko-KR': '그림책 읽기', 'es-ES': 'Álbumes ilustrados', 'fr-FR': 'Albums jeunesse' },
  '乐高拼搭': { 'en-US': 'Lego building', 'ja-JP': 'レゴ', 'ko-KR': '레고 조립', 'es-ES': 'Construcción Lego', 'fr-FR': 'Construction Lego' },
  '平衡车': { 'en-US': 'Balance bike', 'ja-JP': 'バランスバイク', 'ko-KR': '밸런스 바이크', 'es-ES': 'Bici sin pedales', 'fr-FR': 'Draisienne' },
  '亲子运动': { 'en-US': 'Family movement', 'ja-JP': '親子運動', 'ko-KR': '가족 운동', 'es-ES': 'Movimiento en familia', 'fr-FR': 'Bouger en famille' },
  '生活自理小游戏': { 'en-US': 'Self-care games', 'ja-JP': '自立あそび', 'ko-KR': '자립 놀이', 'es-ES': 'Juegos de autonomía', 'fr-FR': 'Jeux d’autonomie' },
  '手工黏土': { 'en-US': 'Clay craft', 'ja-JP': '粘土工作', 'ko-KR': '점토 놀이', 'es-ES': 'Manualidades con arcilla', 'fr-FR': 'Pâte à modeler' },
  '篮球启蒙': { 'en-US': 'Basketball starter', 'ja-JP': 'バスケ入門', 'ko-KR': '농구 입문', 'es-ES': 'Baloncesto inicial', 'fr-FR': 'Basket débutant' },
  '足球启蒙': { 'en-US': 'Soccer starter', 'ja-JP': 'サッカー入門', 'ko-KR': '축구 입문', 'es-ES': 'Fútbol inicial', 'fr-FR': 'Football débutant' },
  '武术/跆拳道': { 'en-US': 'Martial arts', 'ja-JP': '武術・テコンドー', 'ko-KR': '무술/태권도', 'es-ES': 'Artes marciales', 'fr-FR': 'Arts martiaux' },
  '合唱/声乐': { 'en-US': 'Choir / vocal', 'ja-JP': '合唱・声楽', 'ko-KR': '합창/보컬', 'es-ES': 'Coro / canto', 'fr-FR': 'Chorale / chant' },
  '硬笔启蒙': { 'en-US': 'Handwriting starter', 'ja-JP': '硬筆入門', 'ko-KR': '글씨 입문', 'es-ES': 'Caligrafía inicial', 'fr-FR': 'Écriture débutant' },
  '围棋': { 'en-US': 'Go', 'ja-JP': '囲碁', 'ko-KR': '바둑', 'es-ES': 'Go', 'fr-FR': 'Go' },
  '乐高/机器人': { 'en-US': 'Lego / robotics', 'ja-JP': 'レゴ・ロボット', 'ko-KR': '레고/로봇', 'es-ES': 'Lego / robótica', 'fr-FR': 'Lego / robotique' },
  '演讲口才': { 'en-US': 'Public speaking', 'ja-JP': 'スピーチ', 'ko-KR': '발표/말하기', 'es-ES': 'Oratoria', 'fr-FR': 'Expression orale' },
  '兴趣探索': { 'en-US': 'Explore interests', 'ja-JP': '興味を探す', 'ko-KR': '관심 탐색', 'es-ES': 'Explorar intereses', 'fr-FR': 'Explorer les intérêts' },
  '兴趣启蒙': { 'en-US': 'Interest starter', 'ja-JP': '興味の芽生え', 'ko-KR': '관심 시작', 'es-ES': 'Iniciación de intereses', 'fr-FR': 'Éveil des intérêts' },
  '情绪稳定': { 'en-US': 'Emotional steadiness', 'ja-JP': '感情の安定', 'ko-KR': '정서 안정', 'es-ES': 'Estabilidad emocional', 'fr-FR': 'Stabilité émotionnelle' },
  '亲子陪伴': { 'en-US': 'Family time', 'ja-JP': '親子時間', 'ko-KR': '가족 시간', 'es-ES': 'Tiempo en familia', 'fr-FR': 'Temps en famille' },
};

function uiLabel(value: string, language?: string): string {
  const mapped = COMMON_LABELS[value];
  if (!mapped) return value;
  return localeText(language, { 'zh-CN': value, 'en-US': mapped['en-US'] || value, ...mapped });
}

function moreLabel(language?: string) {
  return (count: number) => localeCountText(language, count, {
    'zh-CN': '+{{count}}更多',
    'en-US': '+{{count}} more',
    'ja-JP': '+{{count}}件',
    'ko-KR': '+{{count}}개 더',
    'es-ES': '+{{count}} más',
    'fr-FR': '+{{count}} de plus',
  });
}

function collapseLabel(language?: string) {
  return localeText(language, { 'zh-CN': '收起', 'en-US': 'Collapse', 'ja-JP': '閉じる', 'ko-KR': '접기', 'es-ES': 'Contraer', 'fr-FR': 'Replier' });
}

// ==================== 标签项组件 ====================

function ChipSelect({
  options,
  selected,
  onChange,
  multi = true,
  placeholder,
  getLabel = (value: string) => value,
  moreText,
  collapseText,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  multi?: boolean;
  placeholder?: string;
  getLabel?: (value: string) => string;
  moreText?: (count: number) => string;
  collapseText?: string;
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
            {getLabel(opt)}
          </button>
        ))}
        {options.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1.5 rounded-full text-xs font-black border-2 border-dashed border-outline-variant/20 text-primary"
          >
            {showAll ? (collapseText || '收起') : (moreText ? moreText(options.length - 8) : `+${options.length - 8}更多`)}
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
  const { i18n } = useTranslation();
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
  const scheduleSkill = buildScheduleOptimizationSkill(profile);

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
    { title: uiLabel('基本信息', i18n.language), icon: User, desc: uiLabel('孩子的年龄、年级和基本情况', i18n.language) },
    { title: uiLabel(scheduleSkill.academicStepTitle, i18n.language), icon: BookOpen, desc: uiLabel(scheduleSkill.academicStepDescription, i18n.language) },
    { title: uiLabel('兴趣与特长', i18n.language), icon: Heart, desc: uiLabel('已有的兴趣班和特长爱好', i18n.language) },
    { title: uiLabel('性格与期望', i18n.language), icon: Target, desc: uiLabel('性格特点、家长期望和预算', i18n.language) },
    { title: uiLabel('AI 生成中...', i18n.language), icon: Sparkles, desc: uiLabel('正在生成个性化推荐方案', i18n.language) },
    { title: localeText(i18n.language, { 'zh-CN': '推荐方案', 'en-US': 'Plan', 'ja-JP': 'プラン', 'ko-KR': '추천안', 'es-ES': 'Plan', 'fr-FR': 'Plan' }), icon: Star, desc: localeText(i18n.language, { 'zh-CN': '您的个性化日程推荐', 'en-US': 'Your personalized schedule', 'ja-JP': '個別の日程提案', 'ko-KR': '맞춤 일정 추천', 'es-ES': 'Tu agenda personalizada', 'fr-FR': 'Votre planning personnalisé' }) },
  ];

  // 是否已填写性别
  const hasGender = profile.gender !== '';

  // 根据性别获取兴趣推荐选项
  const interestOptions = profile.gender === 'boy'
    ? scheduleSkill.interestOptions.boy
    : profile.gender === 'girl'
      ? scheduleSkill.interestOptions.girl
      : scheduleSkill.interestOptions.all;

  const updateProfileForStage = (next: ChildProfile) => {
    setProfile(sanitizeChildProfileForScheduleStage(next));
  };

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
      const planName = `${profile.grade || profile.age || '孩子'}智能日程优化方案`;
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
        name: `${profile.grade || profile.age || '孩子'}智能日程优化方案`,
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
          {localeText(i18n.language, { 'zh-CN': '孩子的性别', 'en-US': "Child's gender", 'ja-JP': '子どもの性別', 'ko-KR': '아이 성별', 'es-ES': 'Sexo del niño', 'fr-FR': 'Sexe de l’enfant' })} <span className="text-danger">*</span>
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
            <span className="text-sm font-black block">{localeText(i18n.language, { 'zh-CN': '女孩', 'en-US': 'Girl', 'ja-JP': '女の子', 'ko-KR': '여아', 'es-ES': 'Niña', 'fr-FR': 'Fille' })}</span>
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
            <span className="text-sm font-black block">{localeText(i18n.language, { 'zh-CN': '男孩', 'en-US': 'Boy', 'ja-JP': '男の子', 'ko-KR': '남아', 'es-ES': 'Niño', 'fr-FR': 'Garçon' })}</span>
          </button>
        </div>
      </div>

      {/* 年级 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          {localeText(i18n.language, { 'zh-CN': '年级/学段', 'en-US': 'Grade / stage', 'ja-JP': '学年・段階', 'ko-KR': '학년/단계', 'es-ES': 'Curso / etapa', 'fr-FR': 'Classe / étape' })} <span className="text-danger">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            options={GRADE_OPTIONS}
            selected={profile.grade ? [profile.grade] : []}
            onChange={v => {
              const grade = v[0] || '';
              updateProfileForStage({
                ...profile,
                grade,
                age: grade ? getAgeFromGrade(grade) : profile.age,
              });
            }}
            multi={false}
            placeholder={localeText(i18n.language, { 'zh-CN': '选择孩子当前的年级', 'en-US': "Select the child's current grade", 'ja-JP': '現在の学年を選択', 'ko-KR': '현재 학년을 선택하세요', 'es-ES': 'Elige el curso actual', 'fr-FR': 'Choisir la classe actuelle' })}
            getLabel={value => gradeLabel(value, i18n.language)}
            moreText={count => localeCountText(i18n.language, count, { 'zh-CN': '+{{count}}更多', 'en-US': '+{{count}} more', 'ja-JP': '+{{count}}件', 'ko-KR': '+{{count}}개 더', 'es-ES': '+{{count}} más', 'fr-FR': '+{{count}} de plus' })}
            collapseText={localeText(i18n.language, { 'zh-CN': '收起', 'en-US': 'Collapse', 'ja-JP': '閉じる', 'ko-KR': '접기', 'es-ES': 'Contraer', 'fr-FR': 'Replier' })}
          />
        </div>
      </div>

      {/* 年龄 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">{localeText(i18n.language, { 'zh-CN': '年龄（岁）', 'en-US': 'Age', 'ja-JP': '年齢', 'ko-KR': '나이', 'es-ES': 'Edad', 'fr-FR': 'Âge' })}</label>
        <NumberInput
          value={profile.age}
          onChange={v => updateProfileForStage({ ...profile, age: v })}
          suffix={localeText(i18n.language, { 'zh-CN': '岁', 'en-US': 'yrs', 'ja-JP': '歳', 'ko-KR': '세', 'es-ES': 'años', 'fr-FR': 'ans' })}
          placeholder={localeText(i18n.language, { 'zh-CN': '输入年龄', 'en-US': 'Enter age', 'ja-JP': '年齢を入力', 'ko-KR': '나이 입력', 'es-ES': 'Introduce la edad', 'fr-FR': 'Saisir l’âge' })}
        />
      </div>

      {/* 城市 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">{localeText(i18n.language, { 'zh-CN': '所在城市', 'en-US': 'City', 'ja-JP': '都市', 'ko-KR': '도시', 'es-ES': 'Ciudad', 'fr-FR': 'Ville' })}</label>
        <div className="flex flex-wrap gap-2">
          <ChipSelect
            options={CITY_OPTIONS}
            selected={profile.city ? [profile.city] : []}
            onChange={v => setProfile({ ...profile, city: v[0] || '' })}
            multi={false}
            placeholder={localeText(i18n.language, { 'zh-CN': '选择所在城市（可选）', 'en-US': 'Select city (optional)', 'ja-JP': '都市を選択（任意）', 'ko-KR': '도시 선택(선택)', 'es-ES': 'Elige ciudad (opcional)', 'fr-FR': 'Choisir une ville (facultatif)' })}
            getLabel={value => cityLabel(value, i18n.language)}
            moreText={count => localeCountText(i18n.language, count, { 'zh-CN': '+{{count}}更多', 'en-US': '+{{count}} more', 'ja-JP': '+{{count}}件', 'ko-KR': '+{{count}}개 더', 'es-ES': '+{{count}} más', 'fr-FR': '+{{count}} de plus' })}
            collapseText={localeText(i18n.language, { 'zh-CN': '收起', 'en-US': 'Collapse', 'ja-JP': '閉じる', 'ko-KR': '접기', 'es-ES': 'Contraer', 'fr-FR': 'Replier' })}
          />
        </div>
      </div>

      {/* 学校类型 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">{localeText(i18n.language, { 'zh-CN': '学校类型', 'en-US': 'School type', 'ja-JP': '学校タイプ', 'ko-KR': '학교 유형', 'es-ES': 'Tipo de escuela', 'fr-FR': 'Type d’école' })}</label>
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
              {schoolTypeLabel(type, i18n.language)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============= 步骤 1: 阶段化学习/发展与时间 =============

  const renderAcademicInfo = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Star size={16} className="text-warning" />
          {scheduleSkill.strengthLabel}
        </label>
        <ChipSelect
          options={scheduleSkill.subjectOptions}
          selected={profile.strongSubjects}
          onChange={v => updateProfileForStage({ ...profile, strongSubjects: v })}
          placeholder={localeText(i18n.language, {
            'zh-CN': `选择${scheduleSkill.strengthLabel}（可选）`,
            'en-US': 'Choose strengths (optional)',
            'ja-JP': '得意な項目を選択（任意）',
            'ko-KR': '강점을 선택하세요(선택)',
            'es-ES': 'Elige fortalezas (opcional)',
            'fr-FR': 'Choisir les points forts (facultatif)',
          })}
          getLabel={value => uiLabel(value, i18n.language)}
          moreText={moreLabel(i18n.language)}
          collapseText={collapseLabel(i18n.language)}
        />
      </div>

      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          {scheduleSkill.challengeLabel}
        </label>
        <ChipSelect
          options={scheduleSkill.subjectOptions}
          selected={profile.weakSubjects}
          onChange={v => updateProfileForStage({ ...profile, weakSubjects: v })}
          placeholder={localeText(i18n.language, {
            'zh-CN': `选择${scheduleSkill.challengeLabel}（可选）`,
            'en-US': 'Choose areas to support (optional)',
            'ja-JP': 'サポートしたい項目を選択（任意）',
            'ko-KR': '도움이 필요한 영역 선택(선택)',
            'es-ES': 'Elige áreas a reforzar (opcional)',
            'fr-FR': 'Choisir les points à aider (facultatif)',
          })}
          getLabel={value => uiLabel(value, i18n.language)}
          moreText={moreLabel(i18n.language)}
          collapseText={collapseLabel(i18n.language)}
        />
      </div>

      {/* 作业时长 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          {scheduleSkill.homeworkLabel}
        </label>
        <NumberInput
          value={profile.homeworkDuration}
          onChange={v => setProfile({ ...profile, homeworkDuration: v })}
          suffix={localeText(i18n.language, { 'zh-CN': '分钟', 'en-US': 'min', 'ja-JP': '分', 'ko-KR': '분', 'es-ES': 'min', 'fr-FR': 'min' })}
          placeholder={localeText(i18n.language, { 'zh-CN': scheduleSkill.homeworkPlaceholder, 'en-US': 'e.g. 60', 'ja-JP': '例：60', 'ko-KR': '예: 60', 'es-ES': 'Ej.: 60', 'fr-FR': 'ex. 60' })}
        />
      </div>

      {/* 可自由支配时间 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3">
          {scheduleSkill.freeTimeLabel}
        </label>
        <NumberInput
          value={profile.freeTimePerDay}
          onChange={v => setProfile({ ...profile, freeTimePerDay: v })}
          suffix={localeText(i18n.language, { 'zh-CN': '小时', 'en-US': 'hrs', 'ja-JP': '時間', 'ko-KR': '시간', 'es-ES': 'h', 'fr-FR': 'h' })}
          placeholder={localeText(i18n.language, { 'zh-CN': scheduleSkill.freeTimePlaceholder, 'en-US': 'e.g. 2', 'ja-JP': '例：2', 'ko-KR': '예: 2', 'es-ES': 'Ej.: 2', 'fr-FR': 'ex. 2' })}
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
          {localeText(i18n.language, {
            'zh-CN': `以下是更适合${scheduleSkill.stage.shortLabel}孩子的方向，性别只作弱参考，最终以孩子真实兴趣为准`,
            'en-US': 'These are age-appropriate directions. Gender is only a light reference; the child’s real interest matters most.',
            'ja-JP': '年齢に合う方向です。性別は軽い参考にし、本人の興味を優先します。',
            'ko-KR': '연령에 맞는 방향입니다. 성별은 참고만 하고 아이의 실제 관심을 우선합니다.',
            'es-ES': 'Son opciones adecuadas para la edad. El género solo orienta; manda el interés real del niño.',
            'fr-FR': 'Options adaptées à l’âge. Le genre n’est qu’un repère léger; l’intérêt réel prime.',
          })}
        </p>
      </div>

      {/* 已有兴趣班 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          {localeText(i18n.language, {
            'zh-CN': '孩子目前正在上的兴趣班 / 感兴趣的方向',
            'en-US': 'Current classes / interests',
            'ja-JP': '現在の習い事・興味',
            'ko-KR': '현재 수업 / 관심사',
            'es-ES': 'Clases actuales / intereses',
            'fr-FR': 'Activités actuelles / centres d’intérêt',
          })}
        </label>
        <ChipSelect
          options={interestOptions}
          selected={profile.existingInterests}
          onChange={v => setProfile({ ...profile, existingInterests: v })}
          placeholder={localeText(i18n.language, {
            'zh-CN': '选择已有的兴趣方向（可多选）',
            'en-US': 'Choose current interests',
            'ja-JP': '現在の興味を選択',
            'ko-KR': '현재 관심사 선택',
            'es-ES': 'Elige intereses actuales',
            'fr-FR': 'Choisir les intérêts actuels',
          })}
          getLabel={value => uiLabel(value, i18n.language)}
          moreText={moreLabel(i18n.language)}
          collapseText={collapseLabel(i18n.language)}
        />
      </div>

      {/* 已有固定日程 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Clock size={16} className="text-blue-400" />
          {localeText(i18n.language, {
            'zh-CN': '目前已有固定安排的时段（如 "周一16:00-18:00 钢琴"）',
            'en-US': 'Fixed time blocks you already have, e.g. "Mon 16:00-18:00 piano"',
            'ja-JP': 'すでに固定の予定（例：「月曜16:00-18:00 ピアノ」）',
            'ko-KR': '이미 정해진 시간대(예: "월 16:00-18:00 피아노")',
            'es-ES': 'Horarios fijos actuales, p. ej. "lunes 16:00-18:00 piano"',
            'fr-FR': 'Créneaux fixes actuels, ex. « lundi 16:00-18:00 piano »',
          })}
        </label>
        <input
          value={profile.existingSchedules.join('；')}
          onChange={e => setProfile({ ...profile, existingSchedules: e.target.value ? [e.target.value] : [] })}
          placeholder={localeText(i18n.language, {
            'zh-CN': '输入已有的固定安排，如：周一16-18钢琴',
            'en-US': 'Enter fixed blocks, e.g. Mon 16-18 piano',
            'ja-JP': '例：月曜16-18 ピアノ',
            'ko-KR': '예: 월 16-18 피아노',
            'es-ES': 'Ej.: lunes 16-18 piano',
            'fr-FR': 'Ex. lundi 16-18 piano',
          })}
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 电子设备使用 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-purple-400" />
          {localeText(i18n.language, {
            'zh-CN': '孩子每天使用电子设备（手机/平板/游戏）的情况',
            'en-US': 'Daily screen time (phone / tablet / games)',
            'ja-JP': '毎日の画面時間（スマホ・タブレット・ゲーム）',
            'ko-KR': '하루 화면 시간(휴대폰/태블릿/게임)',
            'es-ES': 'Pantallas diarias (móvil/tableta/juegos)',
            'fr-FR': 'Écrans quotidiens (téléphone/tablette/jeux)',
          })}
        </label>
        <input
          value={profile.screenTime}
          onChange={e => setProfile({ ...profile, screenTime: e.target.value })}
          placeholder={localeText(i18n.language, {
            'zh-CN': '例如：每天约30分钟平板看动画片，周末会玩游戏1小时',
            'en-US': 'e.g. 30 min cartoons daily, 1 hour games on weekends',
            'ja-JP': '例：毎日30分アニメ、週末ゲーム1時間',
            'ko-KR': '예: 매일 만화 30분, 주말 게임 1시간',
            'es-ES': 'Ej.: 30 min de dibujos al día, 1 h de juegos el fin de semana',
            'fr-FR': 'ex. 30 min de dessins animés, 1 h de jeux le week-end',
          })}
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
          {localeText(i18n.language, { 'zh-CN': '孩子的性格特点', 'en-US': 'Child personality', 'ja-JP': '子どもの性格', 'ko-KR': '아이 성격', 'es-ES': 'Personalidad del niño', 'fr-FR': 'Personnalité de l’enfant' })}
        </label>
        <ChipSelect
          options={PERSONALITY_OPTIONS}
          selected={profile.personality}
          onChange={v => setProfile({ ...profile, personality: v })}
          placeholder={localeText(i18n.language, { 'zh-CN': '选择符合孩子的性格特点（可多选）', 'en-US': 'Choose matching traits', 'ja-JP': '当てはまる性格を選択', 'ko-KR': '해당되는 성격 선택', 'es-ES': 'Elige rasgos que encajan', 'fr-FR': 'Choisir les traits adaptés' })}
          getLabel={value => uiLabel(value, i18n.language)}
          moreText={moreLabel(i18n.language)}
          collapseText={collapseLabel(i18n.language)}
        />
        <input
          value={profile.personalityOther}
          onChange={e => setProfile({ ...profile, personalityOther: e.target.value })}
          placeholder={localeText(i18n.language, { 'zh-CN': '其他性格特点补充...', 'en-US': 'Add other traits...', 'ja-JP': '他の性格を追加...', 'ko-KR': '다른 성격 추가...', 'es-ES': 'Añade otros rasgos...', 'fr-FR': 'Ajouter d’autres traits...' })}
          className="w-full mt-2 px-4 py-2.5 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 家长期望 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Target size={16} className="text-primary" />
          {localeText(i18n.language, { 'zh-CN': '您对孩子的期望方向', 'en-US': 'What you hope to improve', 'ja-JP': '伸ばしたい方向', 'ko-KR': '기대하는 방향', 'es-ES': 'Qué quiere mejorar', 'fr-FR': 'Ce que vous voulez améliorer' })}
        </label>
        <ChipSelect
          options={scheduleSkill.parentExpectationOptions}
          selected={profile.parentExpectation}
          onChange={v => setProfile({ ...profile, parentExpectation: v })}
          placeholder={localeText(i18n.language, { 'zh-CN': '选择您最看重的方向（可多选）', 'en-US': 'Choose what matters most', 'ja-JP': '重視する方向を選択', 'ko-KR': '가장 중요한 방향 선택', 'es-ES': 'Elige lo más importante', 'fr-FR': 'Choisir les priorités' })}
          getLabel={value => uiLabel(value, i18n.language)}
          moreText={moreLabel(i18n.language)}
          collapseText={collapseLabel(i18n.language)}
        />
        <input
          value={profile.expectationOther}
          onChange={e => setProfile({ ...profile, expectationOther: e.target.value })}
          placeholder={localeText(i18n.language, { 'zh-CN': '其他期望补充...', 'en-US': 'Add other hopes...', 'ja-JP': '他の希望を追加...', 'ko-KR': '다른 기대 추가...', 'es-ES': 'Añade otras expectativas...', 'fr-FR': 'Ajouter d’autres attentes...' })}
          className="w-full mt-2 px-4 py-2.5 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 预算 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-primary" />
          {localeText(i18n.language, { 'zh-CN': '每月兴趣班预算', 'en-US': 'Monthly activity budget', 'ja-JP': '月の習い事予算', 'ko-KR': '월 활동 예산', 'es-ES': 'Presupuesto mensual', 'fr-FR': 'Budget mensuel' })}
        </label>
        <NumberInput
          value={profile.budget}
          onChange={v => setProfile({ ...profile, budget: v })}
          suffix={localeText(i18n.language, { 'zh-CN': '元/月', 'en-US': '/mo', 'ja-JP': '/月', 'ko-KR': '/월', 'es-ES': '/mes', 'fr-FR': '/mois' })}
          placeholder={localeText(i18n.language, { 'zh-CN': '例如：1000', 'en-US': 'e.g. 1000', 'ja-JP': '例：1000', 'ko-KR': '예: 1000', 'es-ES': 'Ej.: 1000', 'fr-FR': 'ex. 1000' })}
        />
      </div>

      {/* 健康 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <Activity size={16} className="text-orange-400" />
          {localeText(i18n.language, { 'zh-CN': '健康注意事项（视力/体能/过敏等）', 'en-US': 'Health notes (eyesight, stamina, allergies)', 'ja-JP': '健康メモ（視力・体力・アレルギー）', 'ko-KR': '건강 메모(시력, 체력, 알레르기)', 'es-ES': 'Salud (vista, energía, alergias)', 'fr-FR': 'Santé (vue, énergie, allergies)' })}
        </label>
        <input
          value={profile.healthNotes}
          onChange={e => setProfile({ ...profile, healthNotes: e.target.value })}
          placeholder={localeText(i18n.language, { 'zh-CN': '例如：视力需要保护，不适合长时间练琴；体能一般...', 'en-US': 'e.g. protect eyesight; avoid long piano sessions; average stamina...', 'ja-JP': '例：視力を守りたい、長時間の練習は避けたい...', 'ko-KR': '예: 시력 보호 필요, 긴 연습은 피함...', 'es-ES': 'Ej.: cuidar la vista; evitar sesiones largas...', 'fr-FR': 'ex. protéger la vue; éviter les longues séances...' })}
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
        />
      </div>

      {/* 其他 */}
      <div>
        <label className="block text-sm font-black text-on-surface mb-3 flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          {localeText(i18n.language, { 'zh-CN': '其他想补充的说明', 'en-US': 'Anything else to add', 'ja-JP': 'その他の補足', 'ko-KR': '기타 메모', 'es-ES': 'Algo más que añadir', 'fr-FR': 'Autres précisions' })}
        </label>
        <textarea
          value={profile.otherNotes}
          onChange={e => setProfile({ ...profile, otherNotes: e.target.value })}
          placeholder={localeText(i18n.language, { 'zh-CN': '任何其他想告诉我们的信息...', 'en-US': 'Any other context...', 'ja-JP': '他に伝えたいこと...', 'ko-KR': '추가로 알려줄 내용...', 'es-ES': 'Cualquier otro contexto...', 'fr-FR': 'Tout autre contexte...' })}
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
        <h3 className="text-lg font-black text-on-surface mb-2">
          {localeText(i18n.language, { 'zh-CN': 'AI 正在分析...', 'en-US': 'AI is analyzing...', 'ja-JP': 'AIが分析中...', 'ko-KR': 'AI 분석 중...', 'es-ES': 'La IA está analizando...', 'fr-FR': 'L’IA analyse...' })}
        </h3>
        <p className="text-sm font-bold text-on-surface-variant/60">
          {localeText(i18n.language, {
            'zh-CN': '正在根据您提供的信息，结合教育专家知识库，生成个性化方案',
            'en-US': 'Using your answers and child-development knowledge to build a personalized plan.',
            'ja-JP': '入力内容と発達知識をもとに個別プランを作成しています。',
            'ko-KR': '입력 내용과 발달 지식을 바탕으로 맞춤 계획을 만들고 있어요.',
            'es-ES': 'Usando sus respuestas y conocimientos de desarrollo infantil para crear un plan.',
            'fr-FR': 'Avec vos réponses et des repères de développement, nous créons un plan personnalisé.',
          })}
        </p>
      </div>
      <div className="flex gap-2">
        {[
          localeText(i18n.language, { 'zh-CN': '分析信息', 'en-US': 'Reading answers', 'ja-JP': '回答を確認', 'ko-KR': '답변 분석', 'es-ES': 'Leyendo respuestas', 'fr-FR': 'Lecture des réponses' }),
          localeText(i18n.language, { 'zh-CN': '匹配知识库', 'en-US': 'Matching guidance', 'ja-JP': '知識を照合', 'ko-KR': '가이드 매칭', 'es-ES': 'Buscando orientación', 'fr-FR': 'Repères adaptés' }),
          localeText(i18n.language, { 'zh-CN': '生成方案', 'en-US': 'Building plan', 'ja-JP': 'プラン作成', 'ko-KR': '계획 생성', 'es-ES': 'Creando plan', 'fr-FR': 'Création du plan' }),
        ].map((text, i) => (
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
              <h3 className="font-black text-on-surface text-sm">
                {localeText(i18n.language, { 'zh-CN': 'AI 综合分析', 'en-US': 'AI summary', 'ja-JP': 'AI要約', 'ko-KR': 'AI 요약', 'es-ES': 'Resumen IA', 'fr-FR': 'Résumé IA' })}
              </h3>
              <p className="text-[10px] font-bold text-on-surface-variant/40">
                {localeText(i18n.language, {
                  'zh-CN': `基于 ${profile.age || '对应年级'} 岁${profile.gender === 'boy' ? '男孩' : '女孩'}${profile.grade ? ` · ${profile.grade}` : ''} 的个性化方案`,
                  'en-US': `Personalized for ${profile.age || 'this stage'} yrs · ${profile.gender === 'boy' ? 'boy' : 'girl'}${profile.grade ? ` · ${gradeLabel(profile.grade, i18n.language)}` : ''}`,
                  'ja-JP': `${profile.age || 'この段階'}歳・${profile.gender === 'boy' ? '男の子' : '女の子'}${profile.grade ? `・${gradeLabel(profile.grade, i18n.language)}` : ''}向け`,
                  'ko-KR': `${profile.age || '해당 단계'}세 · ${profile.gender === 'boy' ? '남아' : '여아'}${profile.grade ? ` · ${gradeLabel(profile.grade, i18n.language)}` : ''} 맞춤`,
                  'es-ES': `Personalizado para ${profile.age || 'esta etapa'} años · ${profile.gender === 'boy' ? 'niño' : 'niña'}${profile.grade ? ` · ${gradeLabel(profile.grade, i18n.language)}` : ''}`,
                  'fr-FR': `Personnalisé pour ${profile.age || 'cette étape'} ans · ${profile.gender === 'boy' ? 'garçon' : 'fille'}${profile.grade ? ` · ${gradeLabel(profile.grade, i18n.language)}` : ''}`,
                })}
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
            { key: 'weekday', label: localeText(i18n.language, { 'zh-CN': '平日作息', 'en-US': 'Weekdays', 'ja-JP': '平日', 'ko-KR': '평일', 'es-ES': 'Entre semana', 'fr-FR': 'Semaine' }), icon: Sun },
            { key: 'weekend', label: localeText(i18n.language, { 'zh-CN': '周末作息', 'en-US': 'Weekend', 'ja-JP': '週末', 'ko-KR': '주말', 'es-ES': 'Fin de semana', 'fr-FR': 'Week-end' }), icon: Moon },
            { key: 'activities', label: localeText(i18n.language, { 'zh-CN': '推荐活动', 'en-US': 'Activities', 'ja-JP': '活動', 'ko-KR': '활동', 'es-ES': 'Actividades', 'fr-FR': 'Activités' }), icon: Star },
            { key: 'advice', label: localeText(i18n.language, { 'zh-CN': '学习策略', 'en-US': 'Strategy', 'ja-JP': '戦略', 'ko-KR': '전략', 'es-ES': 'Estrategia', 'fr-FR': 'Stratégie' }), icon: BookOpen },
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
            {activeTab === 'weekday' && renderTimeSlots(recommendation.weekdaySchedule, localeText(i18n.language, { 'zh-CN': '平日作息表', 'en-US': 'Weekday schedule', 'ja-JP': '平日の予定', 'ko-KR': '평일 일정', 'es-ES': 'Horario entre semana', 'fr-FR': 'Planning de semaine' }))}
            {activeTab === 'weekend' && renderTimeSlots(recommendation.weekendSchedule, localeText(i18n.language, { 'zh-CN': '周末作息表', 'en-US': 'Weekend schedule', 'ja-JP': '週末の予定', 'ko-KR': '주말 일정', 'es-ES': 'Horario de fin de semana', 'fr-FR': 'Planning du week-end' }))}
            {activeTab === 'activities' && renderActivities(recommendation.recommendedActivities, recommendation.avoidActivities)}
            {activeTab === 'advice' && renderAdvice(recommendation)}
          </motion.div>
        </AnimatePresence>

        {/* 反馈修订 */}
        <div className="bg-surface dark:bg-surface-container-high rounded-3xl p-4 border border-outline-variant/10">
          <p className="text-sm font-black text-on-surface mb-3 flex items-center gap-2">
            <MessageCircle size={16} />
            {localeText(i18n.language, { 'zh-CN': '对方案不满意？提出修改意见', 'en-US': 'Want changes? Tell AI what to adjust', 'ja-JP': '変更したい点を入力', 'ko-KR': '수정할 점을 알려주세요', 'es-ES': '¿Quiere cambios? Dígale qué ajustar', 'fr-FR': 'Besoin de modifier ? Dites quoi ajuster' })}
          </p>
          <div className="flex gap-2">
            <input
              value={feedbackInput}
              onChange={e => setFeedbackInput(e.target.value)}
              placeholder={localeText(i18n.language, { 'zh-CN': '例如：希望增加户外活动时间/减少周末学习...', 'en-US': 'e.g. more outdoor time, less weekend study...', 'ja-JP': '例：外遊びを増やし、週末学習を減らす...', 'ko-KR': '예: 야외 시간 늘리고 주말 공부 줄이기...', 'es-ES': 'Ej.: más tiempo al aire libre, menos estudio...', 'fr-FR': 'ex. plus de dehors, moins d’étude le week-end...' })}
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
              {localeText(i18n.language, { 'zh-CN': '调整', 'en-US': 'Adjust', 'ja-JP': '調整', 'ko-KR': '수정', 'es-ES': 'Ajustar', 'fr-FR': 'Ajuster' })}
            </button>
          </div>
        </div>

        {/* 家长建议 */}
        <div className="bg-warning-container/50 rounded-3xl p-5 border border-warning/20">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-warning" />
            <h3 className="font-black text-sm text-warning">
              {localeText(i18n.language, { 'zh-CN': '给家长的建议', 'en-US': 'Tips for parents', 'ja-JP': '保護者へのヒント', 'ko-KR': '부모를 위한 팁', 'es-ES': 'Consejos para padres', 'fr-FR': 'Conseils aux parents' })}
            </h3>
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
              {localeText(i18n.language, { 'zh-CN': '分阶段发展路径', 'en-US': 'Stage-by-stage path', 'ja-JP': '段階別の進め方', 'ko-KR': '단계별 경로', 'es-ES': 'Ruta por etapas', 'fr-FR': 'Parcours par étapes' })}
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
            {isSavingPlan
              ? localeText(i18n.language, { 'zh-CN': '保存中...', 'en-US': 'Saving...', 'ja-JP': '保存中...', 'ko-KR': '저장 중...', 'es-ES': 'Guardando...', 'fr-FR': 'Enregistrement...' })
              : localeText(i18n.language, { 'zh-CN': '保存为计划', 'en-US': 'Save as plan', 'ja-JP': 'プランとして保存', 'ko-KR': '계획으로 저장', 'es-ES': 'Guardar como plan', 'fr-FR': 'Enregistrer comme plan' })}
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
            {localeText(i18n.language, { 'zh-CN': '重新开始', 'en-US': 'Start over', 'ja-JP': '最初から', 'ko-KR': '다시 시작', 'es-ES': 'Empezar de nuevo', 'fr-FR': 'Recommencer' })}
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
        <span className="text-[10px] font-bold text-on-surface-variant/40">
          {localeCountText(i18n.language, slots.length, { 'zh-CN': '{{count}} 个时段', 'en-US': '{{count}} slots', 'ja-JP': '{{count}}枠', 'ko-KR': '{{count}}개 시간대', 'es-ES': '{{count}} bloques', 'fr-FR': '{{count}} créneaux' })}
        </span>
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
          <h3 className="font-black text-sm text-on-surface">
            {localeText(i18n.language, { 'zh-CN': '推荐兴趣/活动方向', 'en-US': 'Recommended activities', 'ja-JP': 'おすすめの活動', 'ko-KR': '추천 활동', 'es-ES': 'Actividades recomendadas', 'fr-FR': 'Activités recommandées' })}
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {activities.length === 0 && hiddenRecommendationSections.includes('education_activities') && (
            <div className="p-4">
              <div className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm font-black text-on-surface">
                  {localeText(i18n.language, { 'zh-CN': '暂时没有匹配到活动建议', 'en-US': 'No activity match yet', 'ja-JP': 'まだ活動提案がありません', 'ko-KR': '아직 활동 추천이 없어요', 'es-ES': 'Aún no hay actividades sugeridas', 'fr-FR': 'Pas encore d’activité suggérée' })}
                </p>
                <p className="text-xs font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                  {localeText(i18n.language, { 'zh-CN': '可以继续补充孩子兴趣、空余时间和家庭偏好，系统会根据日程画像更新推荐。', 'en-US': 'Add interests, free time and family preferences; recommendations will update from the profile.', 'ja-JP': '興味・空き時間・家庭の希望を追加すると提案が更新されます。', 'ko-KR': '관심사, 여유 시간, 가족 선호를 추가하면 추천이 갱신됩니다.', 'es-ES': 'Añada intereses, tiempo libre y preferencias; las recomendaciones se actualizarán.', 'fr-FR': 'Ajoutez intérêts, temps libre et préférences; les suggestions seront mises à jour.' })}
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
                      {localeText(i18n.language, {
                        'zh-CN': act.priority,
                        'en-US': act.priority === '强烈推荐' ? 'Best fit' : act.priority === '推荐' ? 'Recommended' : 'Optional',
                        'ja-JP': act.priority === '强烈推荐' ? '特におすすめ' : act.priority === '推荐' ? 'おすすめ' : '任意',
                        'ko-KR': act.priority === '强烈推荐' ? '강력 추천' : act.priority === '推荐' ? '추천' : '선택',
                        'es-ES': act.priority === '强烈推荐' ? 'Muy recomendado' : act.priority === '推荐' ? 'Recomendado' : 'Opcional',
                        'fr-FR': act.priority === '强烈推荐' ? 'Très conseillé' : act.priority === '推荐' ? 'Conseillé' : 'Optionnel',
                      })}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant/40 px-2 py-0.5 rounded-full bg-outline-variant/10">
                      {act.category}
                    </span>
                  </div>
                  <p className="text-sm font-black text-on-surface mt-1.5">{act.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-primary">
                    {localeText(i18n.language, { 'zh-CN': `${act.weeklyHours}h/周`, 'en-US': `${act.weeklyHours}h/wk`, 'ja-JP': `週${act.weeklyHours}h`, 'ko-KR': `주 ${act.weeklyHours}h`, 'es-ES': `${act.weeklyHours}h/sem`, 'fr-FR': `${act.weeklyHours}h/sem` })}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface-variant/40">
                    {localeText(i18n.language, { 'zh-CN': `建议${act.recommendedAge}`, 'en-US': `Age ${act.recommendedAge}`, 'ja-JP': `対象 ${act.recommendedAge}`, 'ko-KR': `권장 ${act.recommendedAge}`, 'es-ES': `Edad ${act.recommendedAge}`, 'fr-FR': `Âge ${act.recommendedAge}` })}
                  </p>
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
            {localeText(i18n.language, { 'zh-CN': '谨慎考虑的方向', 'en-US': 'Consider carefully', 'ja-JP': '慎重に検討', 'ko-KR': '신중히 고려', 'es-ES': 'Considerar con cuidado', 'fr-FR': 'À considérer prudemment' })}
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
          <h3 className="font-black text-sm text-on-surface">
            {localeText(i18n.language, { 'zh-CN': '各科学习策略建议', 'en-US': 'Learning strategy suggestions', 'ja-JP': '学習戦略の提案', 'ko-KR': '학습 전략 제안', 'es-ES': 'Sugerencias de aprendizaje', 'fr-FR': 'Conseils d’apprentissage' })}
          </h3>
        </div>
        <div className="divide-y divide-outline-variant/5">
          {rec.subjectAdvice.map((advice, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-on-surface">{uiLabel(advice.subject, i18n.language)}</p>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    advice.status === '强项'
                      ? "bg-primary-container/20 text-primary"
                      : advice.status === '薄弱'
                        ? "bg-danger-container text-danger"
                        : "bg-surface-container text-on-surface-variant"
                  )}>
                    {localeText(i18n.language, {
                      'zh-CN': advice.status,
                      'en-US': advice.status === '强项' ? 'Strength' : advice.status === '薄弱' ? 'Needs support' : 'Stable',
                      'ja-JP': advice.status === '强项' ? '得意' : advice.status === '薄弱' ? '要サポート' : '安定',
                      'ko-KR': advice.status === '强项' ? '강점' : advice.status === '薄弱' ? '보완 필요' : '안정',
                      'es-ES': advice.status === '强项' ? 'Fortaleza' : advice.status === '薄弱' ? 'A reforzar' : 'Estable',
                      'fr-FR': advice.status === '强项' ? 'Point fort' : advice.status === '薄弱' ? 'À soutenir' : 'Stable',
                    })}
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
                  {localeText(i18n.language, { 'zh-CN': '学习资源推荐未开启', 'en-US': 'Learning resource suggestions are off', 'ja-JP': '学習リソース提案は未有効', 'ko-KR': '학습 자료 추천이 꺼져 있어요', 'es-ES': 'Las sugerencias de recursos están desactivadas', 'fr-FR': 'Suggestions de ressources désactivées' })}
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
          title={step <= 4
            ? localeText(i18n.language, { 'zh-CN': '智能日程优化', 'en-US': 'Smart Schedule Builder', 'ja-JP': 'スマート日程作成', 'ko-KR': '스마트 일정 만들기', 'es-ES': 'Constructor de agenda', 'fr-FR': 'Créateur d’agenda' })
            : localeText(i18n.language, { 'zh-CN': '优化方案', 'en-US': 'Schedule Plan', 'ja-JP': '日程プラン', 'ko-KR': '일정 계획', 'es-ES': 'Plan de agenda', 'fr-FR': 'Plan d’agenda' })}
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
                <p className="text-xs font-black text-danger">{localeText(i18n.language, { 'zh-CN': '生成失败', 'en-US': 'Generation failed', 'ja-JP': '生成に失敗しました', 'ko-KR': '생성 실패', 'es-ES': 'Error al generar', 'fr-FR': 'Échec de génération' })}</p>
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
                  {step === 0 ? localeText(i18n.language, { 'zh-CN': `下一步：${scheduleSkill.academicStepTitle}`, 'en-US': 'Next: Learning & time', 'ja-JP': '次へ：学習と時間', 'ko-KR': '다음: 학습과 시간', 'es-ES': 'Siguiente: aprendizaje y tiempo', 'fr-FR': 'Suivant : apprentissage et temps' }) :
                   step === 1 ? localeText(i18n.language, { 'zh-CN': '下一步：兴趣与特长', 'en-US': 'Next: Interests', 'ja-JP': '次へ：興味と得意分野', 'ko-KR': '다음: 관심과 특기', 'es-ES': 'Siguiente: intereses', 'fr-FR': 'Suivant : centres d’intérêt' }) :
                   localeText(i18n.language, { 'zh-CN': '下一步：性格与期望', 'en-US': 'Next: Personality & expectations', 'ja-JP': '次へ：性格と期待', 'ko-KR': '다음: 성격과 기대', 'es-ES': 'Siguiente: personalidad y expectativas', 'fr-FR': 'Suivant : personnalité et attentes' })}
                  <ChevronRight size={18} />
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {localeText(i18n.language, { 'zh-CN': '开始生成智能方案', 'en-US': 'Generate smart plan', 'ja-JP': 'スマートプランを生成', 'ko-KR': '스마트 계획 생성', 'es-ES': 'Generar plan inteligente', 'fr-FR': 'Générer le plan' })}
                </>
              )}
            </button>

            {/* 如果已经有信息，跳过直接生成 */}
            {step < 3 && (
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-2xl text-on-surface-variant/60 font-black text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
              >
                {localeText(i18n.language, { 'zh-CN': '已有足够信息，直接生成', 'en-US': 'Enough information, generate now', 'ja-JP': '十分な情報があります。今すぐ生成', 'ko-KR': '정보가 충분해요, 바로 생성', 'es-ES': 'Ya hay datos suficientes, generar ahora', 'fr-FR': 'Assez d’informations, générer maintenant' })}
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
