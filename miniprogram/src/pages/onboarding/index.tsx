/**
 * OnboardingGuide — 对齐 Web 端 OnboardingGuide.tsx
 * 11步引导: welcome → family-type → children-count → child-details → daily-schedule → activities → holiday-schedule → priorities → analyzing → recommendations → preview → success
 */
import { View, Text, ScrollView, Input, Slider, Picker, Textarea } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

/* ===== 类型定义 ===== */
interface ChildInfo {
  name: string;
  age: number;
  gender: string;
  grade: string;
  avatar: string;
  schoolTime: { start: string; end: string };
  hasAfterSchool: boolean;
  afterSchoolActivities: string[];
  customActivities: string[];
}
interface FamilyProfile {
  hasChildren: boolean;
  childrenCount: number;
  children: ChildInfo[];
  familyType: string;
  priorities: string[];
  specialRequests: string;
  hasHolidaySchedule: boolean;
  holidayDaySchedule: { start: string; end: string };
  holidayCustomActivities: string[];
}
interface RecTask {
  id: string;
  title: string;
  description: string;
  type: string;
  rewardStars: number;
  icon: string;
  category: string;
}

/* ===== 常量 ===== */
function getGradeFromAge(a) {
  if (a <= 3) return '幼儿园小班';
  if (a === 4) return '幼儿园中班';
  if (a === 5) return '幼儿园大班';
  if (a === 6) return '一年级';
  if (a === 7) return '二年级';
  if (a === 8) return '三年级';
  if (a === 9) return '四年级';
  if (a === 10) return '五年级';
  if (a === 11) return '六年级';
  if (a === 12) return '初一';
  if (a === 13) return '初二';
  if (a === 14) return '初三';
  if (a === 15) return '高一';
  if (a === 16) return '高二';
  return '高三';
}

function getDefaultAvatar(gender, idx) {
  var boys = ['👦', '👨', '🧑‍🎓', '👩', '👦', '👴'];
  var girls = ['👧', '👩', '👩‍🦰', '🐥', '📋', '🙋'];
  if (gender === 'boy') return boys[idx % boys.length];
  return girls[idx % girls.length];
}

var GRADE_LIST = ['幼儿园小班','幼儿园中班','幼儿园大班','一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三','高一','高二','高三'];
var ACTIVITY_LIST = ['游泳','足球','篮球','画画','钢琴','舞蹈','书法','围棋','编程','英语','阅读'];

/* 预置活动 — 带分类和图标，对齐 Web 原版 */
var CATEGORIZED_ACTIVITIES = [
  /* 体育类 — 全部映射到已存在图标 */
  { id: 'swim', label: '游泳', category: 'sports', icon: 'star' },
  { id: 'soccer', label: '足球', category: 'sports', icon: 'star' },
  { id: 'basketball', label: '篮球', category: 'sports', icon: 'star' },
  { id: 'badminton', label: '羽毛球', category: 'sports', icon: 'star' },
  { id: 'taekwondo', label: '跆拳道', category: 'sports', icon: 'star' },
  /* 艺术类 */
  { id: 'painting', label: '画画', category: 'arts', icon: 'edit' },
  { id: 'piano', label: '钢琴', category: 'arts', icon: 'sparkles' },
  { id: 'dance', label: '舞蹈', category: 'arts', icon: 'sparkles' },
  { id: 'calligraphy', label: '书法', category: 'arts', icon: 'edit' },
  { id: 'go', label: '围棋', category: 'arts', icon: 'grid' },
  /* STEM类 */
  { id: 'coding', label: '编程', category: 'stem', icon: 'settings' },
  { id: 'robot', label: '机器人', category: 'stem', icon: 'settings2' },
  { id: 'science', label: '科学实验', category: 'stem', icon: 'alertTriangle' },
  /* 语言类 */
  { id: 'english', label: '英语', category: 'language', icon: 'text' },
  { id: 'reading', label: '阅读', category: 'language', icon: 'listTodo' },
];

var CATEGORY_NAMES = { sports: '体育类', arts: '艺术类', stem: 'STEM类', language: '语言类' };
var PRI_LIST = [
  {id:'study',label:'学习习惯',emoji:'📚'},
  {id:'health',label:'健康生活',emoji:'💪'},
  {id:'housework',label:'家务劳动',emoji:'🧹'},
  {id:'social',label:'社交能力',emoji:'🤝'},
  {id:'hobby',label:'兴趣培养',emoji:'🎨'},
  {id:'resp',label:'责任心',emoji:'⭐'},
];

