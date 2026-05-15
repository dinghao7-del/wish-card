/**
 * 创建任务页面 — 对齐 Web 版 PublishTask.tsx
 * 支持目标/习惯两种模式
 */
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

// ===== 安全的 renderToggle (纯内联style, v5验证通过) =====
const renderToggle = (checked: boolean, onToggle: () => void) => (
  <View
    onClick={onToggle}
    style={{
      width: '72rpx', height: '36rpx', borderRadius: '9999px',
      padding: '4rpx', display: 'flex', alignItems: 'center',
      background: checked ? '#4CAF50' : '#E0E0E0',
      transition: 'background 0.3s ease',
    }}
  >
    <View style={{
      width: '28rpx', height: '28rpx', borderRadius: '50%',
      background: 'white', boxShadow: '0 2rpx 4rpx rgba(0,0,0,0.2)',
      transform: `translateX(${checked ? 36 : 0}rpx)`,
      transition: 'transform 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)',
    }} />
  </View>
);

const decodeParam = (value?: string | string[]) => decodeURIComponent(String(Array.isArray(value) ? value[0] : value || ''));
const mapTemplateCategory = (value?: string | string[]) => {
  const raw = decodeParam(value);
  const map: Record<string, string> = {
    study: '学习',
    life: '生活',
    hobby: '兴趣',
    independent: '独立',
    praise: '表扬',
    critique: '批评',
  };
  return map[raw] || raw || '生活';
};

