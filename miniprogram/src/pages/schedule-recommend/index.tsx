/**
 * AI 智能日程推荐 — 100% 对齐 Web 版 ScheduleRecommend.tsx (1098行)
 *
 * 视觉规范（严格对齐）：
 * ✅ 4步向导: 基本信息→学业时间→兴趣特长→性格期望→AI生成→结果展示
 * ✅ ChipSelect: 圆角pill(border-radius:999rpx, border-2, font-black)
 *    未选: bg-white, text-on-surface-variant/60
 *    已选: bg-primary, text-white, shadow-sm
 * ✅ 性别大卡片: emoji 3xl + py-5 + rounded-2xl, active=primary/5背景+primary边框
 * ✅ 标签带彩色icon: ★强项 ⚠️薄弱 ❤️兴趣 🧠性格 🎯期望 💰预算 等
 * ✅ 步骤进度条: Header下方4段横线指示器
 * ✅ 输入框: rounded-2xl, bg-surface-container-low, border-2
 * ✅ 结果页: 渐变摘要卡 + Tab切换(平日/周末/活动/策略) + 时间轴列表 + 反馈修订
 */
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import {
  generateScheduleRecommendation,
  refineScheduleRecommendation,
  getDefaultChildProfile,
  getAgeFromGrade,
  type ChildProfile,
  type ScheduleRecommendation,
} from '@/lib/scheduleRecommendAI';
import './index.scss';

// ===== 常量（对齐Web第32-76行）=====
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
  '演讲口才', '英语', '书法', '乒乓球', '羽毛球', '网球',
  '天文', '航模', '吉他',
];

const INTEREST_FEMALE = [
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

// ===== ChipSelect 子组件（对齐Web第80-139行）=====

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
  // 默认显示8个，超过则折叠
  const displayCount = options.length > 10 ? 8 : options.length;
  const displayed = showAll ? options : options.slice(0, displayCount);

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
    <View className="chip-select-wrap">
      <View className="chip-row">
        {displayed.map(opt => (
          <View
            key={opt}
            className={`chip-pill ${selected.includes(opt) ? 'active' : ''}`}
            onClick={() => toggle(opt)}
          >
            <Text className={`chip-text ${selected.includes(opt) ? 'text-active' : ''}`}>
              {opt}
            </Text>
          </View>
        ))}
        {/* 超过显示数量时显示"展开/收起" */}
        {options.length > displayCount && (
          <View className="chip-expand" onClick={() => setShowAll(!showAll)}>
            <Text className="chip-expand-text">
              {showAll ? '收起' : `+${options.length - displayCount}更多`}
            </Text>
          </View>
        )}
      </View>
      {selected.length === 0 && (
        <Text className="chip-placeholder">{placeholder || '请选择'}</Text>
      )}
    </View>
  );
}

// ===== 主页面 =====