export default function OnboardingPage() {
  const [step, setStep] = useState('welcome');
  const [ci, setCi] = useState(0);
  const [profile, setProfile] = useState({
    hasChildren: true,
    childrenCount: 1,
    children: [{
      name: '大宝',
      age: 8,
      gender: 'boy',
      grade: '三年级',
      avatar: '👦',
      schoolTime: { start: '08:00', end: '16:00' },
      hasAfterSchool: false,
      afterSchoolActivities: [],
      customActivities: [],
    }],
    familyType: 'nuclear',
    priorities: [],
    specialRequests: '',
    hasHolidaySchedule: false,
    holidayDaySchedule: { start: '08:00', end: '17:00' },
    holidayCustomActivities: [],
  });
  const [recs, setRecs] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [aiDone, setAiDone] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [customActInput, setCustomActInput] = useState('');

  /* 步骤列表 */
  var STEPS = ['welcome','family-type','children-count','child-details','daily-schedule','activities','holiday-schedule','priorities','analyzing','recommendations','preview','success'];

  /* ===== 导航方法（全部提取为独立函数避免内联嵌套过深） ===== */

  function goNext() {
    var idx = STEPS.indexOf(step);
    if (idx < 0 || idx >= STEPS.length - 1) return;
    if (step === 'recommendations') { setStep('preview'); return; }
    var nidx = idx + 1;
    if (!profile.hasChildren && ['children-count','child-details','daily-schedule','activities','holiday-schedule'].indexOf(STEPS[nidx]) >= 0) {
      nidx = STEPS.indexOf('priorities');
    }
    if ((step === 'child-details' || step === 'daily-schedule' || step === 'activities') && ci < profile.childrenCount - 1) {
      setCi(ci + 1); return;
    }
    setStep(STEPS[nidx]);
    if (STEPS[nidx] === 'analyzing') doAnalyze();
  }

  function goBack() {
    var idx = STEPS.indexOf(step);
    if (idx <= 0) return;
    if ((step === 'child-details' || step === 'daily-schedule' || step === 'activities') && ci > 0) { setCi(ci - 1); return; }
    setStep(STEPS[idx - 1]);
  }

  function updChild(i, u) {
    setProfile(function(p) {
      var ch = p.children.map(function(c, j) {
        return j === i ? Object.assign({}, c, u) : c;
      });
      return Object.assign({}, p, { children: ch });
    });
  }

  function doAnalyze() {
    setStep('analyzing');
    setAiDone(false);
    setTimeout(function() {
      genRecs();
      setAiDone(true);
      setTimeout(function() { setStep('recommendations'); }, 500);
    }, 2500);
  }

  function genRecs() {
    var tasks = [];
    var idc = 0;
    function add(t, d, s, c) {
      tasks.push({id: String(idc++), title: t, description: d, type: 'daily', rewardStars: s, icon: c, category: c});
    }
    add('整理书包', '每天睡前整理好第二天需要的书本和文具', 2, 'BookOpen');
    add('完成作业', '按时完成学校布置的作业', 3, 'BookOpen');
    add('阅读30分钟', '每天坚持阅读课外书籍30分钟', 2, 'BookOpen');
    add('锻炼身体', '户外运动或体育活动30分钟', 2, 'Activity');
    add('帮忙做家务', '承担一项固定的家务劳动', 2, 'Home');
    profile.children.forEach(function(ch) {
      var cn = ch.name || (ch.gender === 'boy' ? '儿子' : '女儿');
      add(cn + '的专属作业', '按时完成学校作业是关键期', 4, 'BookOpen');
      if (ch.age >= 7 && ch.age <= 12) add(cn + '复习本周知识', '回顾所学内容查漏补缺', 5, 'Sparkles');
      if (!profile.children.some(function(c) { return c.afterSchoolActivities.length > 0; })) {
        add(cn + '户外运动', '每天保持适量运动促进身体发育', 4, 'Activity');
      }
    });
    tasks.push({ id: 'habit-1', title: '每日阅读', description: '每天坚持阅读15-30分钟，培养终身学习习惯', type: 'habit', rewardStars: 5, icon: 'Sparkles', category: '习惯养成' });
    setRecs(tasks);
    setSel(new Set(tasks.slice(0, Math.ceil(tasks.length / 1.5)).map(function(t) { return t.id; })));
  }

  function toggleRec(id) {
    setSel(function(s) {
      var n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  /* ---- 事件处理函数（供 JSX 调用） ---- */
  function handleSetFamilyType(tid) {
    setProfile(function(p) { return Object.assign({}, p, { familyType: tid }); });
  }
  function toggleHasChildren() {
    setProfile(function(p) { return Object.assign({}, p, { hasChildren: !p.hasChildren }); });
  }
  function decChildren() {
    if (profile.childrenCount > 1) {
      setProfile(function(p) { return Object.assign({}, p, { childrenCount: p.childrenCount - 1, children: p.children.slice(0, -1) }); });
    }
  }
  function incChildren() {
    if (profile.childrenCount < 4) {
      var newCh = { name: '', age: 8, gender: profile.childrenCount % 2 === 0 ? 'boy' : 'girl', grade: '二年级', avatar: getDefaultAvatar(profile.childrenCount % 2 === 0 ? 'boy' : 'girl', profile.childrenCount), schoolTime: { start: '08:00', end: '16:00' }, hasAfterSchool: false, afterSchoolActivities: [], customActivities: [] };
      setProfile(function(p) { return Object.assign({}, p, { childrenCount: p.childrenCount + 1, children: p.children.concat([newCh]) }); });
    }
  }
  function handleAvatarClick() {
    setShowAvatar(!showAvatar);
  }
  function closeAvatarPicker() {
    setShowAvatar(false);
  }
  function pickAvatar(em) {
    updChild(ci, { avatar: em });
    setShowAvatar(false);
  }
  function onNameInput(val) {
    updChild(ci, { name: val });
  }
  function onAgeChange(val) {
    updChild(ci, { age: val, grade: getGradeFromAge(val) });
  }
  function setGenderBoy() {
    updChild(ci, { gender: 'boy' });
  }
  function setGenderGirl() {
    updChild(ci, { gender: 'girl' });
  }
  function onGradeChange(idx) {
    updChild(ci, { grade: GRADE_LIST[idx] });
  }
  function onSchoolStartChange(val) {
    var sch = profile.children[ci].schoolTime;
    updChild(ci, { schoolTime: { start: val, end: sch.end } });
  }
  function onSchoolEndChange(val) {
    var sch = profile.children[ci].schoolTime;
    updChild(ci, { schoolTime: { start: sch.start, end: val } });
  }
  function toggleAfterSchool() {
    var cur = profile.children[ci].hasAfterSchool;
    updChild(ci, { hasAfterSchool: !cur });
  }
  function toggleActivity(act) {
    var ac = profile.children[ci];
    var nl = void 0;
    if (ac.afterSchoolActivities.indexOf(act) >= 0) {
      nl = ac.afterSchoolActivities.filter(function(x) { return x !== act; });
    } else {
      nl = ac.afterSchoolActivities.concat([act]);
    }
    updChild(ci, { afterSchoolActivities: nl });
  }
  function addCustomActivity() {
    var val = customActInput.trim();
    if (!val) return;
    var ac = profile.children[ci];
    if (ac.customActivities.indexOf(val) >= 0) { setCustomActInput(''); return; }
    updChild(ci, { customActivities: ac.customActivities.concat([val]) });
    setCustomActInput('');
  }
  function removeCustomActivity(act) {
    var ac = profile.children[ci];
    updChild(ci, { customActivities: ac.customActivities.filter(function(x) { return x !== act; }) });
  }
  function toggleHasHoliday() {
    setProfile(function(p) { return Object.assign({}, p, { hasHolidaySchedule: !p.hasHolidaySchedule }); });
  }
  function onHolidayStartChange(val) {
    var hd = profile.holidayDaySchedule;
    setProfile(function(p) { return Object.assign({}, p, { holidayDaySchedule: { start: val, end: hd.end } }); });
  }
  function onHolidayEndChange(val) {
    var hd = profile.holidayDaySchedule;
    setProfile(function(p) { return Object.assign({}, p, { holidayDaySchedule: { start: hd.start, end: val } }); });
  }
  function toggleHolidayAct(act) {
    var nl = void 0;
    if (profile.holidayCustomActivities.indexOf(act) >= 0) {
      nl = profile.holidayCustomActivities.filter(function(x) { return x !== act; });
    } else {
      nl = profile.holidayCustomActivities.concat([act]);
    }
    setProfile(function(p) { return Object.assign({}, p, { holidayCustomActivities: nl }); });
  }
  function togglePriority(pid) {
    var nl = void 0;
    if (profile.priorities.indexOf(pid) >= 0) {
      nl = profile.priorities.filter(function(x) { return x !== pid; });
    } else {
      nl = profile.priorities.concat([pid]);
    }
    setProfile(function(p) { return Object.assign({}, p, { priorities: nl }); });
  }
  function onSpecialRequestChange(val) {
    setProfile(function(p) { return Object.assign({}, p, { specialRequests: val }); });
  }
  function confirmImport() {
    Taro.setStorageSync('onboarding_completed', JSON.stringify({ profile: profile, recs: recs.filter(function(r) { return sel.has(r.id); }), at: new Date().toISOString() }));
    try { Taro.removeStorageSync('wishcard_onboarding_profile'); } catch(e) {}
    Taro.showToast({ title: '设置完成！', icon: 'success' });
    setStep('success');
  }
  function canGo() {
    if (step === 'priorities') return profile.priorities.length > 0;
    if (step === 'recommendations') return sel.size > 0;
    return true;
  }
  function goBackFromRec() {
    setStep('priorities');
  }
  function goToPreview() {
    setStep('preview');
  }
  function backToRecs() {
    setStep('recommendations');
  }
  function goHome() {
    Taro.switchTab({ url: '/pages/home/index' });
  }
  function nextOrChildDetails() {
    if (ci < profile.childrenCount - 1) { setCi(ci + 1); } else { goNext(); }
  }
  function prevOrGoBack() {
    if (ci > 0) { setCi(ci - 1); } else { goBack(); }
  }
  function nextChildOrGo() {
    if (ci < profile.childrenCount - 1) { setCi(ci + 1); } else { goNext(); }
  }

  /* ========== 渲染 ========== */

  // Welcome
  if (step === 'welcome') {
    return (
      <View className="ob-page">
        <View className="ob-card">
          <View className="welcome-icon-wrap"><Icon name="sparkles" size={80} color="#006e1c"/></View>
          <Text className="ob-title">欢迎使用星愿卡</Text>
          <Text className="ob-subtitle">快速建立家庭日程管理</Text>
          <View className="ob-primary-btn" onClick={goNext}>
            <Text>继续</Text><Icon name="chevronRight" size={36} color="#fff"/>
          </View>
        </View>
      </View>
    );
  }

  // Family Type
  if (step === 'family-type') {
    var ftOpts = [
      { id: 'nuclear', label: '核心家庭', desc: '父母和孩子' },
      { id: 'extended', label: '大家庭', desc: '包含祖父母' },
      { id: 'single', label: '单亲家庭', desc: '一位家长带孩子' },
    ];
    return (
      <View className="ob-page">
        <ObHeader onBack={goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">您的家庭类型是？</Text>
          <View className="ft-list">
            {ftOpts.map(function(o) {
              var isActive = profile.familyType === o.id;
              return (
                <View key={o.id} className={'ft-item ' + (isActive ? 'active' : '')} onClick={function() { handleSetFamilyType(o.id); }}>
                  <View className={'ft-icon ' + (isActive ? 'active' : '')}><Icon name="users" size={36} color={isActive ? '#fff' : 'rgba(0,0,0,0.35)'}/></View>
                  <View className="ft-text">
                    <Text className="ft-label">{o.label}</Text>
                    <Text className="ft-desc">{o.desc}</Text>
                  </View>
                  {isActive && <Icon name="checkCircle" size={36} color="#006e1c"/>}
                </View>
              );
            })}
          </View>
          <View className="chk-row">
            <View className={'chk-box ' + (profile.hasChildren ? 'on' : '')} onClick={toggleHasChildren}>
              {profile.hasChildren && <Icon name="check" size={22} color="#fff"/>}
            </View>
            <Text className="chk-lbl">家中有孩子</Text>
          </View>
          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={goNext} text="下一步"/>
      </View>
    );
  }

  // Children Count
  if (step === 'children-count') {
    return (
      <View className="ob-page"><ObHeader onBack={goBack}/>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <Text className="ob-step-title" style={{ padding: 0 }}>您有几个孩子？</Text>
          <View style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 64 }}>
            <View className="cc-round-btn" onClick={decChildren}>
              <Icon name="minus" size={44} color="#333"/>
            </View>
            <Text className="cc-big-num">{profile.childrenCount}</Text>
            <View className="cc-round-btn" onClick={incChildren}>
              <Icon name="plus" size={44} color="#333"/>
            </View>
          </View>
          <Text className="cc-hint">接下来我们会了解每个孩子的具体情况</Text>
        </View>
        <ObFooter onNext={goNext} text="下一步"/>
      </View>
    );
  }

  // Child Details
  if (step === 'child-details') {
    var ch = profile.children[ci];
    var dots = profile.children.map(function(_, i) { return i; }).map(function(i) { return <View key={i} className={'dot ' + (i === ci ? 'active' : '')}/>; });
    var avatarList = ch.gender === 'boy'
      ? ['👦', '👨', '🧑‍🎓', '👩', '👦', '👴']
      : ['👧', '👩', '👩‍🦰', '🐥', '📋', '🙋'];

    return (
      <View className="ob-page"><ObHeader onBack={ci > 0 ? prevOrGoBack : goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">{ch.name ? ch.name + ' 的信息' : '孩子' + (ci + 1) + ' 的信息'}</Text>
          <View className="dots-row">{dots}</View>

          {/* 头像 */}
          <View style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 24 }}>
            <View className="avatar-circle" onClick={handleAvatarClick}>
              <Text style={{ fontSize: 72 }}>{ch.avatar || (ch.gender === 'boy' ? '👦' : '👧')}</Text>
            </View>
            {showAvatar && (
              <>
                <View className="modal-mask" onClick={closeAvatarPicker}/>
                <View className="avatar-picker">
                  <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 28, fontWeight: 900 }}>选择头像·{ch.gender === 'boy' ? '男孩' : '女孩'}</Text>
                    <View className="tiny-close" onClick={closeAvatarPicker}><Icon name="x" size={24} color="#333"/></View>
                  </View>
                  <View style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {avatarList.map(function(em, i) {
                      var isSel = ch.avatar === em;
                      return (
                        <View key={i} className={'avatar-pick ' + (isSel ? 'sel' : '')} onClick={function() { pickAvatar(em); }}>
                          <Text style={{ fontSize: 38 }}>{em}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* 名字 */}
          <Text className="field-label">名字</Text>
          <Input className="field-input" value={ch.name} placeholder="请输入孩子名字或昵称"
            onInput={function(e) { onNameInput(e.detail.value); }} />
          <Text className="field-hint">创建后将直接建立孩子的账户</Text>

          {/* 年龄滑块 */}
          <Text className="field-label" style={{ marginTop: 24 }}>年龄</Text>
          <View style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', width: '100%' }}>
            <View style={{ flex: 1 }}>
              <Slider value={ch.age} min={3} max={18} activeColor="#006e1c" backgroundColor="#e5e5e5" blockSize={28} blockColor="#006e1c"
                style={{ width: '100%' }}
                onChange={function(e) {
                  var val = e.detail ? e.detail.value : e;
                  if (typeof val === 'number') { onAgeChange(val); }
                }}
              />
            </View>
            <Text style={{ fontSize: 38, fontWeight: 900, color: '#006e1c', minWidth: 80 }}>{ch.age}<Text style={{ fontSize: 22 }}>岁</Text></Text>
          </View>

          {/* 性别 */}
          <Text className="field-label" style={{ marginTop: 24 }}>性别</Text>
          <View className="gender-row">
            <View className={'gender-chip ' + (ch.gender === 'boy' ? 'active' : '')} onClick={setGenderBoy}>
              <Text style={{ fontSize: 34, marginRight: 6 }}>👦</Text><Text>男孩</Text>
            </View>
            <View className={'gender-chip ' + (ch.gender === 'girl' ? 'active' : '')} onClick={setGenderGirl}>
              <Text style={{ fontSize: 34, marginRight: 6 }}>👧</Text><Text>女孩</Text>
            </View>
          </View>

          {/* 年级 */}
          <Text className="field-label" style={{ marginTop: 24 }}>年级<Text style={{ fontWeight: 400, color: '#999' }}>（自动推算）</Text></Text>
          <Picker mode='selector' range={GRADE_LIST} value={Math.max(0, GRADE_LIST.indexOf(ch.grade))} onChange={function(e) { onGradeChange(e.detail.value); }}>
            <View className="pick-box"><Text>{ch.grade}</Text><Icon name="chevronDown" size={26} color="#999"/></View>
          </Picker>
          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={nextOrChildDetails} text={ci < profile.childrenCount - 1 ? '下一个孩子' : '继续'} showChevron/>
      </View>
    );
  }

  // Daily Schedule
  if (step === 'daily-schedule') {
    var sch = profile.children[ci];
    return (
      <View className="ob-page"><ObHeader onBack={goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">{sch.name ? sch.name + ' 的作息时间' : '孩子' + (ci + 1) + ' 的作息时间'}</Text>
          <View className="dots-row">{profile.children.map(function(_, i) { return i; }).map(function(i) { return <View key={i} className={'dot ' + (i === ci ? 'active' : '')}/>; })}</View>
          <View className="schedule-card" style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 27, fontWeight: 800, color: '#333', marginBottom: 14 }}>上学时间</Text>
            <View style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, color: '#999', marginBottom: 6 }}>到校</Text>
                <Picker mode='time' value={sch.schoolTime.start} onChange={function(e) { onSchoolStartChange(e.detail.value); }}>
                  <View className="time-pick-box"><Text>{sch.schoolTime.start}</Text></View>
                </Picker>
              </View>
              <Icon name="chevronRight" size={24} color="#ccc"/>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, color: '#999', marginBottom: 6 }}>放学</Text>
                <Picker mode='time' value={sch.schoolTime.end} onChange={function(e) { onSchoolEndChange(e.detail.value); }}>
                  <View className="time-pick-box"><Text>{sch.schoolTime.end}</Text></View>
                </Picker>
              </View>
            </View>
          </View>
          <View className="chk-row" style={{ marginTop: 20 }}>
            <View className={'chk-box ' + (sch.hasAfterSchool ? 'on' : '')} onClick={toggleAfterSchool}>
              {sch.hasAfterSchool && <Icon name="check" size={22} color="#fff"/>}
            </View>
            <Text className="chk-lbl">有课外班/托管班</Text>
          </View>
          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={nextChildOrGo} text={ci < profile.childrenCount - 1 ? '下一个孩子' : '继续'} showChevron/>
      </View>
    );
  }

  // Activities — 对齐 Web 原版分类分组 + 3列网格图标卡片
  if (step === 'activities') {
    var ac = profile.children[ci];
    var customActs = ac.customActivities || [];

    /* 按类别分组预置活动 */
    var grouped = {};
    CATEGORIZED_ACTIVITIES.forEach(function(act) {
      if (!grouped[act.category]) grouped[act.category] = [];
      grouped[act.category].push(act);
    });

    var allSelected = ac.afterSchoolActivities.concat(customActs);

    return (
      <View className="ob-page"><ObHeader onBack={goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">{ac.name ? ac.name + ' 的课外活动' : '课外活动选择'}</Text>
          <Text className="ob-step-hint">{ac.gender === 'boy' ? '👦 为男孩推荐' : '👧 为女孩推荐'} · 选择或输入正在参加的活动</Text>
          <View className="dots-row">{profile.children.map(function(_, i) { return i; }).map(function(i) { return <View key={i} className={'dot ' + (i === ci ? 'active' : '')}/>; })}</View>

          {/* 自定义活动输入区 */}
          <View className="act-custom-card">
            <View className="act-custom-label">
              <Icon name="plusCircle" size={22} color="#666"/>
              <Text>自定义活动</Text>
            </View>
            <Text className="act-custom-hint">（如有未列出的活动可手动添加）</Text>
            <View className="act-input-row">
              <Input
                value={customActInput}
                placeholder="输入活动名称，如：跆拳道、击剑..."
                placeholderClass="custom-act-ph"
                onInput={function(e) { setCustomActInput(e.detail.value); }}
                onConfirm={function() { addCustomActivity(); }}
                className="act-input-field"
              />
              <View
                onClick={addCustomActivity}
                className={'act-add-btn ' + (customActInput.trim() ? '' : 'disabled')}
              >
                <Text>添加</Text>
              </View>
            </View>
            {/* 已添加的自定义标签 */}
            {customActs.length > 0 && (
              <View className="act-tag-list">
                {customActs.map(function(act) {
                  return (
                    <View key={'cust-' + act} className="act-green-pill">
                      <Text>{act}</Text>
                      <View onClick={function() { removeCustomActivity(act); }} className="pill-x">
                        <Icon name="x" size={18} color="#006e1c"/>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 预置活动网格 — 分类分组 3列 */}
          <View className="act-grid-scroll">
            {Object.keys(grouped).map(function(catKey) {
              var catItems = grouped[catKey];
              return (
                <View key={catKey} className="act-cat-block">
                  <Text className="act-cat-label">{CATEGORY_NAMES[catKey] || catKey}</Text>
                  <View className="act-grid">
                    {catItems.slice(0, 6).map(function(actItem) {
                      var isSl = ac.afterSchoolActivities.indexOf(actItem.id) >= 0;
                      return (
                        <View
                          key={actItem.id}
                          className={'act-grid-item ' + (isSl ? 'sel' : '')}
                          onClick={function() { toggleActivity(actItem.id); }}
                        >
                          <Icon name={actItem.icon} size={34} color={isSl ? '#006e1c' : '#9ca3af'}/>
                          <Text className={'act-grid-label ' + (isSl ? 'sel' : '')}>{actItem.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* 已选活动汇总 */}
          {allSelected.length > 0 && (
            <View className="act-summary-card">
              <Text className="act-summary-title">已选活动（{allSelected.length}项）</Text>
              <View className="act-summary-tags">
                {allSelected.map(function(act, idx) {
                  /* 查找中文 label：预置活动用 CATEGORIZED_ACTIVITIES 映射，自定义活动直接显示 */
                  var found = CATEGORIZED_ACTIVITIES.find(function(a) { return a.id === act; });
                  var displayLabel = found ? found.label : act;
                  return (
                    <View key={'sel-' + idx} className="act-small-pill">
                      <Text>{displayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={nextChildOrGo} text={ci < profile.childrenCount - 1 ? '下一个孩子' : '继续'} showChevron/>
      </View>
    );
  }

  // Holiday Schedule
  if (step === 'holiday-schedule') {
    return (
      <View className="ob-page"><ObHeader onBack={goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">您的孩子有假期作息变化吗？</Text>
          <Text className="ob-step-hint">寒暑假、小长假期间日程会不同</Text>
          <View className="chk-row" style={{ marginTop: 28 }}>
            <View className={'chk-box ' + (profile.hasHolidaySchedule ? 'on' : '')} onClick={toggleHasHoliday}>
              {profile.hasHolidaySchedule && <Icon name="check" size={22} color="#fff"/>}
            </View>
            <Text className="chk-lbl">假期作息与平日不同</Text>
          </View>
          {profile.hasHolidaySchedule && (
            <View style={{ marginTop: 20 }}>
              <View className="schedule-card" style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 27, fontWeight: 800, color: '#333', marginBottom: 14 }}>假期大致作息</Text>
                <View style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, color: '#999', marginBottom: 6 }}>起床</Text>
                    <Picker mode='time' value={profile.holidayDaySchedule.start} onChange={function(e) { onHolidayStartChange(e.detail.value); }}>
                      <View className="time-pick-box"><Text>{profile.holidayDaySchedule.start}</Text></View>
                    </Picker>
                  </View>
                  <Icon name="chevronRight" size={24} color="#ccc"/>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, color: '#999', marginBottom: 6 }}>就寝</Text>
                    <Picker mode='time' value={profile.holidayDaySchedule.end} onChange={function(e) { onHolidayEndChange(e.detail.value); }}>
                      <View className="time-pick-box"><Text>{profile.holidayDaySchedule.end}</Text></View>
                    </Picker>
                  </View>
                </View>
              </View>
              <View className="schedule-card">
                <Text style={{ fontSize: 27, fontWeight: 800, color: '#333', marginBottom: 14 }}>假期特别活动</Text>
                <View style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {['夏令营', '阅读打卡', '家务劳动', '创意手工', '运动打卡', '家庭旅行'].map(function(act) {
                    var isSel = profile.holidayCustomActivities.indexOf(act) >= 0;
                    return (
                      <View key={act} className={'hol-tag ' + (isSel ? 'active' : '')} onClick={function() { toggleHolidayAct(act); }}>
                        <Text style={{ fontSize: 24, fontWeight: 800, color: isSel ? '#006e1c' : '#666' }}>{act}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={goNext} text="下一步"/>
      </View>
    );
  }

  // Priorities
  if (step === 'priorities') {
    return (
      <View className="ob-page"><ObHeader onBack={goBack}/>
        <ScrollView scrollY enhanced className="ob-step-body">
          <Text className="ob-step-title">您最看重哪些方面？</Text>
          <Text className="ob-step-hint">选择2-3个优先级</Text>
          <View className="pri-grid">
            {PRI_LIST.map(function(pri) {
              var isSel = profile.priorities.indexOf(pri.id) >= 0;
              return (
                <View key={pri.id} className={'pri-card ' + (isSel ? 'active' : '')} onClick={function() { togglePriority(pri.id); }}>
                  <Text className="pri-emoji">{pri.emoji}</Text>
                  <Text className="pri-label">{pri.label}</Text>
                </View>
              );
            })}
          </View>
          <View className="sp-h"/>
        </ScrollView>
        <ObFooter onNext={doAnalyze} text="开始智能分析"/>
      </View>
    );
  }

  // Analyzing
  if (step === 'analyzing') {
    return (
      <View className="ob-page ob-center">
        <View className="analyze-spin"><Icon name="sparkles" size={68} color="#006e1c"/></View>
        <Text className="analyze-title">
          {aiDone ? 'AI 分析完成！' : 'AI 正在分析...'}
        </Text>
        <Text className="analyze-desc">
          {aiDone ? '已为您生成个性化建议' : '正在调用 AI 模型分析家庭画像'}
        </Text>
        <View className="schedule-card" style={{ width: '100%', maxWidth: 480, marginTop: 32 }}>
          <Text style={{ fontSize: 26, fontWeight: 900, color: '#333' }}>正在收集和分析您的信息...</Text>
        </View>
      </View>
    );
  }

  // Recommendations — 干净排版版
  if (step === 'recommendations') {
    var selCount = sel.size;
    var taskItems = recs.filter(function(t) { return t.type !== 'habit'; });
    var habitItems = recs.filter(function(t) { return t.type === 'habit'; });
    var selTasks = taskItems.filter(function(t) { return sel.has(t.id); });
    var selHabits = habitItems.filter(function(t) { return sel.has(t.id); });
    return (
      <View className="ob-page">
        <ObHeader onBack={goBackFromRec} right={<Text className="rec-header-count">已选 {selCount}/{recs.length}</Text>} />
        {/* 标题区 */}
        <View className="rec-title-block">
          <Text className="rec-main-title">选择您需要的项目</Text>
          <Text className="rec-sub-title">点击卡片即可选中或取消（可多选）</Text>
        </View>
        <ScrollView scrollY enhanced className="ob-step-body rec-body">

          {/* 每日任务区块 */}
          {taskItems.length > 0 && (
            <View className="rec-section">
              <View className="rec-section-head">
                <Text className="rec-section-label">每日任务</Text>
                <Text className="rec-pill task-pill">{selTasks.length}/{taskItems.length}</Text>
              </View>
              {taskItems.map(function(task) {
                var isSl = sel.has(task.id);
                return (
                  <View key={task.id} className={'rec-item ' + (isSl ? 'sel' : '')} onClick={function() { toggleRec(task.id); }}>
                    <View className={'rec-item-icon ' + (isSl ? 'sel' : '')}>
                      <Icon name={task.icon === 'Activity' ? 'activity' : 'bookOpen'} size={34} color={isSl ? '#16a34a' : '#9ca3af'}/>
                    </View>
                    <View className="rec-item-body">
                      <View className="rec-item-top">
                        <Text className={'rec-item-name ' + (isSl ? 'sel' : '')}>{task.title}</Text>
                        <Text className="rec-star-badge">+{task.rewardStars}⭐</Text>
                      </View>
                      <Text className={'rec-item-desc ' + (isSl ? 'sel' : '')}>{task.description}</Text>
                    </View>
                    <View className={'rec-check ' + (isSl ? 'sel' : '')}>
                      {isSl && <Icon name="checkCircle2" size={22} color="#fff"/>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 养成习惯区块 */}
          {habitItems.length > 0 && (
            <View className="rec-section">
              <View className="rec-section-head">
                <Text className="rec-section-label habit">养成习惯</Text>
                <Text className="rec-pill habit-pill">{selHabits.length}/{habitItems.length}</Text>
              </View>
              {habitItems.map(function(hab) {
                var isSl = sel.has(hab.id);
                return (
                  <View key={hab.id} className={'rec-item habit ' + (isSl ? 'sel' : '')} onClick={function() { toggleRec(hab.id); }}>
                    <View className={'rec-item-icon habit ' + (isSl ? 'sel' : '')}>
                      <Icon name="sparkles" size={34} color={isSl ? '#9333ea' : '#9ca3af'}/>
                    </View>
                    <View className="rec-item-body">
                      <View className="rec-item-top">
                        <Text className={'rec-item-name ' + (isSl ? 'sel' : '')}>{hab.title}</Text>
                        <Text className="rec-star-badge habit">+{hab.rewardStars}⭐·21天</Text>
                      </View>
                      <Text className={'rec-item-desc ' + (isSl ? 'sel' : '')}>{hab.description}</Text>
                    </View>
                    <View className={'rec-check habit ' + (isSl ? 'sel' : '')}>
                      {isSl && <Icon name="checkCircle2" size={22} color="#fff"/>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View className="sp-h-lg"/>
        </ScrollView>
        <ObFooter onNext={goToPreview} disabled={!canGo()} text={selCount === 0 ? '请先选择任务' : '确认（' + selCount + ' 个任务）'} showCheck/>
      </View>
    );
  }

  // Preview — 干净预览版
  if (step === 'preview') {
    var selRecs = recs.filter(function(t) { return sel.has(t.id); });
    var tskItems = selRecs.filter(function(t) { return t.type !== 'habit'; });
    var habItems = selRecs.filter(function(t) { return t.type === 'habit'; });
    var famName = profile.children.map(function(c) { return c.name; }).join('、');

    return (
      <View className="ob-page">
        <ObHeader onBack={backToRecs} right={<Text className="step-num">预览</Text>} />
        <ScrollView scrollY enhanced className="ob-step-body">

          {/* 家庭信息卡 */}
          <View className="prev-fam-card">
            <Text className="prev-fam-name">{famName || '我的家庭'}</Text>
            <View className="prev-fam-list">
              {profile.children.map(function(c, i) {
                return (
                  <View key={i} className="prev-fam-chip">
                    <Text className="prev-fam-emoji">{c.avatar || (c.gender === 'boy' ? '👦' : '👧')}</Text>
                    <View className="prev-fam-info">
                      <Text className="prev-fam-kidname">{c.name || ('孩子' + (i + 1))}</Text>
                      <Text className="prev-fam-detail">{c.age}岁·{c.grade}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 每日任务列表 */}
          {tskItems.length > 0 && (
            <View className="prev-list-card">
              <View className="prev-list-head">
                <Text className="prev-list-title">📋 每日任务</Text>
                <Text className="prev-list-count">{tskItems.length}项</Text>
              </View>
              {tskItems.map(function(t, i) {
                return (
                  <View key={t.id} className="prev-row">
                    <Text className="prev-row-idx">{String(i + 1).padStart(2, '0')}</Text>
                    <View className="prev-row-body">
                      <Text className="prev-row-name">{t.title}</Text>
                      <Text className="prev-row-desc">{t.description}</Text>
                    </View>
                    <Text className="prev-row-star">⭐{t.rewardStars}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* 养成习惯列表 */}
          {habItems.length > 0 && (
            <View className="prev-list-card habit">
              <View className="prev-list-head">
                <Text className="prev-list-title habit">✨ 养成习惯</Text>
                <Text className="prev-list-count habit">{habItems.length}项</Text>
              </View>
              {habItems.map(function(h, i) {
                return (
                  <View key={h.id} className="prev-row habit-row">
                    <Text className="prev-row-idx habit">{String(i + 1).padStart(2, '0')}</Text>
                    <View className="prev-row-body">
                      <Text className="prev-row-name">{h.title}</Text>
                      <Text className="prev-row-desc">{h.description}</Text>
                    </View>
                    <View className="prev-row-right">
                      <Text className="prev-row-star habit">⭐{h.rewardStars}</Text>
                      <Text className="prev-day-badge">21天</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 特殊需求 */}
          <View className="prev-list-card">
            <Text className="prev-list-title">其他需求（可选）</Text>
            <Textarea
              className="prev-textarea"
              value={profile.specialRequests}
              placeholder="补充您的特殊需求..."
              onInput={function(e) { onSpecialRequestChange(e.detail.value); }}
            />
          </View>

          <View className="sp-h-lg"/>
        </ScrollView>

        {/* 底部按钮 */}
        <View className="preview-bottom-btns">
          <View className="ob-finish-btn" onClick={confirmImport}>
            <Icon name="checkCircle2" size={32} color="#fff"/><Text className="finish-text">确认导入</Text>
          </View>
          <View className="ob-secondary-btn" onClick={backToRecs}>
            <Text style={{ color: '#666', fontWeight: 800 }}>返回调整</Text>
          </View>
        </View>
      </View>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <View className="ob-page ob-center">
        <View className="success-icon"><Icon name="checkCircle2" size={88} color="#22c55e"/></View>
        <Text className="success-big-title">设置完成！</Text>
        <Text className="success-big-desc">已创建 {profile.childrenCount} 个孩子账户，{sel.size} 个任务</Text>
        <View className="ob-primary-btn" onClick={goHome}>
          <Text>开始使用</Text>
        </View>
      </View>
    );
  }

  return null;
}

/* ===== 子组件 ===== */
function ObHeader(props) {
  var onBack = props.onBack;
  var right = props.right;
  return (
    <View className="ob-step-header">
      <View className="back-btn" onClick={onBack}><Icon name="chevronLeft" size={34} color="#333"/></View>
      {right || <View />}
    </View>
  );
}

function ObFooter(props) {
  var text = props.text;
  if (!text) return null;
  var disabled = props.disabled;
  var onNext = disabled ? undefined : props.onNext;
  return (
    <View className="ob-bottom-bar">
      <View className={'ob-next-btn ' + (disabled ? 'disabled' : '')} onClick={onNext}>
        {props.showCheck && <Icon name="checkCircle2" size={30} color="#fff"/>}
        <Text>{text}</Text>
        {props.showChevron && <Icon name="chevronRight" size={30} color="#fff"/>}
      </View>
    </View>
  );
}
