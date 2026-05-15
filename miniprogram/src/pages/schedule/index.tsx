import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import { useState, useRef } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import { getThemeClass } from '@/lib/themeSkins';
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

const SUBJECT_OPTIONS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '历史', '地理', '政治', '科学', '编程', '美术', '音乐',
];

const INTEREST_MALE = [
  '篮球', '足球', '游泳', '武术/跆拳道', '编程', '围棋/象棋',
  '乐高/机器人', '架子鼓', '街舞', '画画', '轮滑', '科学实验',
];

const INTEREST_FEMALE = [
  '中国舞/芭蕾', '钢琴', '画画', '游泳', '英语', '演讲口才',
  '书法', '羽毛球', '声乐', '陶艺/手工', '小提琴', '围棋',
];

const PERSONALITY = [
  '外向活泼', '内向文静', '好动坐不住', '专注力好',
  '胆小谨慎', '勇于尝试', '敏感细腻', '大大咧咧',
  '喜欢社交', '喜欢独处', '争强好胜', '随和佛系',
  '动手能力强', '语言表达好', '逻辑思维强', '想象力丰富',
];

const EXPECTATIONS = [
  '快乐成长为主', '升学导向（注重成绩）',
  '培养特长/才艺', '增强体能/健康',
  '提升社交与自信', '培养独立自主能力',
  '打好学科基础', '发掘/培养兴趣',
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

  /** ChipSelect 切换 */
  const toggleChip = (field: keyof ChildProfileData, val: string, multi = true) => {
    const current = form[field] as string[];
    if (multi) {
      setForm({ ...form, [field]: current.includes(val) ? current.filter(v => v !== val) : [...current, val] });
    } else {
      setForm({ ...form, [field]: [val] });
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
              onClick={() => setForm({ ...form, grade: g })}
            ><Text className={`sr-chip-text ${form.grade === g ? 'active' : ''}`}>{g}</Text></View>
          ))}</View>

          {/* 年龄 + 城市 */}
          <View className="sr-row-2">
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">年龄</Text>
              <Input className="sr-input" type="number" placeholder="如: 8"
                value={form.age ? String(form.age) : ''}
                onInput={(e: any) => setForm({ ...form, age: parseInt(e.detail.value) || null })} />
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
          <View className="sr-header"><Text className="sr-title">学业与时间</Text></View>

          <Text className="sr-field-label">强项科目（可多选）</Text>
          <View className="sr-chips">{SUBJECT_OPTIONS.map(s => (
            <View key={s} className={`sr-chip ${form.strongSubjects.includes(s) ? 'active' : ''}`}
              onClick={() => toggleChip('strongSubjects', s)}>
              <Text className={`sr-chip-text ${form.strongSubjects.includes(s) ? 'active' : ''}`}>{s}</Text>
            </View>
          ))}</View>

          <Text className="sr-field-label">薄弱科目（可多选）</Text>
          <View className="sr-chips">{SUBJECT_OPTIONS.map(s => (
            <View key={s} className={`sr-chip ${form.weakSubjects.includes(s) ? 'active' : ''}`}
              onClick={() => toggleChip('weakSubjects', s)}>
              <Text className={`sr-chip-text ${form.weakSubjects.includes(s) ? 'active' : ''}`}>{s}</Text>
            </View>
          ))}</View>

          <View className="sr-row-2">
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">日均作业时长</Text>
              <Input className="sr-input" type="digit" placeholder="小时"
                value={form.homeworkHours ? String(form.homeworkHours) : ''}
                onInput={(e: any) => setForm({ ...form, homeworkHours: parseFloat(e.detail.value) || null })} />
            </View>
            <View className="sr-input-group" style={{ flex: 1 }}>
              <Text className="sr-field-label">可自由支配时间</Text>
              <Input className="sr-input" type="digit" placeholder="小时/天"
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
            {(form.gender === 'girl' ? INTEREST_FEMALE : INTEREST_MALE).map(int => (
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
          <View className="sr-chips">{EXPECTATIONS.map(e => (
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
  const grade = form.grade || '小学';
  const name = form.gender === 'girl' ? '她' : '他';

  return {
    summary: `基于${name}${grade}${form.age || ''}岁的特点，建议采用「学习-休息-兴趣」交替模式。每天保证9-10小时睡眠，学习时间分段进行，每40分钟休息10分钟。周末增加户外活动时间。`,
    weekday: [
      { time: '06:30-07:00', title: '起床洗漱', desc: '', color: MINI_UI_COLORS.scheduleNeutral, special: true },
      { time: '07:00-07:30', title: '早餐', desc: '营养均衡', color: MINI_UI_COLORS.scheduleOrange, special: true },
      { time: '07:30-08:00', title: '晨读/英语', desc: '记忆黄金期', color: MINI_UI_COLORS.primary },
      { time: '08:00-11:30', title: '在校学习', desc: '认真听课', color: MINI_UI_COLORS.scheduleBlue, special: true },
      { time: '11:30-12:30', title: '午餐+休息', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
      { time: '12:30-13:30', title: '午休', desc: '30-45分钟午睡', color: MINI_UI_COLORS.schedulePurple, special: true },
      { time: '13:30-15:00', title: '作业时间①', desc: '先做弱项科目', color: MINI_UI_COLORS.primary },
      { time: '15:00-15:20', title: '休息/水果', desc: '远眺放松眼睛', color: MINI_UI_COLORS.scheduleGreen },
      { time: '15:20-16:30', title: '作业时间②', desc: '强项巩固', color: MINI_UI_COLORS.primary },
      { time: '16:30-17:30', title: '户外活动', desc: '跳绳/跑步/球类', color: MINI_UI_COLORS.scheduleSport },
      { time: '17:30-18:00', title: '晚餐', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
      { time: '18:00-19:00', title: '兴趣班/阅读', desc: form.interests[0] || '自由阅读', color: MINI_UI_COLORS.scheduleViolet },
      { time: '19:00-19:20', title: '休息', desc: '', color: MINI_UI_COLORS.scheduleGreen },
      { time: '19:20-20:00', title: '复习预习', desc: '当日总结', color: MINI_UI_COLORS.primary },
      { time: '20:00-20:30', title: '洗漱/亲子时光', desc: '', color: MINI_UI_COLORS.scheduleCyan, special: true },
      { time: '20:30-', title: '就寝', desc: '保证充足睡眠', color: MINI_UI_COLORS.scheduleIndigo, special: true },
    ],
    weekend: [
      { time: '08:00-08:30', title: '起床早餐', desc: '可以比平时晚起', color: MINI_UI_COLORS.scheduleNeutral, special: true },
      { time: '08:30-09:30', title: '晨间活动', desc: '户外运动/散步', color: MINI_UI_COLORS.scheduleSport },
      { time: '09:30-11:00', title: '学习时段①', desc: '弱科攻坚', color: MINI_UI_COLORS.primary },
      { time: '11:00-11:20', title: '休息', desc: '', color: MINI_UI_COLORS.scheduleGreen },
      { time: '11:20-12:00', title: '学习时段②', desc: '', color: MINI_UI_COLORS.primary },
      { time: '12:00-13:30', title: '午餐+午休', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
      { time: '13:30-15:30', title: '兴趣班/特长训练', desc: form.interests[0] || '自由安排', color: MINI_UI_COLORS.scheduleViolet },
      { time: '15:30-16:00', title: '下午茶休息', desc: '', color: MINI_UI_COLORS.scheduleOrange },
      { time: '16:00-17:30', title: '自由活动/社交', desc: '和朋友玩耍', color: MINI_UI_COLORS.scheduleSky },
      { time: '17:30-18:30', title: '晚餐', desc: '', color: MINI_UI_COLORS.scheduleOrange, special: true },
      { time: '18:30-19:30', title: '家庭时间/电影/桌游', desc: '', color: MINI_UI_COLORS.schedulePink },
      { time: '19:30-20:00', title: '下周准备', desc: '整理书包/检查作业', color: MINI_UI_COLORS.primary },
      { time: '20:00-20:30', title: '洗漱', desc: '', color: MINI_UI_COLORS.scheduleCyan, special: true },
      { time: '20:30-', title: '就寝', desc: '', color: MINI_UI_COLORS.scheduleIndigo, special: true },
    ],
    activities: [
      { name: form.interests[0] || '户外运动', duration: '45min', category: '运动健康', priority: 1, reason: '增强体质，释放精力' },
      { name: form.interests[1] || '阅读绘本', duration: '30min', category: '认知发展', priority: 2, reason: '培养阅读习惯和想象力' },
      { name: form.strongSubjects[0] || '数学思维', duration: '25min', category: '学科拓展', priority: 2, reason: '巩固强项，建立自信' },
      { name: '家务劳动', duration: '15min', category: '生活技能', priority: 3, reason: '培养责任感和独立性' },
      { name: '亲子游戏', duration: '20min', category: '家庭互动', priority: 3, reason: '增进亲子关系' },
      { name: '自由探索', duration: '30min', category: '创造力', priority: 3, reason: '激发好奇心和创造力' },
    ],
    strategies: [
      `${form.weakSubjects[0] || '薄弱科目'}建议使用费曼学习法：让孩子讲给你听`,
      '学习环境要安静整洁，减少视觉干扰',
      '每完成一个任务给予正向鼓励（不一定是物质奖励）',
      '屏幕时间控制在每天1小时内，且避免睡前1小时使用',
      '周末至少安排2小时户外活动',
      `月预算${form.budget || '合理'}元建议优先投入${form.interests[0] || '运动类'}兴趣培养`,
      '保持规律作息，固定时间做固定的事有助于养成习惯',
      `${name}性格${form.personalities[0] || '活泼'}，适合用游戏化方式激励学习`,
    ],
    parentTips: [
      '不要拿别人家的孩子比较，关注孩子的进步',
      '规律作息比临时突击更有效',
      '兴趣是最好的老师，保护孩子的好奇心',
      '高质量的陪伴胜过昂贵的培训班',
      '允许适当的"无聊"时间，这能激发创造力',
    ],
  };
}