export default function CreateTask() {
  const router = useRouter();
  const isEdit = !!router.params.id;
  const isCustomMode = router.params.custom === '1';
  // custom=1 时尊重入口 mode；否则从 URL 读取或默认 'target'
  let initialMode: 'target' | 'habit' = (router.params.mode || 'target') as any;
  if (isCustomMode && router.params.mode !== 'habit') initialMode = 'target';

  // 模式 — Web 第62行
  const [viewMode, setViewMode] = useState<string>(initialMode);
  const [habitType, setHabitType] = useState<'reward' | 'penalty'>('reward');
  const [resetAfterClaim, setResetAfterClaim] = useState(true);

  // 表单数据 — Web 第93-107行
  const [title, setTitle] = useState(() => decodeParam(router.params.title));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(() => mapTemplateCategory(router.params.category));
  const [rewardStars, setRewardStars] = useState(() => Number(router.params.stars) || 5);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'once'>('daily');
  const [targetCount, setTargetCount] = useState(10);
  const [selectedIcon, setSelectedIcon] = useState('Sparkles');
  const [creatorId, setCreatorId] = useState('');

  // Toggle 开关 — Web 第87-88行
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(true);
  const [isTimeEnabled, setIsTimeEnabled] = useState(false);
  const [showDescInput, setShowDescInput] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // 弹窗 — Web 第68-74行
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // 计划选择
  const [selectedPlan, setSelectedPlan] = useState<{tag: string, name: string}>({tag: '假', name: '假期计划'});

  // 时间选择（开始时间 + 持续时长）
  const [reminderTime, setReminderTime] = useState('09:00');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [durationIdx, setDurationIdx] = useState(0);
  const durationValues = [30, 60, 90, 120];

  // 时段标签: "09:00 ~ 10:00"
  const getTimeLabel = () => {
    try {
      const start = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
      const dur = durationValues[durationIdx] || 60;
      const totalMins = selectedHour * 60 + selectedMinute + dur;
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      return `${start} ~ ${end}`;
    } catch { return '任意时间'; }
  };

  // 分类
  const categories = ['劳动', '学习', '生活', '兴趣', '独立', '表扬', '批评'];
  const [tempCategory, setTempCategory] = useState('生活');

  // 重复周期
  const repeatOptions = [
    { key: 'daily', label: '每天' },
    { key: 'weekday', label: '工作日' },
    { key: 'weekend', label: '周末' },
    { key: 'custom', label: '自定义' },
  ];
  const [selectedRepeat, setSelectedRepeat] = useState('daily');

  // 成员数据（模拟，后续对接真实数据）
  const [members] = useState([
    { id: 'p1', name: '爸爸', role: 'parent', avatar: '' },
    { id: 'p2', name: '妈妈', role: 'parent', avatar: '' },
    { id: 'c1', name: '小明', role: 'child', avatar: '' },
    { id: 'c2', name: '小红', role: 'child', avatar: '' },
  ]);
  const parents = members.filter(m => m.role === 'parent');
  const children = members.filter(m => m.role === 'child');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(children.map(c => c.id));

  // 可选图标
  const iconOptions = ['Sparkles', 'BookOpen', 'Dumbbell', 'Heart', 'Star', 'Clock', 'Sun', 'Moon', 'Music', 'Brush', 'Smile', 'Trophy'];

  // 日志
  const log = (msg: string) => {
    console.log(`[CreateTask] ${msg}`);
    Taro.vibrateShort({ type: 'light' }).catch(() => {});
  };

  const handleBack = () => {
    log('back');
    Taro.navigateBack();
  };

  const handleSubmit = async () => {
    log(`submit | mode=${viewMode} title="${title}" stars=${rewardStars}`);
    if (!title.trim()) {
      Taro.showToast({ title: viewMode === 'target' ? '请输入任务名称' : '请输入习惯名称', icon: 'none' });
      return;
    }
    Taro.showLoading({ title: '保存中...' });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      Taro.hideLoading();
      Taro.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (error) {
      Taro.hideLoading();
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  const handleSelectCategory = (cat: string) => setTempCategory(cat);
  const confirmCategory = () => { setCategory(tempCategory); setShowCategoryModal(false); };
  const handleSelectRepeat = (key: string) => { setSelectedRepeat(key); };

  // 模板数据
  const templates = [
    { title: '按时起床', desc: '', stars: 5, category: '独立' },
    { title: '整理房间', desc: '', stars: 3, category: '劳动' },
    { title: '完成作业', desc: '', stars: 5, category: '学习' },
    { title: '坚持运动', desc: '', stars: 4, category: '兴趣' },
    { title: '早睡早起', desc: '', stars: 6, category: '独立' },
  ];

  return (
    <View className={`create-page ${getThemeClass()}`}>
      {/* ===== Header — 对齐Web 第367-425行 ===== */}
      <View className='cp-header'>
        <View className='cp-header-back' onClick={handleBack}>
          <Icon name='chevronLeft' size={20} color='#333' />
        </View>

        {/* Header: 编辑模式显示标题; 非编辑习惯模式只显示"好习惯"; 非编辑目标模式显示切换器 */}
        {isEdit ? (
          <Text className='cp-header-title'>{viewMode === 'target' ? '编辑目标' : '编辑好习惯'}</Text>
        ) : viewMode === 'habit' ? (
          <Text className='cp-header-title'>好习惯</Text>
        ) : (
          <View className='cp-mode-toggle'>
            <Text
              className={`cp-mode-btn ${viewMode === 'target' ? 'active' : ''}`}
              onClick={() => setViewMode('target')}
            >创建目标</Text>
            <View style={{ width: '2rpx', height: '24rpx', backgroundColor: 'rgba(0,0,0,0.1)', margin: '0 6rpx' }} />
            <Text
              className={`cp-mode-btn ${viewMode === 'habit' ? 'active' : ''}`}
              onClick={() => setViewMode('habit')}
            >好习惯</Text>
          </View>
        )}

        <View className='cp-header-right'>
          {!isEdit && viewMode === 'target' && (
            <View className='cp-import-btn' onClick={() => { setShowTemplateModal(true); log('open-template'); }}>
              <Text>导入</Text>
              <Icon name='chevronRight' size={12} color='#4CAF50' />
            </View>
          )}
        </View>
      </View>

      <ScrollView scrollY className='cp-body' enhanced showScrollbar={false} style={{ width: '100%', overflowX: 'hidden' }}>
        {viewMode === 'target' ? (
          <>
            {/* ===== 目标模式 — 对齐Web 第428-588行 ===== */}
            {/* 标题+分类卡片 — 对齐Web 第431-486行 */}
            <View className='cp-card'>
              <View className='cp-card-label'>请输入目标名称</View>
              <Input
                className='cp-title-input'
                value={title}
                onInput={(e) => setTitle(e.detail.value)}
                placeholder='如：完成数学作业'
                placeholderClass='cp-placeholder'
                maxlength={30}
              />
              <View className='cp-divider' />
              <View className='cp-category-row'>
                {!showDescInput ? (
                  <View className='cp-add-desc' onClick={() => { setShowDescInput(true); log('show-desc'); }}>
                    <Icon name='plus' size={14} color='#4CAF50' />
                    <Text>添加描述</Text>
                  </View>
                ) : (
                  <Text className='cp-desc-hint'>描述内容</Text>
                )}
                <View className='cp-cat-pill' onClick={() => { setTempCategory(category); setShowCategoryModal(true); }}>
                  <Text>{category}</Text>
                  <Icon name='chevronRight' size={14} color='#999' />
                </View>
              </View>
              {showDescInput && (
                <Textarea
                  className='cp-textarea'
                  value={description}
                  onInput={(e) => setDescription(e.detail.value)}
                  placeholder='添加详细说明...'
                  placeholderClass='cp-placeholder'
                  maxlength={200}
                  autoHeight
                />
              )}
            </View>

            {/* 设置组 — 对齐Web 第489-587行 */}
            <View className='cp-card cp-settings-group'>
              {/* 重复 */}
              <View className='cp-setting-row'>
                <View className='cp-setting-left'>
                  <View className={`cp-setting-icon ${isRepeatEnabled ? 'active' : ''}`}>
                    <Icon name={isRepeatEnabled ? 'rotate-ccw' : 'plus'} size={18} color={isRepeatEnabled ? '#4CAF50' : '#CCC'} />
                  </View>
                  <Text className='cp-setting-label'>重复</Text>
                  {renderToggle(isRepeatEnabled, () => setIsRepeatEnabled(!isRepeatEnabled))}
                </View>
                <View
                  className={`cp-setting-right ${!isRepeatEnabled ? 'disabled' : ''}`}
                  onClick={() => { if (isRepeatEnabled) { setShowRepeatModal(true); log('open-repeat'); } }}
                >
                  <Text>{isRepeatEnabled ? (selectedRepeat === 'daily' ? '每天' : selectedRepeat === 'weekday' ? '工作日' : selectedRepeat === 'weekend' ? '周末' : '自定义') : '单次任务'}</Text>
                  <Icon name='chevronRight' size={14} color={isRepeatEnabled ? '#999' : '#DDD'} />
                </View>
              </View>

              <View className='cp-divider' />

              {/* 时段 */}
              <View className='cp-setting-row'>
                <View className='cp-setting-left'>
                  <View className={`cp-setting-icon ${isTimeEnabled ? 'active' : ''}`}>
                    <Icon name='clock' size={18} color={isTimeEnabled ? '#4CAF50' : '#CCC'} />
                  </View>
                  <Text className='cp-setting-label'>时段</Text>
                  {renderToggle(isTimeEnabled, () => setIsTimeEnabled(!isTimeEnabled))}
                </View>
                <View
                  className={`cp-setting-right ${!isTimeEnabled ? 'disabled' : ''}`}
                  onClick={() => { if (isTimeEnabled) { setShowTimeModal(true); log('open-time'); } }}
                >
                  <Text>{isTimeEnabled ? getTimeLabel() : '任意时间'}</Text>
                  <Icon name='chevronRight' size={14} color={isTimeEnabled ? '#999' : '#DDD'} />
                </View>
              </View>

              <View className='cp-divider' />

              {/* 计划 — 对齐Web 第571-586行 */}
              <View className='cp-setting-row' onClick={() => { setShowPlanModal(true); log('open-plan'); }}>
                <View className='cp-setting-left'>
                  <View className='cp-setting-icon'>
                    <Icon name='calendar' size={18} color='#999' />
                  </View>
                  <Text className='cp-setting-label'>计划</Text>
                  <Icon name='help-circle' size={14} color='#DDD' />
                </View>
                <View className='cp-plan-badge'>
                  <Text className='cp-plan-tag'>{selectedPlan.tag}</Text>
                  <Text className='cp-plan-name'>{selectedPlan.name}</Text>
                  <Icon name='chevronRight' size={14} color='#999' />
                </View>
              </View>
            </View>

            {/* 星星+成员卡片 — 对齐Web 第794-882行 */}
            <View className='cp-card cp-members-card'>
              {/* 星星积分奖励 — 对齐Web 第795-822行 */}
              <View className='cp-stars-row'>
                <Text className='cp-stars-label'>星星积分奖励</Text>
                <View className='cp-stars-control'>
                  <View className='cp-star-btn' onClick={() => setRewardStars(Math.max(0, rewardStars - 1))}>
                    <Text>-</Text>
                  </View>
                  <Text className='cp-star-count'>{rewardStars}</Text>
                  <View className='cp-star-btn' onClick={() => setRewardStars(rewardStars + 1)}>
                    <Text>+</Text>
                  </View>
                  <View className='cp-star-icon-box'>
                    <Icon name='star' size={12} color='#FFB800' />
                  </View>
                </View>
              </View>

              <View className='cp-divider' />

              {/* 发布家长 — 对齐Web: 横排2列卡片 */}
              <View className='cp-section-title'>发布家长 (家长选项)</View>
              <View className='cp-parent-grid'>
                {parents.map(p => (
                  <View
                    key={p.id}
                    className={`cp-parent-row-card ${creatorId === p.id ? 'selected' : ''}`}
                    onClick={() => setCreatorId(p.id)}
                  >
                    <View className='cp-avatar-sm'>
                      <Icon name='user' size={18} color={creatorId === p.id ? '#4CAF50' : '#999'} />
                    </View>
                    <Text className={`cp-parent-name ${creatorId === p.id ? 'selected' : ''}`}>{p.name}</Text>
                  </View>
                ))}
              </View>

              <View className='cp-divider' />

              {/* 执行的小朋友 — 对齐Web: 横排2列卡片 */}
              <View className='cp-section-title'>执行的小朋友</View>
              <View className='cp-child-grid'>
                {children.map(c => {
                  const isSelected = assigneeIds.includes(c.id);
                  return (
                    <View
                      key={c.id}
                      className={`cp-parent-row-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setAssigneeIds(isSelected ? assigneeIds.filter(id => id !== c.id) : [...assigneeIds, c.id]);
                      }}
                    >
                      <View className='cp-avatar-sm'>
                        <Icon name='user' size={18} color={isSelected ? '#4CAF50' : '#999'} />
                      </View>
                      <Text className={`cp-parent-name ${isSelected ? 'selected' : ''}`}>{c.name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ===== 习惯模式 — 对齐Web 第590-789行 ===== */}
            {/* 标题卡片 — 对齐Web 第593-616行 */}
            <View className='cp-card'>
              <View className='cp-title-row-header'>
                <View className='cp-card-label'>标题</View>
                <View className='cp-import-btn' onClick={() => { Taro.navigateTo({ url: '/pkg/templates/index?mode=habit&habitOnly=1' }); }}>
                  <Text>导入</Text>
                  <Icon name='chevronRight' size={14} color='#4CAF50' />
                </View>
              </View>
              <Input
                className='cp-title-input'
                value={title}
                onInput={(e) => setTitle(e.detail.value)}
                placeholder='请输入标题'
                placeholderClass='cp-placeholder'
                maxlength={30}
              />
            </View>

            {/* 选择图片 — 对齐Web 第619-633行 */}
            <View className='cp-card cp-clickable' onClick={() => { setShowIconPicker(true); log('open-icon'); }}>
              <View className='cp-row-between'>
                <View className='cp-icon-choose'>
                  <Icon name='image' size={18} color='#999' />
                  <Text>选择图片 (可选)</Text>
                </View>
                <View className='cp-icon-preview'>
                  <Icon name={selectedIcon} size={24} color='#4CAF50' />
                  <Icon name='chevronRight' size={14} color='#CCC' />
                </View>
              </View>
            </View>

            {/* 日内多次打卡 — 对齐Web 第636-655行 */}
            <View className='cp-card cp-row-between'>
              <View className='cp-row-icon-text'>
                <Icon name='refreshCw' size={18} color='#999' />
                <Text>日内可以多次打卡</Text>
              </View>
              {renderToggle(resetAfterClaim, () => setResetAfterClaim(!resetAfterClaim))}
            </View>

            {/* 星星 — 对齐Web 第658-674行 */}
            <View className='cp-card'>
              <View className='cp-card-label'>
                <Text style={{ color: 'red' }}>*</Text>
                <Text> 星星</Text>
              </View>
              <Input
                className='cp-number-input'
                value={String(rewardStars)}
                onInput={(e) => setRewardStars(parseInt(e.detail.value) || 0)}
                type='number'
                placeholder='0'
                placeholderClass='cp-placeholder'
              />
            </View>

            {/* 次数限制 — 对齐Web 第677-693行 */}
            <View className='cp-card'>
              <View className='cp-card-label'>
                <Text style={{ color: 'red' }}>*</Text>
                <Text> 次数限制</Text>
              </View>
              <Input
                className='cp-number-input'
                value={String(targetCount)}
                onInput={(e) => setTargetCount(parseInt(e.detail.value) || 1)}
                type='number'
                placeholder='10'
                placeholderClass='cp-placeholder'
              />
            </View>

            {/* 选择成员 — 对齐Web 第696-738行 */}
            <View className='cp-card'>
              <View className='cp-card-label'>
                <Text style={{ color: 'red' }}>*</Text>
                <Text> 选择成员</Text>
              </View>
              <View className='cp-avatar-grid'>
                {children.map(c => {
                  const isSelected = assigneeIds.includes(c.id);
                  return (
                    <View key={c.id} className='cp-avatar-item' onClick={() => {
                      setAssigneeIds(isSelected ? assigneeIds.filter(id => id !== c.id) : [...assigneeIds, c.id]);
                    }}>
                      <View className={`cp-avatar-circle ${isSelected ? 'selected' : ''}`}>
                        <Icon name='user' size={24} color={isSelected ? '#4CAF50' : '#999'} />
                      </View>
                      <Text className='cp-avatar-label'>{c.name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 类型 — 对齐Web 第741-773行 */}
            <View className='cp-card'>
              <View className='cp-type-toggle'>
                <View
                  className={`cp-type-btn ${habitType === 'reward' ? 'active-reward' : ''}`}
                  onClick={() => setHabitType('reward')}
                >
                  <Text>奖励</Text>
                </View>
                <View
                  className={`cp-type-btn ${habitType === 'penalty' ? 'active-penalty' : ''}`}
                  onClick={() => setHabitType('penalty')}
                >
                  <Text>惩罚</Text>
                </View>
              </View>
            </View>

            {/* 描述 — 对齐Web 第777-788行 */}
            <View className='cp-card'>
              <View className='cp-card-label'>描述</View>
              <Textarea
                className='cp-textarea'
                value={description}
                onInput={(e) => setDescription(e.detail.value)}
                placeholder='请输入描述内容'
                placeholderClass='cp-placeholder'
                maxlength={200}
                autoHeight
              />
            </View>
          </>
        )}

        <View style={{ height: '200rpx' }} />
      </ScrollView>

      {/* ===== 固定底部提交栏 — 对齐Web 第886-902行 ===== */}
      <View className='cp-submit-bar'>
        <View className='cp-submit-btn' onClick={handleSubmit}>
          <Text>{isEdit ? '保存修改' : '确认添加'}</Text>
        </View>
      </View>

      {/* ===== 分类选择弹窗 ===== */}
      {showCategoryModal && (
        <View className='cp-modal-mask' onClick={() => setShowCategoryModal(false)}>
          <View className='cp-modal-card' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-header'>
              <View className='cp-modal-close' onClick={() => setShowCategoryModal(false)}>
                <Icon name='plus' size={24} style={{ transform: 'rotate(45deg)' }} />
              </View>
              <Text className='cp-modal-title'>请选择</Text>
              <View className='cp-modal-confirm' onClick={confirmCategory}>
                <Icon name='check' size={24} color='#4CAF50' />
              </View>
            </View>
            <View className='cp-modal-body'>
              {categories.map(cat => (
                <View
                  key={cat}
                  className={`cp-cat-item ${tempCategory === cat ? 'selected' : ''}`}
                  onClick={() => handleSelectCategory(cat)}
                >
                  <Text>{cat}</Text>
                  {tempCategory === cat && <Icon name='check' size={16} color='#4CAF50' />}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ===== 重复周期弹窗 ===== */}
      {showRepeatModal && (
        <View className='cp-modal-mask' onClick={() => setShowRepeatModal(false)}>
          <View className='cp-modal-bottom' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-handle' />
            <View className='cp-modal-header-bottom'>
              <Text className='cp-modal-title'>重复设置</Text>
              <View className='cp-modal-confirm' onClick={() => setShowRepeatModal(false)}>
                <Icon name='check' size={24} color='#4CAF50' />
              </View>
            </View>
            <View className='cp-repeat-grid'>
              {repeatOptions.map(opt => (
                <View
                  key={opt.key}
                  className={`cp-repeat-item ${selectedRepeat === opt.key ? 'selected' : ''}`}
                  onClick={() => handleSelectRepeat(opt.key)}
                >
                  <Text>{opt.label}</Text>
                </View>
              ))}
            </View>
            <View className='cp-repeat-hint'>
              <Text>{selectedRepeat === 'daily' ? '每天可打卡评分' : selectedRepeat === 'weekday' ? '仅工作日可打卡' : selectedRepeat === 'weekend' ? '仅周末可打卡' : '自定义重复规则'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 时段选择弹窗（开始时间 ~ 持续时长） ===== */}
      {showTimeModal && (
        <View className='cp-modal-mask' onClick={() => setShowTimeModal(false)}>
          <View className='cp-modal-bottom' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-handle' />
            <View className='cp-modal-header-bottom'>
              <Text className='cp-modal-title'>时段设置</Text>
              <Text className='cp-time-preview'>{getTimeLabel()}</Text>
              <View className='cp-modal-confirm' onClick={() => setShowTimeModal(false)}>
                <Icon name='check' size={24} color='#4CAF50' />
              </View>
            </View>

            {/* 开始时间 */}
            <Text className='cp-time-section-label'>开始时间</Text>
            <View className='cp-time-picker'>
              <View className='cp-time-col'>
                {[...Array(24)].map((_, i) => (
                  <View
                    key={i}
                    className={`cp-time-item ${selectedHour === i ? 'selected' : ''}`}
                    onClick={() => { setSelectedHour(i); }}
                  >
                    <Text>{String(i).padStart(2, '0')}</Text>
                  </View>
                ))}
              </View>
              <Text className='cp-time-sep'>:</Text>
              <View className='cp-time-col'>
                {[0, 15, 30, 45].map(m => (
                  <View
                    key={m}
                    className={`cp-time-item ${selectedMinute === m ? 'selected' : ''}`}
                    onClick={() => { setSelectedMinute(m); }}
                  >
                    <Text>{String(m).padStart(2, '0')}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 持续时长 */}
            <Text className='cp-time-section-label'>持续时长</Text>
            <View className='cp-dur-grid'>
              {durationValues.map((d, idx) => (
                <View
                  key={d}
                  className={`cp-repeat-item ${durationIdx === idx ? 'selected' : ''}`}
                  onClick={() => setDurationIdx(idx)}
                >
                  <Text>{d}分钟</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ===== 模板选择弹窗 ===== */}
      {showTemplateModal && (
        <View className='cp-modal-mask' onClick={() => setShowTemplateModal(false)}>
          <View className='cp-modal-bottom' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-handle' />
            <View className='cp-modal-header-bottom'>
              <Text className='cp-modal-title'>选择模板</Text>
              <View className='cp-modal-confirm' onClick={() => setShowTemplateModal(false)}>
                <Icon name='x' size={24} color='#999' />
              </View>
            </View>
            <View className='cp-modal-list'>
              {templates.map((tpl, idx) => (
                <View
                  key={idx}
                  className='cp-modal-item'
                  onClick={() => {
                    setTitle(tpl.title);
                    setRewardStars(tpl.stars);
                    setCategory(tpl.category);
                    setShowTemplateModal(false);
                    log(`template: ${tpl.title}`);
                  }}
                >
                  <Text className='cp-modal-item-text'>{tpl.title}</Text>
                  <Text className='cp-modal-item-meta'>{tpl.category} · ⭐{tpl.stars}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ===== 计划选择弹窗 ===== */}
      {showPlanModal && (
        <View className='cp-modal-mask' onClick={() => setShowPlanModal(false)}>
          <View className='cp-modal-bottom' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-handle' />
            <View className='cp-modal-header-bottom'>
              <Text className='cp-modal-title'>选择计划</Text>
              <View className='cp-modal-confirm' onClick={() => setShowPlanModal(false)}>
                <Icon name='x' size={24} color='#999' />
              </View>
            </View>
            <View className='cp-modal-list'>
              {[
                { tag: '无', name: '无计划' },
                { tag: '寒', name: '寒假计划' },
                { tag: '暑', name: '暑假计划' },
                { tag: '假', name: '假期计划' },
                { tag: '周', name: '每周计划' },
              ].map((plan, idx) => (
                <View
                  key={idx}
                  className={`cp-modal-item ${selectedPlan.name === plan.name ? 'selected' : ''}`}
                  onClick={() => { setSelectedPlan(plan); setShowPlanModal(false); }}
                >
                  <Text className={`cp-modal-item-text ${selectedPlan.name === plan.name ? 'selected' : ''}`}>{plan.name}</Text>
                  {selectedPlan.name === plan.name && <Icon name='check' size={16} color='#4CAF50' />}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ===== 图标选择弹窗 ===== */}
      {showIconPicker && (
        <View className='cp-modal-mask' onClick={() => setShowIconPicker(false)}>
          <View className='cp-modal-bottom' onClick={(e) => e.stopPropagation()}>
            <View className='cp-modal-handle' />
            <View className='cp-modal-header-bottom'>
              <Text className='cp-modal-title'>选择图标</Text>
              <View className='cp-modal-confirm' onClick={() => setShowIconPicker(false)}>
                <Icon name='check' size={24} color='#4CAF50' />
              </View>
            </View>
            <View className='cp-icon-grid'>
              {iconOptions.map(iconName => (
                <View
                  key={iconName}
                  className={`cp-icon-option ${selectedIcon === iconName ? 'selected' : ''}`}
                  onClick={() => { setSelectedIcon(iconName); setShowIconPicker(false); }}
                >
                  <Icon name={iconName} size={28} color={selectedIcon === iconName ? '#4CAF50' : '#666'} />
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
