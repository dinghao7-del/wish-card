import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import { useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import { getThemeClass } from '@/lib/themeSkins';
import {
  buildScheduleOptimizationSkill,
  sanitizeChildProfileForScheduleStage,
  type ChildProfile,
} from '@/lib/scheduleRecommendAI';
import './index.scss';

/**
 * AI 智能日程推荐 — 对齐 Web ScheduleRecommend.tsx (1099行)
 * 小程序精简版 (~550行): 6步表单 → AI模拟生成 → 结果展示
 */

// ===== 常量定义（对齐 Web）=====
const GRADE_OPTIONS = [
  '幼儿园小班', '幼儿园中班', '幼儿园大班',
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三',
  '高一', '高二', '高三',
];

const PERSONALITY = [
  '外向活泼', '内向文静', '好动坐不住', '专注力好',
  '胆小谨慎', '勇于尝试', '敏感细腻', '大大咧咧',
  '喜欢社交', '喜欢独处', '争强好胜', '随和佛系',
  '动手能力强', '语言表达好', '逻辑思维强', '想象力丰富',
];

const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉',
  '南京', '西安', '重庆', '长沙', '苏州', '天津', '郑州', '其他'];

type StepNum = 0 | 1 | 2 | 3 | 4 | 5;

interface ChildProfileData {
  gender: 'boy' | 'girl' | '';
  grade: string;
  age: number | null;
  city: string;
  schoolType: string;
  strongSubjects: string[];
  weakSubjects: string[];
  homeworkHours: number | null;
  freeTime: number | null;
  interests: string[];
  screenTime: number | null;
  personalities: string[];
  expectations: string[];
  budget: number | null;
  notes: string;
}

const toSchoolType = (value: string): ChildProfile['schoolType'] => (
  value === '公立' || value === '私立' || value === '国际' ? value : ''
);

const toChildProfile = (source: ChildProfileData): ChildProfile => ({
  gender: source.gender,
  age: source.age,
  grade: source.grade,
  city: source.city,
  schoolType: toSchoolType(source.schoolType),
  strongSubjects: source.strongSubjects,
  weakSubjects: source.weakSubjects,
  existingInterests: source.interests,
  existingSchedules: [],
  personality: source.personalities,
  personalityOther: '',
  homeworkDuration: source.homeworkHours,
  freeTimePerDay: source.freeTime,
  parentExpectation: source.expectations,
  expectationOther: '',
  budget: source.budget,
  screenTime: source.screenTime ? `${source.screenTime}小时/天` : '',
  healthNotes: '',
  otherNotes: source.notes,
});