export default function ScheduleRecommendPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ChildProfile>(getDefaultChildProfile());
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ScheduleRecommendation | null>(null);
  const [error, setError] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend' | 'activities' | 'advice'>('weekday');

  // 根据性别获取兴趣选项（对齐Web第203-207行）
  const interestOptions = profile.gender === 'boy'
    ? INTEREST_MALE
    : profile.gender === 'girl'
      ? INTEREST_FEMALE
      : [...new Set([...INTEREST_MALE, ...INTEREST_FEMALE])];

  const hasGender = profile.gender !== '';

  // ===== 生成推荐（对齐Web第211-230行）=====
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setStep(4); // 生成中步骤
    try {
      const rec = await generateScheduleRecommendation(profile);
      setResult(rec);
      setStep(5);
    } catch (err: any) {
      setError(err.message || '生成推荐失败，请重试');
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== 反馈修订（对齐Web第234-246行）=====
  const handleRefine = async () => {
    if (!feedbackInput.trim() || !result) return;
    setIsRefining(true);
    try {
      const refined = await refineScheduleRecommendation(result, feedbackInput);
      setResult(refined);
      setFeedbackInput('');
    } catch (err: any) {
      setError(err.message || '修订失败，请重试');
    } finally {
      setIsRefining(false);
    }
  };

  // ===== 验证（对齐Web第257-265行）=====
  const canProceed = (): boolean => {
    switch (step) {
      case 0: return hasGender && (profile.age !== null || profile.grade !== '');
      case 1: return true;
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  };

  // ===== 步骤定义（对齐Web第190-197行，6个步骤含icon）=====
  const steps = [
    { title: '基本信息', icon: 'user', desc: '孩子的年龄、年级和基本情况' },
    { title: '学业与时间', icon: 'bookOpen', desc: '学业情况、作业时长和空闲时间' },
    { title: '兴趣与特长', icon: 'heart', desc: '已有的兴趣班和特长爱好' },
    { title: '性格与期望', icon: 'target', desc: '性格特点、家长期望和预算' },
    { title: 'AI 生成中...', icon: 'sparkles', desc: '正在生成个性化推荐方案' },
    { title: '推荐方案', icon: 'star', desc: '您的个性化日程推荐' },
  ];

  // ==================== Step 0: 基本信息（对齐Web第283-387行）====================

  const renderBasicInfo = () => (
    <View className="sr-step-section">

      {/* 性别选择 — 对齐Web第286-316行 */}
      <View className="sr-field">
        <Text className="sr-label">
          孩子的性别<Text className="sr-required">*</Text>
        </Text>
        <View className="sr-gender-row">
          {(['girl', 'boy'] as const).map(g => (
            <View
              key={g}
              className={`sr-gender-card ${profile.gender === g ? 'active' : ''}`}
              onClick={() => setProfile({ ...profile, gender: g, existingInterests: [] })}
            >
              <Text className="sr-gender-emoji">{g === 'girl' ? '👧' : '👦'}</Text>
              <Text className={`sr-gender-name ${profile.gender === g ? 'text-active' : ''}`}>
                {g === 'girl' ? '女孩' : '男孩'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 年级 — 对齐Web第318-339行 */}
      <View className="sr-field">
        <Text className="sr-label">
          年级/学段<Text className="sr-required">*</Text>
        </Text>
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
      </View>

      {/* 年龄 — 对齐Web第342-350行 */}
      <View className="sr-field">
        <Text className="sr-label">年龄（岁）</Text>
        <View className="sr-input-wrap">
          <Input
            type="number"
            value={String(profile.age ?? '')}
            onInput={(e: any) => setProfile({ ...profile, age: e.detail.value ? Number(e.detail.value) : null })}
            placeholder="输入年龄"
            className="sr-input"
          />
          <Text className="sr-input-suffix">岁</Text>
        </View>
      </View>

      {/* 城市 — 对齐Web第353-364行 */}
      <View className="sr-field">
        <Text className="sr-label">所在城市</Text>
        <ChipSelect
          options={CITY_OPTIONS}
          selected={profile.city ? [profile.city] : []}
          onChange={v => setProfile({ ...profile, city: v[0] || '' })}
          multi={false}
          placeholder="选择所在城市（可选）"
        />
      </View>

      {/* 学校类型 — 对齐Web第367-385行 */}
      <View className="sr-field">
        <Text className="sr-label">学校类型</Text>
        <View className="sr-type-row">
          {(['公立', '私立', '国际'] as const).map(type => (
            <View
              key={type}
              className={`sr-type-btn ${profile.schoolType === type ? 'active' : ''}`}
              onClick={() => setProfile({ ...profile, schoolType: type })}
            >
              <Text className={`sr-type-text ${profile.schoolType === type ? 'text-active' : ''}`}>
                {type}
              </Text>
            </View>
          ))}
        </View>
      </View>

    </View>
  );

  // ==================== Step 1: 学业与时间（对齐Web第391-447行）====================

  const renderAcademicInfo = () => (
    <View className="sr-step-section">

      {/* 强项科目 — 对齐Web第394-405行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="star" size={16} color="#F59E0B" /> 强项科目
        </Text>
        <ChipSelect
          options={SUBJECT_OPTIONS}
          selected={profile.strongSubjects}
          onChange={v => setProfile({ ...profile, strongSubjects: v })}
          placeholder="选择孩子的强项科目（可选）"
        />
      </View>

      {/* 薄弱科目 — 对齐Web第408-418行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="alertCircle" size={16} color="#EF4444" /> 需要提升的科目
        </Text>
        <ChipSelect
          options={SUBJECT_OPTIONS}
          selected={profile.weakSubjects}
          onChange={v => setProfile({ ...profile, weakSubjects: v })}
          placeholder="选择需要加强的科目（可选）"
        />
      </View>

      {/* 作业时长 — 对齐Web第421-431行 */}
      <View className="sr-field">
        <Text className="sr-label">每天完成学校作业大约需要多久？</Text>
        <View className="sr-input-wrap">
          <Input
            type="number"
            value={String(profile.homeworkDuration ?? '')}
            onInput={(e: any) => setProfile({ ...profile, homeworkDuration: e.detail.value ? Number(e.detail.value) : null })}
            placeholder="例如：60"
            className="sr-input"
          />
          <Text className="sr-input-suffix">分钟</Text>
        </View>
      </View>

      {/* 可自由支配时间 — 对齐Web第435-445行 */}
      <View className="sr-field">
        <Text className="sr-label">放学后每天大约有多少可自由支配的时间？</Text>
        <View className="sr-input-wrap">
          <Input
            type="number"
            value={String(profile.freeTimePerDay ?? '')}
            onInput={(e: any) => setProfile({ ...profile, freeTimePerDay: e.detail.value ? Number(e.detail.value) : null })}
            placeholder="例如：2"
            className="sr-input"
          />
          <Text className="sr-input-suffix">小时</Text>
        </View>
      </View>

    </View>
  );

  // ==================== Step 2: 兴趣与特长（对齐Web第451-504行）====================

  const renderInterestInfo = () => (
    <View className="sr-step-section">

      {/* 提示条 — 对齐Web第453-459行 */}
      <View className="sr-tip-card">
        <Icon name="lightbulb" size={16} color="#006e1c" />
        <Text className="sr-tip-text">
          {profile.gender === 'girl'
            ? '以下是其他家长常为女孩选择的兴趣方向，供参考'
            : profile.gender === 'boy'
              ? '以下是其他家长常为男孩选择的兴趣方向，供参考'
              : '以下是一些常见的兴趣方向，供参考'}
        </Text>
      </View>

      {/* 已有兴趣班 — 对齐Web第463-474行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="heart" size={16} color="#EF4444" /> 孩子目前正在上的兴趣班 / 感兴趣的方向
        </Text>
        <ChipSelect
          options={interestOptions}
          selected={profile.existingInterests}
          onChange={v => setProfile({ ...profile, existingInterests: v })}
          placeholder="选择已有的兴趣方向（可多选）"
        />
      </View>

      {/* 固定安排 — 对齐Web第477-488行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="clock" size={16} color="#3B82F6" /> 目前已有固定安排的时段
        </Text>
        <Input
          className="sr-textarea"
          value={profile.existingSchedules.join('；')}
          onInput={(e: any) => setProfile({ ...profile, existingSchedules: e.detail.value ? [e.detail.value] : [] })}
          placeholder="输入已有的固定安排，如：周一16-18钢琴"
        />
      </View>

      {/* 电子设备使用 — 对齐Web第491-502行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="smartphone" size={16} color="#A855F7" /> 孩子每天电子设备使用情况
        </Text>
        <Input
          className="sr-textarea"
          value={profile.screenTime}
          onInput={(e: any) => setProfile({ ...profile, screenTime: e.detail.value })}
          placeholder="例如：每天约30分钟平板看动画片..."
        />
      </View>

    </View>
  );

  // ==================== Step 3: 性格与期望（对齐Web第508-593行）====================

  const renderPersonalityInfo = () => (
    <View className="sr-step-section">

      {/* 性格特点 — 对齐Web第512-527行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="brain" size={16} color="#6366F1" /> 孩子的性格特点
        </Text>
        <ChipSelect
          options={PERSONALITY_OPTIONS}
          selected={profile.personality}
          onChange={v => setProfile({ ...profile, personality: v })}
          placeholder="选择符合孩子的性格特点（可多选）"
        />
        <Input
          className="sr-textarea sr-mt-sm"
          value={profile.personalityOther}
          onInput={(e: any) => setProfile({ ...profile, personalityOther: e.detail.value })}
          placeholder="其他性格特点补充..."
        />
      </View>

      {/* 家长期望 — 对齐Web第530-548行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="target" size={16} color="#006e1c" /> 您对孩子的期望方向
        </Text>
        <ChipSelect
          options={EXPECTATION_OPTIONS}
          selected={profile.parentExpectation}
          onChange={v => setProfile({ ...profile, parentExpectation: v })}
          placeholder="选择您最看重的方向（可多选）"
        />
        <Input
          className="sr-textarea sr-mt-sm"
          value={profile.expectationOther}
          onInput={(e: any) => setProfile({ ...profile, expectationOther: e.detail.value })}
          placeholder="其他期望补充..."
        />
      </View>

      {/* 预算 — 对齐Web第550-562行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="dollarSign" size={16} color="#22C55E" /> 每月兴趣班预算
        </Text>
        <View className="sr-input-wrap">
          <Input
            type="number"
            value={String(profile.budget ?? '')}
            onInput={(e: any) => setProfile({ ...profile, budget: e.detail.value ? Number(e.detail.value) : null })}
            placeholder="例如：1000"
            className="sr-input"
          />
          <Text className="sr-input-suffix">元/月</Text>
        </View>
      </View>

      {/* 健康 — 对齐Web第565-576行 */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="activity" size={16} color="#F97316" /> 健康注意事项
        </Text>
        <Input
          className="sr-textarea"
          value={profile.healthNotes}
          onInput={(e: any) => setProfile({ ...profile, healthNotes: e.detail.value })}
          placeholder="视力/体能/过敏等..."
        />
      </View>

      {/* 其他 — 对齐Web第579-591行 (textarea rows=3) */}
      <View className="sr-field">
        <Text className="sr-label sr-label-icon">
          <Icon name="fileText" size={16} color="#9CA3AF" /> 其他想补充的说明
        </Text>
        <View className="sr-textarea-wrap">
          <Textarea
            className="sr-textarea"
            value={profile.otherNotes}
            onInput={(e: any) => setProfile({ ...profile, otherNotes: e.detail.value })}
            placeholder="任何其他想告诉我们的信息..."
          />
        </View>
      </View>

    </View>
  );

  // ==================== Step 4: 生成中（对齐Web第597-625行）====================

  const renderGenerating = () => (
    <View className="sr-generating">
      <View className="sr-gen-icon-wrap">
        <Icon name="sparkles" size={64} color="#006e1c" />
      </View>
      <Text className="sr-gen-title">AI 正在分析...</Text>
      <Text className="sr-gen-desc">正在根据您提供的信息，结合教育专家知识库，生成个性化方案</Text>
      <View className="sr-gen-badges">
        {['分析信息', '匹配知识库', '生成方案'].map((text, i) => (
          <View key={i} className="sr-gen-badge">
            <Text>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ==================== Step 5: 结果展示（对齐Web第629-791行）====================

  const renderResult = () => {
    if (!result) return null;

    return (
      <ScrollView scrollY className="sr-result-scroll">
        {/* AI综合摘要 — 对齐Web第635-651行 */}
        <View className="sr-summary-card">
          <View className="sr-summary-head">
            <View className="sr-summary-icon-box">
              <Icon name="sparkles" size={24} color="#006e1c" />
            </View>
            <View>
              <Text className="sr-summary-title">AI 综合分析</Text>
              <Text className="sr-summary-sub">
                基于{profile.age || '对应年级'}岁{profile.gender === 'boy' ? '男孩' : '女孩'}{profile.grade ? ` · ${profile.grade}` : ''} 的个性化方案
              </Text>
            </View>
          </View>
          <Text className="sr-summary-body">{result.summary}</Text>
        </View>

        {/* Tab 切换栏 — 对齐Web第654-675行 */}
        <ScrollView scrollX className="sr-tabs-scroll">
          {([
            { key: 'weekday' as const, label: '平日作息', icon: 'sun' },
            { key: 'weekend' as const, label: '周末作息', icon: 'moon' },
            { key: 'activities' as const, label: '推荐活动', icon: 'star' },
            { key: 'advice' as const, label: '学习策略', icon: 'bookOpen' },
          ]).map(tab => (
            <View
              key={tab.key}
              className={`sr-tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon name={tab.icon} size={14} color={activeTab === tab.key ? '#fff' : '#666'} />
              <Text className={`sr-tab-label ${activeTab === tab.key ? 'tab-active' : ''}`}>
                {tab.label}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Tab 内容 */}
        {activeTab === 'weekday' && renderTimeTable(result.weekdaySchedule, '平日作息表')}
        {activeTab === 'weekend' && renderTimeTable(result.weekendSchedule, '周末作息表')}
        {activeTab === 'activities' && renderActivities(result.recommendedActivities, result.avoidActivities)}
        {activeTab === 'advice' && renderAdvice(result)}

        {/* 反馈修订 — 对齐Web第693-719行 */}
        <View className="sr-feedback-card">
          <Text className="sr-feedback-label">
            <Icon name="messageCircle" size={16} color="#333" /> 对方案不满意？提出修改意见
          </Text>
          <View className="sr-feedback-row">
            <Input
              className="sr-feedback-input"
              value={feedbackInput}
              onInput={(e: any) => setFeedbackInput(e.detail.value)}
              placeholder="例如：希望增加户外活动时间/减少周末学习..."
            />
            <View
              className={`sr-send-btn ${!feedbackInput.trim() || isRefining ? 'disabled' : ''}`}
              onClick={handleRefine}
            >
              {isRefining ? (
                <Icon name="loader" size={18} color="#fff" />
              ) : (
                <Icon name="send" size={18} color={!feedbackInput.trim() || isRefining ? '#ccc' : '#fff'} />
              )}
            </View>
          </View>
        </View>

        {/* 给家长的建议 — 对齐Web第722-737行 */}
        {result.parentTips?.length > 0 && (
          <View className="sr-tips-card">
            <View className="sr-tips-header">
              <Icon name="lightbulb" size={20} color="#F59E0B" />
              <Text className="sr-tips-title">给家长的建议</Text>
            </View>
            {result.parentTips.map((tip, i) => (
              <View key={i} className="sr-tip-row">
                <View className="sr-tip-num"><Text>{i + 1}</Text></View>
                <Text className="sr-tip-text">{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 分阶段发展路径 — 对齐Web第740-766行（之前缺失！） */}
        {result.developmentPath?.length > 0 && (
          <View className="sr-dev-card">
            <View className="sr-dev-header">
              <Icon name="zap" size={16} color="#006e1c" />
              <Text className="sr-dev-title">分阶段发展路径</Text>
            </View>
            {result.developmentPath.map((phase: any, i: number) => (
              <View key={i} className="sr-dev-phase">
                {/* 时间轴线 — 对齐Web第749-750行 */}
                {i < (result.developmentPath?.length ?? 0) - 1 && (
                  <View className="sr-dev-line" />
                )}
                <View className="sr-dev-dot" />
                <Text className="sr-dev-phase-title">{phase.phase} · {phase.timeRange}</Text>
                <Text className="sr-dev-phase-desc">{phase.description}</Text>
                {/* focus tags — 对齐Web第755-761行 */}
                {phase.focus?.length > 0 && (
                  <View className="sr-focus-tags">
                    {phase.focus.map((f: string, j: number) => (
                      <View key={j} className="sr-focus-tag">
                        <Text>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 操作按钮 — 对齐Web第769-788行 */}
        <View className="sr-action-buttons">
          <View className="sr-save-btn" onClick={() => {
            try {
              Taro.setStorageSync('schedule_recommendation', JSON.stringify({
                result,
                profile,
                savedAt: new Date().toISOString(),
              }));
              Taro.showToast({ title: '方案已保存', icon: 'success' });
              setTimeout(() => Taro.navigateTo({ url: '/pages/plans/index' }), 500);
            } catch { Taro.showToast({ title: '保存失败', icon: 'none' }); }
          }}>
            <Icon name="save" size={20} color="#fff" />
            <Text className="sr-save-text">保存为计划</Text>
          </View>
          <View className="sr-reset-btn" onClick={() => { setStep(0); setResult(null); setProfile(getDefaultChildProfile()); }}>
            <Icon name="refreshCw" size={16} color="#666" />
            <Text className="sr-reset-text">重新开始</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ===== 时间表格渲染（对齐Web第795-843行）=====
  const renderTimeTable = (slots: any[], title: string) => (
    <View className="sr-table-card">
      <View className="sr-table-head">
        <Text className="sr-table-title">{title}</Text>
        <Text className="sr-table-count">{slots.length} 个时段</Text>
      </View>
      {slots.map((slot: any, i: number) => {
        const isSleep = slot.activity?.includes('睡觉') || slot.activity?.includes('睡眠');
        const isMeal = slot.activity?.includes('餐') || slot.activity?.includes('饭');
        return (
          <View
            key={i}
            className={`sr-slot-row ${isSleep ? 'sleep' : ''} ${isMeal ? 'meal' : ''}`}
          >
            {/* 时间轴圆点 */}
            <View className="sr-slot-time-col">
              <View className={`sr-slot-dot ${isSleep ? 'dot-sleep' : isMeal ? 'dot-meal' : ''}`} />
              <Text className="sr-slot-time">{slot.time}</Text>
              <Text className="sr-slot-dur">{slot.duration}</Text>
            </View>
            {/* 活动 */}
            <View className="sr-slot-act-col">
              <Text className={`sr-slot-act ${isSleep ? 'act-sleep' : ''}`}>
                {slot.icon}{slot.activity}
              </Text>
              {slot.notes && <Text className="sr-slot-notes">{slot.notes}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );

  // ===== 推荐活动渲染（对齐Web第847-902行）=====
  const renderActivities = (acts: any[], avoid: string[]) => (
    <View className="sr-acts-area">
      <View className="sr-acts-card">
        <View className="sr-table-head">
          <Text className="sr-table-title">推荐兴趣/活动方向</Text>
        </View>
        {(acts || []).map((act: any, i: number) => (
          <View key={i} className="sr-act-item">
            <View className="sr-act-left">
              <View className={`sr-priority-tag ${
                act.priority === '强烈推荐' ? 'tag-strong' :
                act.priority === '推荐' ? 'tag-normal' : 'tag-optional'
              }`}>
                <Text>{act.priority}</Text>
              </View>
              <View className="sr-cat-tag">
                <Text>{act.category}</Text>
              </View>
              <Text className="sr-act-name">{act.name}</Text>
              <Text className="sr-act-reason">{act.reason}</Text>
            </View>
            <View className="sr-act-right">
              <Text className="sr-act-hours">{act.weeklyHours}h/周</Text>
              <Text className="sr-act-age">建议{act.recommendedAge}</Text>
            </View>
          </View>
        ))}
      </View>
      {avoid?.length > 0 && (
        <View className="sr-warn-card">
          <Text className="sr-warn-title">
            <Icon name="alertCircle" size={14} color="#DC2626" /> 谨慎考虑的方向
          </Text>
          <View className="sr-warn-tags">
            {avoid.map((a: string, i: number) => (
              <View key={i} className="sr-warn-tag"><Text>{a}</Text></View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ===== 学习策略渲染（对齐Web第906-946行）=====
  const renderAdvice = (rec: ScheduleRecommendation) => (
    <View className="sr-advice-card">
      <View className="sr-table-head">
        <Text className="sr-table-title">各科学习策略建议</Text>
      </View>
      {(rec.subjectAdvice || []).map((adv: any, i: number) => (
        <View key={i} className="sr-advice-item">
          <View className="sr-advice-left">
            <Text className="sr-advice-subj">{adv.subject}</Text>
            <View className={`sr-status-tag ${
              adv.status === '强项' ? 'status-good' : adv.status === '薄弱' ? 'status-bad' : 'status-mid'
            }`}>
              <Text>{adv.status}</Text>
            </View>
          </View>
          <Text className="sr-advice-strategy">{adv.strategy}</Text>
          {/* 资源标签 — 对齐Web第932-940行 */}
          {adv.resources?.length > 0 && (
            <View className="sr-resources-row">
              {adv.resources.map((r: string, j: number) => (
                <View key={j} className="sr-resource-tag">
                  <Text>{r}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // ==================== 主渲染（对齐Web第963-1098行）====================

  return (
    <View className="sr-page">
      {/* Header — 对齐Web第966-1021行 */}
      <View className="sr-header">
        <View className="sr-header-top">
          <View className="sr-back-btn" onClick={() => {
            if (step === 5 && result) setStep(3);
            else if (step > 0 && step < 4) setStep(s => s - 1);
            else Taro.navigateBack();
          }}>
            <Icon name="arrowLeft" size={22} color="#333" />
          </View>
          <View className="sr-header-center">
            <Text className="sr-header-title">{step <= 4 ? '智能日程推荐' : '推荐方案'}</Text>
            <Text className="sr-header-desc">{steps[Math.min(step, steps.length - 1)]?.desc}</Text>
          </View>
          {/* 步骤点指示器 — 对齐Web第989-998行 */}
          {step < 4 && (
            <View className="sr-steps-dots">
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  className={`sr-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                  onClick={() => {
                    if (i <= 1 || (i === 2 && hasGender && profile.grade !== '')) setStep(i);
                  }}
                />
              ))}
            </View>
          )}
          {!step || step >= 4 ? <View style={{ width: 48 }} /> : null}
        </View>

        {/* 步骤进度条 — 对齐Web第1004-1020行 */}
        {step < 4 && (
          <View className="sr-progress-bar">
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                className={`sr-progress-segment ${i === step ? 'current' : ''} ${i < step ? 'completed' : ''}`}
              />
            ))}
          </View>
        )}
      </View>

      {/* 错误提示 */}
      {!!error && (
        <View className="sr-error-bar">
          <Icon name="alertCircle" size={18} color="#DC2626" />
          <View className="sr-error-content">
            <Text className="sr-error-title">生成失败</Text>
            <Text className="sr-error-msg">{error}</Text>
          </View>
        </View>
      )}

      {/* 内容区域 */}
      <View className="sr-content">
        {step === 0 && renderBasicInfo()}
        {step === 1 && renderAcademicInfo()}
        {step === 2 && renderInterestInfo()}
        {step === 3 && renderPersonalityInfo()}
        {step === 4 && renderGenerating()}
        {step === 5 && renderResult()}
      </View>

      {/* 底部操作按钮 — 对齐Web第1056-1092行 */}
      {step >= 0 && step < 4 && (
        <View className="sr-bottom-actions">
          <View
            className={`sr-next-btn ${!canProceed() || isGenerating ? 'disabled' : ''}`}
            onClick={() => {
              if (!canProceed() || isGenerating) return;
              if (step < 3) setStep(s => s + 1);
              else handleGenerate();
            }}
          >
            <Text className="sr-next-text">
              {step === 0 ? '下一步：学业与时间'
                : step === 1 ? '下一步：兴趣与特长'
                  : step === 2 ? '下一步：性格与期望'
                    : '开始生成智能方案'}
            </Text>
            {step < 3 && <Icon name="chevronRight" size={18} color="#fff" />}
            {step === 3 && <Icon name="sparkles" size={18} color="#fff" />}
          </View>

          {/* 直接生成按钮 — 对齐Web第1082-1089行 */}
          {step < 3 && (
            <View className="sr-skip-btn" onClick={handleGenerate}>
              <Text className="sr-skip-text">已有足够信息，直接生成</Text>
              <Icon name="zap" size={14} color="#888" />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