export default function ScheduleRecommend() {
  const [step, setStep] = useState<StepNum>(0);

  // 表单数据（对齐 Web ChildProfile）
  const [form, setForm] = useState<ChildProfileData>({
    gender: '', grade: '', age: null, city: '', schoolType: '',
    strongSubjects: [], weakSubjects: [], homeworkHours: null, freeTime: null,
    interests: [], screenTime: null,
    personalities: [], expectations: [], budget: null, notes: '',
  });

  // 结果状态
  const [result, setResult] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend' | 'activities' | 'strategy'>('weekday');
  const [isGenerating, setIsGenerating] = useState(false);
  const scheduleSkill = buildScheduleOptimizationSkill(toChildProfile(form));
  const interestOptions = form.gender === 'boy'
    ? scheduleSkill.interestOptions.boy
    : form.gender === 'girl'
      ? scheduleSkill.interestOptions.girl
      : scheduleSkill.interestOptions.all;

  const updateFormForStage = (next: ChildProfileData) => {
    const safe = sanitizeChildProfileForScheduleStage(toChildProfile(next));
    setForm({
      ...next,
      strongSubjects: safe.strongSubjects,
      weakSubjects: safe.weakSubjects,
    });
  };

  /** ChipSelect 切换 */
  const toggleChip = (field: keyof ChildProfileData, val: string, multi = true) => {
    const current = form[field] as string[];
    const nextValue = multi
      ? current.includes(val) ? current.filter(v => v !== val) : [...current, val]
      : [val];
    const next = { ...form, [field]: nextValue } as ChildProfileData;
    if (multi) {
      if (field === 'strongSubjects' || field === 'weakSubjects') updateFormForStage(next);
      else setForm(next);
    } else {
      setForm(next);
    }
  };

  /** 下一步 */
  const goNext = () => {
    if (step < 3) setStep((step + 1) as StepNum);
    else startGenerate();
  };

  /** 上一步 */
  const goPrev = () => { if (step > 0) setStep((step - 1) as StepNum); };

  /** 模拟AI生成（对齐 Web generateScheduleRecommendation） */
  const startGenerate = () => {
    setStep(4);
    setIsGenerating(true);
    // 模拟AI分析延迟 3秒
    setTimeout(() => {
      setIsGenerating(false);
      setResult(generateMockResult(form));
      setStep(5);
    }, 2800);
  };

  /** 反馈修订（对齐 Web refineScheduleRecommendation） */
  const handleRefine = () => {
    if (!feedbackText.trim()) return;
    Taro.showToast({ title: '正在调整方案...', icon: 'loading' });
    setTimeout(() => {
      Taro.showToast({ title: '方案已更新！', icon: 'success' });
      setFeedbackText('');
      // 实际项目中这里会调用 refineScheduleRecommendation API
    }, 1500);
  };

  /** 保存为计划（对齐 Web → Plans 页面） */
  const handleSavePlan = () => {
    Taro.showToast({ title: '已保存到我的计划', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1200);
  };

  return (
    <View className={`sr-page ${getThemeClass()}`}>
      {/* ===== 进度条（始终显示）===== */}
      <View className="sr-progress-bar">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} className={`sr-dot ${step >= i ? 'active' : ''} ${step === i ? 'current' : ''}`}>
            {i < 4 ? <Text className="sr-dot-label">{i + 1}</Text> : i === 4 ? <Icon name="sparkles" size={14} color={MINI_UI_COLORS.onPrimary} /> : <Icon name="check" size={14} color={MINI_UI_COLORS.onPrimary} />}
          </View>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={`line-${i}`} className={`sr-line ${step > i ? 'active' : ''}`} />
        ))}
      </View>

      {/* ===== Step 0: 基本信息 ===== */}
      {step === 0 && (
        <ScrollView scrollY className="sr-step-view">
          <View className="sr-header"><Text className="sr-title">基本信息</Text></View>

          {/* 性别选择（大卡片） */}
          <Text className="sr-field-label">孩子的性别</Text>
          <View className="sr-gender-row">
            <View
              className={`sr-gender-card ${form.gender === 'boy' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, gender: 'boy' })}
            >
              <Text className="sr-gender-icon">👦</Text>
              <Text className="sr-gender-text">男孩</Text>
            </View>
            <View
              className={`sr-gender-card ${form.gender === 'girl' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, gender: 'girl' })}
            >
              <Text className="sr-gender-icon">👧</Text>
              <Text className="sr-gender-text">女孩</Text>
            </View>
          </View>

          {/* 年级 */}
          <Text className="sr-field-label">就读年级</Text>
          <View className="sr-chips">{GRADE_OPTIONS.map(g => (
            <View
              key={g} className={`sr-chip ${form.grade === g ? 'active' : ''}`}
              onClick={() => updateFormForStage({ ...form, grade: g })}
            ><Text className={`sr-chip-text ${form.grade === g ? 'active' : ''}`}>{g}</Text></View>
          ))}</View>

          {/* 年龄 + 城市 */}
          <View className="sr-row-2">
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">年龄</Text>
              <Input className="sr-input" type="number" placeholder="如: 8"
                value={form.age ? String(form.age) : ''}
                onInput={(e: any) => updateFormForStage({ ...form, age: parseInt(e.detail.value) || null })} />
            </View>
            <View className="sr-input-group" style={{ flex: 1.5 }}>
              <Text className="sr-field-label">所在城市</Text>
              <View className="sr-city-scroll">
                <ScrollView scrollX className="sr-city-list">
                  {CITIES.map(c => (
                    <View key={c} className={`sr-city-pill ${form.city === c ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, city: c })}>
                      <Text className={`sr-city-text ${form.city === c ? 'active' : ''}`}>{c}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View className="sr-nav-btns">
            <View className="sr-next-btn" onClick={goNext}><Text className="sr-next-text">下一步</Text></View>
          </View>
        </ScrollView>
      )}

      {/* ===== Step 1: 学业与时间 ===== */}
      {step === 1 && (
        <ScrollView scrollY className="sr-step-view">
          <View className="sr-header"><Text className="sr-title">{scheduleSkill.academicStepTitle}</Text></View>

          <Text className="sr-field-label">{scheduleSkill.strengthLabel}（可多选）</Text>
          <View className="sr-chips">{scheduleSkill.subjectOptions.map(s => (
            <View key={s} className={`sr-chip ${form.strongSubjects.includes(s) ? 'active' : ''}`}
              onClick={() => toggleChip('strongSubjects', s)}>
              <Text className={`sr-chip-text ${form.strongSubjects.includes(s) ? 'active' : ''}`}>{s}</Text>
            </View>
          ))}</View>

          <Text className="sr-field-label">{scheduleSkill.challengeLabel}（可多选）</Text>
          <View className="sr-chips">{scheduleSkill.subjectOptions.map(s => (
            <View key={s} className={`sr-chip ${form.weakSubjects.includes(s) ? 'active' : ''}`}
              onClick={() => toggleChip('weakSubjects', s)}>
              <Text className={`sr-chip-text ${form.weakSubjects.includes(s) ? 'active' : ''}`}>{s}</Text>
            </View>
          ))}</View>

          <View className="sr-row-2">
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">{scheduleSkill.homeworkLabel}</Text>
              <Input className="sr-input" type="digit" placeholder={scheduleSkill.homeworkPlaceholder}
                value={form.homeworkHours ? String(form.homeworkHours) : ''}
                onInput={(e: any) => setForm({ ...form, homeworkHours: parseFloat(e.detail.value) || null })} />
            </View>
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">{scheduleSkill.freeTimeLabel}</Text>
              <Input className="sr-input" type="digit" placeholder={scheduleSkill.freeTimePlaceholder}
                value={form.freeTime ? String(form.freeTime) : ''}
                onInput={(e: any) => setForm({ ...form, freeTime: parseFloat(e.detail.value) || null })} />
            </View>
          </View>

          <View className="sr-nav-btns">
            <View className="sr-prev-btn" onClick={goPrev}><Text className="sr-prev-text">上一步</Text></View>
            <View className="sr-next-btn" onClick={goNext}><Text className="sr-next-text">下一步</Text></View>
          </View>
        </ScrollView>
      )}

      {/* ===== Step 2: 兴趣与特长 ===== */}
      {step === 2 && (
        <ScrollView scrollY className="sr-step-view">
          <View className="sr-header"><Text className="sr-title">兴趣与特长</Text></View>

          <Text className="sr-field-label">已参加的兴趣班（可多选）</Text>
          <View className="sr-chips">
            {interestOptions.map(int => (
              <View key={int} className={`sr-chip ${form.interests.includes(int) ? 'active' : ''}`}
                onClick={() => toggleChip('interests', int)}>
                <Text className={`sr-chip-text ${form.interests.includes(int) ? 'active' : ''}`}>{int}</Text>
              </View>
            ))}
          </View>

          <View className="sr-row-2">
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">日均屏幕时间</Text>
              <Input className="sr-input" type="digit" placeholder="小时"
                value={form.screenTime ? String(form.screenTime) : ''}
                onInput={(e: any) => setForm({ ...form, screenTime: parseFloat(e.detail.value) || null })} />
            </View>
          </View>

          <View className="sr-nav-btns">
            <View className="sr-prev-btn" onClick={goPrev}><Text className="sr-prev-text">上一步</Text></View>
            <View className="sr-next-btn" onClick={goNext}><Text className="sr-next-text">下一步</Text></View>
          </View>
        </ScrollView>
      )}

      {/* ===== Step 3: 性格与期望 ===== */}
      {step === 3 && (
        <ScrollView scrollY className="sr-step-view">
          <View className="sr-header"><Text className="sr-title">性格与期望</Text></View>

          <Text className="sr-field-label">性格特点（可多选）</Text>
          <View className="sr-chips">{PERSONALITY.map(p => (
            <View key={p} className={`sr-chip ${form.personalities.includes(p) ? 'active' : ''}`}
              onClick={() => toggleChip('personalities', p)}>
              <Text className={`sr-chip-text ${form.personalities.includes(p) ? 'active' : ''}`}>{p}</Text>
            </View>
          ))}</View>

          <Text className="sr-field-label">家长期望（可多选）</Text>
          <View className="sr-chips">{scheduleSkill.parentExpectationOptions.map(e => (
            <View key={e} className={`sr-chip ${form.expectations.includes(e) ? 'active' : ''}`}
              onClick={() => toggleChip('expectations', e)}>
              <Text className={`sr-chip-text ${form.expectations.includes(e) ? 'active' : ''}`}>{e}</Text>
            </View>
          ))}</View>

          <View className="sr-input-group">
            <Text className="sr-field-label">月度教育预算</Text>
            <Input className="sr-input" type="digit" placeholder="元/月"
              value={form.budget ? String(form.budget) : ''}
              onInput={(e: any) => setForm({ ...form, budget: parseInt(e.detail.value) || null })} />
          </View>

          <View className="sr-input-group">
            <Text className="sr-field-label">其他补充说明</Text>
            <Textarea className="sr-textarea" placeholder="如: 孩子最近睡眠不好、想加强体育锻炼等..."
              value={form.notes}
              onInput={(e: any) => setForm({ ...form, notes: e.detail.value })} />
          </View>

          <View className="sr-nav-btns">
            <View className="sr-prev-btn" onClick={goPrev}><Text className="sr-prev-text">上一步</Text></View>
            <View className="sr-next-btn sr-primary" onClick={goNext}><Text className="sr-next-text">🚀 开始生成推荐</Text></View>
          </View>
        </ScrollView>
      )}

      {/* ===== Step 4: 生成中 ===== */}
      {step === 4 && (
        <View className="sr-generating">
          <Icon name="loader-2" size={80} color={MINI_UI_COLORS.primary} className="spin" />
          <Text className="sr-gen-title">AI 正在分析...</Text>
          <Text className="sr-gen-sub">根据您提供的信息，为孩子量身定制日程方案</Text>
          <View className="sr-gen-steps">
            <View className={`sr-gen-step ${isGenerating ? 'active' : 'done'}`}>
              <Icon name={isGenerating ? "loader-2" : "checkCircle"} size={24} color={MINI_UI_COLORS.primary} />
              <Text>收集画像信息</Text>
            </View>
            <View className={`sr-gen-step ${isGenerating ? 'pending' : 'done'}`}>
              <Icon name={isGenerating ? "loader-2" : "checkCircle"} size={24} color={MINI_UI_COLORS.primary} />
              <Text>AI 分析匹配</Text>
            </View>
            <View className={`sr-gen-step ${isGenerating ? 'pending' : 'done'}`}>
              <Icon name={isGenerating ? "loader-2" : "checkCircle"} size={24} color={MINI_UI_COLORS.primary} />
              <Text>生成推荐方案</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== Step 5: 推荐结果 ===== */}
      {step === 5 && result && (
        <ScrollView scrollY className="sr-result-view">
          <View className="sr-header">
            <Text className="sr-title">推荐结果</Text>
            <View className="sr-restart-btn" onClick={() => { setStep(0); setResult(null); }}>
              <Icon name="refresh-cw" size={28} color={MINI_UI_COLORS.primary} />
              <Text className="sr-restart-text">重新开始</Text>
            </View>
          </View>

          {/* AI摘要卡 */}
          <View className="sr-summary-card">
            <View className="sr-summary-head"><Icon name="sparkles" size={28} color={MINI_UI_COLORS.reward} /><Text className="sr-summary-title">AI 摘要</Text></View>
            <Text className="sr-summary-text">{result.summary}</Text>
          </View>

          {/* Tab切换：平日/周末/推荐活动/学习策略 */}
          <View className="sr-result-tabs">
            {(['weekday', 'weekend', 'activities', 'strategy'] as const).map(tab => (
              <View key={tab} className={`sr-rtab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}>
                <Text className={`sr-rtab-text ${activeTab === tab ? 'active' : ''}`}>
                  {tab === 'weekday' ? '📅 平日' : tab === 'weekend' ? '🎮 周末' : tab === 'activities' ? '⭐ 活动' : '📖 策略'}
                </Text>
              </View>
            ))}
          </View>

          {/* Tab内容 */}
          <View className="sr-tab-content">
            {(activeTab === 'weekday' || activeTab === 'weekend') && (
              <View className="sr-timeline">
                {(activeTab === 'weekday' ? result.weekday : result.weekend)?.map((item: any, i: number) => (
                  <View key={i} className={`sr-tl-item ${item.special ? 'special' : ''}`}>
                    <View className="sr-tl-time"><Text>{item.time}</Text></View>
                    <View className="sr-tl-dot" style={{ backgroundColor: item.color || MINI_UI_COLORS.primary }} />
                    <View className="sr-tl-body">
                      <Text className="sr-tl-title">{item.title}</Text>
                      <Text className="sr-tl-desc">{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {activeTab === 'activities' && (
              <View className="sr-act-grid">
                {result.activities?.map((act: any, i: number) => (
                  <View key={i} className="sr-act-card">
                    <Text className="sr-act-priority">P{act.priority || (i % 3) + 1}</Text>
                    <Text className="sr-act-name">{act.name}</Text>
                    <Text className="sr-act-meta">{act.duration || '30min'} · {act.category || '运动'}</Text>
                    <Text className="sr-act-reason">{act.reason}</Text>
                  </View>
                ))}
              </View>
            )}
            {activeTab === 'strategy' && (
              <View className="sr-strategy-list">
                {result.strategies?.map((s: string, i: number) => (
                  <View key={i} className="sr-strategy-item">
                    <Icon name="arrowRight" size={24} color={MINI_UI_COLORS.primary} />
                    <Text className="sr-strategy-text">{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 家长建议卡 */}
          {result.parentTips && (
            <View className="sr-tips-card">
              <Text className="sr-tips-title">💡 给家长的建议</Text>
              {result.parentTips.map((tip: string, i: number) => (
                <Text key={i} className="sr-tip-item">{i + 1}. {tip}</Text>
              ))}
            </View>
          )}

          {/* 反馈修订 */}
          <View className="sr-feedback">
            <Text className="sr-fb-title">对方案有想法？告诉AI调整</Text>
            <View className="sr-fb-row">
              <Input className="sr-fb-input" placeholder="如: 减少一点作业时间..."
                value={feedbackText} onInput={(e: any) => setFeedbackText(e.detail.value)} />
              <View className="sr-fb-send" onClick={handleRefine}>
                <Text className="sr-fb-send-text">发送</Text>
              </View>
            </View>
          </View>

          {/* 底部操作 */}
          <View className="sr-result-actions">
            <View className="sr-save-btn" onClick={handleSavePlan}>
              <Icon name="save" size={28} color={MINI_UI_COLORS.onPrimary} />
              <Text className="sr-save-text">保存为计划</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
 );
}

// ===== 模拟数据生成器（替代真实 AI API）======
function generateMockResult(form: ChildProfileData): any {
  const profile = toChildProfile(form);
  const skill = buildScheduleOptimizationSkill(profile);
  const isPreschool = skill.stage.key === 'preschool';
  const grade = form.grade || '小学';
  const name = form.gender === 'girl' ? '她' : '他';
  const firstInterest = form.interests[0] || (isPreschool ? '亲子户外游戏' : '自由阅读');
  const firstFocus = form.strongSubjects[0] || skill.subjectOptions[0];
  const secondFocus = form.weakSubjects[0] || skill.subjectOptions[1] || firstFocus;

  return {
    summary: isPreschool
      ? `基于${name}${grade}${form.age || ''}岁的阶段特点，这份方案不按学科补习来设计，而是围绕${skill.stage.coreFocus.join('、')}来安排。每天优先保障${skill.stage.sleepTarget}睡眠、户外活动和稳定睡前流程。`
      : `基于${name}${grade}${form.age || ''}岁的特点，建议采用「学习-休息-兴趣」交替模式。每天保证${skill.stage.sleepTarget}睡眠，学习时间分段进行，周末增加户外活动时间。`,
    weekday: isPreschool
      ? [
        { time: '07:00-07:30', title: '起床洗漱', desc: '自己穿衣、洗脸刷牙，练习生活自理', color: MINI_UI_COLORS.scheduleNeutral, special: true },
        { time: '07:30-08:00', title: '早餐和出门准备', desc: '给孩子一个可预期的出门节奏', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '08:00-16:00', title: '幼儿园一日活动', desc: '以游戏、社交、户外和生活规则为主', color: MINI_UI_COLORS.scheduleBlue, special: true },
        { time: '16:30-17:30', title: '户外自由玩', desc: '跑跳攀爬、球类或亲子散步，释放精力', color: MINI_UI_COLORS.scheduleSport },
        { time: '17:30-18:30', title: '晚餐和家务小帮手', desc: '参与摆餐具、收玩具，培养责任感', color: MINI_UI_COLORS.scheduleOrange },
        { time: '18:30-19:00', title: firstInterest, desc: '保持轻松体验，不用用结果考核孩子', color: MINI_UI_COLORS.scheduleViolet },
        { time: '19:00-19:30', title: '亲子绘本和表达', desc: `围绕${firstFocus}做讲述、复述或角色扮演`, color: MINI_UI_COLORS.primary },
        { time: '19:30-20:10', title: '洗漱和安静游戏', desc: '减少屏幕刺激，给睡眠降速', color: MINI_UI_COLORS.scheduleCyan, special: true },
        { time: '20:10-20:30', title: '睡前故事', desc: '用固定仪式稳定安全感', color: MINI_UI_COLORS.schedulePurple },
        { time: '20:30-', title: '入睡', desc: `目标睡眠${skill.stage.sleepTarget}`, color: MINI_UI_COLORS.scheduleIndigo, special: true },
      ]
      : [
        { time: '06:30-07:00', title: '起床洗漱', desc: '', color: MINI_UI_COLORS.scheduleNeutral, special: true },
        { time: '07:00-07:30', title: '早餐', desc: '营养均衡', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '07:30-08:00', title: '晨读/英语', desc: '记忆黄金期', color: MINI_UI_COLORS.primary },
        { time: '08:00-11:30', title: '在校学习', desc: '认真听课', color: MINI_UI_COLORS.scheduleBlue, special: true },
        { time: '11:30-12:30', title: '午餐+休息', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '12:30-13:30', title: '午休', desc: '30-45分钟午睡', color: MINI_UI_COLORS.schedulePurple, special: true },
        { time: '13:30-15:00', title: '作业时间①', desc: `先处理${secondFocus}`, color: MINI_UI_COLORS.primary },
        { time: '15:00-15:20', title: '休息/水果', desc: '远眺放松眼睛', color: MINI_UI_COLORS.scheduleGreen },
        { time: '15:20-16:30', title: '作业时间②', desc: `${firstFocus}巩固`, color: MINI_UI_COLORS.primary },
        { time: '16:30-17:30', title: '户外活动', desc: '跳绳/跑步/球类', color: MINI_UI_COLORS.scheduleSport },
        { time: '17:30-18:00', title: '晚餐', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '18:00-19:00', title: '兴趣班/阅读', desc: firstInterest, color: MINI_UI_COLORS.scheduleViolet },
        { time: '19:00-19:20', title: '休息', desc: '', color: MINI_UI_COLORS.scheduleGreen },
        { time: '19:20-20:00', title: '复习预习', desc: '当日总结', color: MINI_UI_COLORS.primary },
        { time: '20:00-20:30', title: '洗漱/亲子时光', desc: '', color: MINI_UI_COLORS.scheduleCyan, special: true },
        { time: '20:30-', title: '就寝', desc: '保证充足睡眠', color: MINI_UI_COLORS.scheduleIndigo, special: true },
      ],
    weekend: isPreschool
      ? [
        { time: '08:00-08:30', title: '自然醒和早餐', desc: '周末也尽量不大幅打乱作息', color: MINI_UI_COLORS.scheduleNeutral, special: true },
        { time: '09:00-10:30', title: '户外探索', desc: '公园、自然观察、骑行或亲子运动', color: MINI_UI_COLORS.scheduleSport },
        { time: '10:30-11:00', title: '绘本/手工', desc: '用故事和动手活动延展表达', color: MINI_UI_COLORS.primary },
        { time: '12:00-14:00', title: '午餐和午休', desc: '保护午休节奏', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '15:00-16:30', title: '兴趣体验', desc: firstInterest, color: MINI_UI_COLORS.scheduleViolet },
        { time: '17:00-18:30', title: '自由玩和家庭时间', desc: '让孩子有自己安排游戏的空间', color: MINI_UI_COLORS.scheduleSky },
        { time: '19:30-20:30', title: '洗漱和睡前故事', desc: '减少屏幕刺激', color: MINI_UI_COLORS.scheduleCyan, special: true },
      ]
      : [
        { time: '08:00-08:30', title: '起床早餐', desc: '可以比平时晚起', color: MINI_UI_COLORS.scheduleNeutral, special: true },
        { time: '08:30-09:30', title: '晨间活动', desc: '户外运动/散步', color: MINI_UI_COLORS.scheduleSport },
        { time: '09:30-11:00', title: '学习时段①', desc: `${secondFocus}攻坚`, color: MINI_UI_COLORS.primary },
        { time: '11:00-11:20', title: '休息', desc: '', color: MINI_UI_COLORS.scheduleGreen },
        { time: '11:20-12:00', title: '学习时段②', desc: '', color: MINI_UI_COLORS.primary },
        { time: '12:00-13:30', title: '午餐+午休', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '13:30-15:30', title: '兴趣班/特长训练', desc: firstInterest, color: MINI_UI_COLORS.scheduleViolet },
        { time: '15:30-16:00', title: '下午茶休息', desc: '', color: MINI_UI_COLORS.scheduleOrange },
        { time: '16:00-17:30', title: '自由活动/社交', desc: '和朋友玩耍', color: MINI_UI_COLORS.scheduleSky },
        { time: '17:30-18:30', title: '晚餐', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
        { time: '18:30-19:30', title: '家庭时间/电影/桌游', desc: '', color: MINI_UI_COLORS.schedulePink },
        { time: '19:30-20:00', title: '下周准备', desc: '整理书包/检查作业', color: MINI_UI_COLORS.primary },
        { time: '20:00-20:30', title: '洗漱', desc: '', color: MINI_UI_COLORS.scheduleCyan, special: true },
        { time: '20:30-', title: '就寝', desc: '', color: MINI_UI_COLORS.scheduleIndigo, special: true },
      ],
    activities: isPreschool
      ? [
        { name: firstInterest, duration: '45min', category: '运动健康', priority: 1, reason: '用游戏和真实体验建立兴趣，不做结果考核' },
        { name: '亲子绘本', duration: '20min', category: '语言表达', priority: 1, reason: '帮助孩子表达感受、复述故事和积累词汇' },
        { name: '生活自理小任务', duration: '10min', category: '生活技能', priority: 2, reason: '把穿衣、收纳、摆餐具变成可完成的小挑战' },
        { name: '自然观察', duration: '30min', category: '自然探索', priority: 2, reason: '保护好奇心和观察力' },
        { name: '创意美术/手工', duration: '25min', category: '艺术感受', priority: 3, reason: '发展精细动作和表达欲' },
      ]
      : [
        { name: form.interests[0] || '户外运动', duration: '45min', category: '运动健康', priority: 1, reason: '增强体质，释放精力' },
        { name: form.interests[1] || '阅读绘本', duration: '30min', category: '认知发展', priority: 2, reason: '培养阅读习惯和想象力' },
        { name: firstFocus, duration: '25min', category: '学科拓展', priority: 2, reason: '巩固优势，建立自信' },
        { name: '家务劳动', duration: '15min', category: '生活技能', priority: 3, reason: '培养责任感和独立性' },
        { name: '亲子游戏', duration: '20min', category: '家庭互动', priority: 3, reason: '增进亲子关系' },
        { name: '自由探索', duration: '30min', category: '创造力', priority: 3, reason: '激发好奇心和创造力' },
      ],
    strategies: isPreschool
      ? [
        '不要用强弱科目评价幼儿园孩子，先看睡眠、户外、表达、社交和生活自理。',
        `${secondFocus}可以通过游戏、绘本、家务和户外观察慢慢练，不需要刷题。`,
        '每天保留自由玩时间，孩子自己安排游戏也是能力发展的一部分。',
        '屏幕时间尽量放在白天短时使用，睡前一小时不要使用电子设备。',
        `如果要推荐产品，优先匹配${skill.commercialRecommendationAngles.slice(0, 3).join('、')}方向。`,
      ]
      : [
        `${secondFocus}建议使用费曼学习法：让孩子讲给你听`,
        '学习环境要安静整洁，减少视觉干扰',
        '每完成一个任务给予正向鼓励（不一定是物质奖励）',
        '屏幕时间控制在每天1小时内，且避免睡前1小时使用',
        '周末至少安排2小时户外活动',
        `月预算${form.budget || '合理'}元建议优先投入${form.interests[0] || '运动类'}兴趣培养`,
        '保持规律作息，固定时间做固定的事有助于养成习惯',
        `${name}性格${form.personalities[0] || '活泼'}，适合用游戏化方式激励学习`,
      ],
    parentTips: isPreschool
      ? [
        '幼儿园阶段不是提前学小学，而是把睡眠、运动、表达、社交和自理打稳。',
        '高质量陪伴可以很短，但要稳定、可预期、能被孩子感受到。',
        '兴趣体验先看孩子是否愿意持续参与，不要过早用成果和考级压住兴趣。',
        '如果孩子抗拒，先调整节奏和环境，再讨论内容本身。',
      ]
      : [
        '不要拿别人家的孩子比较，关注孩子的进步',
        '规律作息比临时突击更有效',
        '兴趣是最好的老师，保护孩子的好奇心',
        '高质量的陪伴胜过昂贵的培训班',
        '允许适当的"无聊"时间，这能激发创造力',
      ],
  };
}
