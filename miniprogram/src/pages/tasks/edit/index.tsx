/**
 * 编辑任务页面 — 对齐 Web 版 PublishTask.tsx + 小程序创建页
 * 字段、分类选项、提交数据结构完全一致
 */
import { View, Text, Input, Textarea, Picker, ScrollView, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import TaskTemplateSelector from '@/components/TaskTemplateSelector';
import { ALL_TASK_TEMPLATES, resolveAvatarPath } from '@/lib/templates';
import type { TaskTemplate } from '@/lib/templates';
import './index.scss';

const CATEGORIES = ['劳动', '学习', '生活', '兴趣', '独立', '表扬', '批评'];
const FREQUENCY_OPTIONS = [
  { value: 'once' as const, label: '单次' },
  { value: 'daily' as const, label: '每天' },
  { value: 'weekly' as const, label: '每周' },
  { value: 'monthly' as const, label: '每月' },
];

export default function EditTask() {
  const router = useRouter();
  const taskId = (router.params.id as string) || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ===== 对齐 Web 版 formData 结构（PublishTask.tsx 第100-114行）=====
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescInput, setShowDescInput] = useState(false);
  const [type, setType] = useState('生活');
  const [rewardStars, setRewardStars] = useState(5);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [creatorId, setCreatorId] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState('');

  // 重复/时段/提醒（对齐Web版第90-95行）
  const [repeatEnabled, setRepeatEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');

  // 习惯模式
  const [isHabit, setIsHabit] = useState(false);
  const [targetCount, setTargetCount] = useState(10);

  // 模板选择器
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!taskId) { Taro.navigateBack(); return; }
    loadTask();
  }, []);

  const loadTask = async () => {
    try {
      const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
      if (task) {
        setTitle(task.title || '');
        setDescription(task.description || '');
        setShowDescInput(!!task.description);
        setRewardStars(Math.abs(task.star_amount ?? task.reward_stars ?? 5));
        setIsHabit(task.is_habit || false);
        setTargetCount(task.target_count || 10);
        
        // 分类映射
        if (task.type && CATEGORIES.includes(task.type)) setType(task.type);
        else if (task.category && CATEGORIES.includes(task.category)) setType(task.category);

        // 重复/时段/提醒
        if (task.frequency) setRepeatEnabled(task.frequency !== 'once');
        if (task.frequency && ['once','daily','weekly','monthly'].includes(task.frequency as any)) setFrequency(task.frequency as any);
        else setFrequency('daily');

        if (task.start_time) {
          const d = new Date(task.start_time);
          const h = String(d.getHours()).padStart(2,'0');
          const m = String(d.getMinutes()).padStart(2,'0');
          setStartTime(`${h}:${m}`);
        }
        if (task.reminder_time || task.reminderTime) setReminderTime((task.reminder_time || task.reminderTime || '09:00'));
        if (task.reminder_time || task.reminderTime) setReminderEnabled(true);

        setCreatorId(task.creator_id || '');

        // 获取家庭成员
        let fid = task.family_id;
        if (!fid) {
          const stored = Taro.getStorageSync('guest_user');
          fid = stored ? JSON.parse(stored).family_id : '';
        }
        setFamilyId(fid || '');

        if (fid && fid !== 'guest-family') {
          const { data: mems } = await supabase.from('members').select('*').eq('family_id', fid);
          if (mems && mems.length > 0) {
            setMembers(mems);
            if (task.assignee_ids) {
              const ids = Array.isArray(task.assignee_ids) ? task.assignee_ids : JSON.parse(task.assignee_ids || '[]');
              setAssigneeIds(ids);
            } else if (mems.some(m => m.role === 'child')) {
              setAssigneeIds(mems.filter(m => m.role === 'child').map(m => m.id));
            }
            if (!creatorId) {
              const firstParent = mems.find(m => m.role === 'parent');
              if (firstParent) setCreatorId(firstParent.id);
            }
          }
        } else {
          // 游客模式的默认成员
          const defaultMembers = [
            { id: '1', name: '妈妈', role: 'parent', avatar: '' },
            { id: '2', name: '爸爸', role: 'parent', avatar: '' },
            { id: '3', name: '小明', role: 'child', avatar: '' },
            { id: '4', name: '小红', role: 'child', avatar: '' },
          ];
          setMembers(defaultMembers);
          setAssigneeIds(['3']);
          setCreatorId('1');
        }
      }
    } catch (err) {
      console.error('[EditTask] loadTask error:', err);
    }
    setLoading(false);
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) { Taro.showToast({ title: '请输入目标名称', icon: 'none' }); return; }

    setSaving(true);
    try {
      // 对齐 Web 版 finalFormData 结构
      const updateData: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        type: type,
        star_amount: rewardStars,
        rewardStars: rewardStars,
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : [],
        creator_id: creatorId,
        is_habit: isHabit,
        target_count: isHabit ? targetCount : null,
        frequency: repeatEnabled ? frequency : 'once',
        start_time: timeEnabled ? `${new Date().toISOString().split('T')[0]}T${startTime}:00` : null,
        end_time: timeEnabled ? `${new Date().toISOString().split('T')[0]}T${endTime}:00` : null,
        reminder_time: reminderEnabled ? reminderTime : null,
        icon: 'ListTodo',
      };

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;

      Taro.showToast({ title: '任务已更新', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
    setSaving(false);
  };

  /** 模板选择填充 */
  const handleTemplateSelect = (tpl: TaskTemplate) => {
    setTitle(tpl.title);
    setDescription(tpl.description || '');
    if (tpl.description) setShowDescInput(true);
    setRewardStars(typeof tpl.stars === 'number' ? tpl.stars : (tpl.defaultStars ?? 5));
    const catMap: Record<string, string> = {
      'study': '学习', 'life': '生活', 'hobby': '兴趣',
      'independent': '独立', 'praise': '表扬', 'critique': '批评',
      '劳动': '劳动', '学习': '学习', '生活': '生活', '兴趣': '兴趣',
      '独立': '独立', '表扬': '表扬', '批评': '批评',
    };
    setType(catMap[tpl.category] || '生活');
  };

  const parentMembers = members.filter(m => m.role === 'parent');
  const childMembers = members.filter(m => m.role === 'child');

  if (loading) {
    return (
      <View className="edit-page">
        <View className="edit-loading"><Icon name="loader" size={48} color="#006e1c" /></View>
      </View>
    );
  }

  return (
    <View className="edit-page">
      {/* ===== Header（对齐创建页）===== */}
      <View className="edit-header">
        <View className="edit-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={36} color="#3f4a3c" />
        </View>
        <Text className="edit-header-title">编辑目标</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      <ScrollView className="edit-body" scrollY>
        {/* ===== 模板入口 ===== */}
        <View className="edit-card edit-template-entry" onClick={() => setShowTemplates(true)}>
          <Icon name="sparkles" size={32} color="#006e1c" />
          <Text className="edit-template-text">从模板选择推荐目标</Text>
          <Text className="edit-template-hint">{ALL_TASK_TEMPLATES.length} 个模板可选</Text>
          <Icon name="arrowRight" size={24} color="#becab9" />
        </View>

        {/* ===== 标题+分类卡片（对齐创建页）===== */}
        <View className="edit-card">
          <View className="edit-field">
            <Text className="edit-label-tiny">目标名称</Text>
            <Input
              className="edit-input-large"
              placeholder="如：完成数学作业"
              value={title}
              maxlength={50}
              onInput={(e) => setTitle(e.detail.value)}
            />
          </View>
          <View className="edit-row-between">
            {!showDescInput ? (
              <View className="edit-add-desc-btn" onClick={() => setShowDescInput(true)}>
                <Icon name="plus" size={28} color="#006e1c" />
                <Text>添加描述</Text>
              </View>
            ) : (
              <Text className="edit-label-hint">描述内容</Text>
            )}
            <Picker mode="selector" range={CATEGORIES} value={CATEGORIES.indexOf(type)} onChange={(e) => setType(CATEGORIES[parseInt(String(e.detail.value))])}>
              <View className="edit-category-chip">
                <Text>{type}</Text>
                <Icon name="chevronRight" size={24} color="#becab9" />
              </View>
            </Picker>
          </View>
          {showDescInput && (
            <Textarea
              className="edit-textarea"
              placeholder="添加详细说明..."
              value={description}
              autoHeight
              maxlength={500}
              onInput={(e) => setDescription(e.detail.value)}
            />
          )}
        </View>

        {/* ===== 设置组卡片：重复 + 时段（对齐Web版）===== */}
        <View className="edit-card edit-settings-group">
          {/* 重复开关行 */}
          <View className="edit-setting-row">
            <View className="edit-setting-left">
              <View className={`edit-toggle ${repeatEnabled ? 'on' : ''}`} onClick={() => setRepeatEnabled(!repeatEnabled)}>
                <View className="edit-toggle-dot" />
              </View>
              <Text className="edit-setting-label">重复</Text>
            </View>
            <Picker mode="selector" range={FREQUENCY_OPTIONS.map(o => o.label)} value={FREQUENCY_OPTIONS.findIndex(o => o.value === frequency)} disabled={!repeatEnabled} onChange={(e) => setFrequency(FREQUENCY_OPTIONS[parseInt(String(e.detail.value))].value)}>
              <View className={`edit-setting-right ${!repeatEnabled ? 'disabled' : ''}`}>
                <Text>{repeatEnabled ? FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label : '单次任务'}</Text>
                <Icon name="chevronRight" size={24} color="#becab9" />
              </View>
            </Picker>
          </View>

          <View className="edit-setting-divider" />

          {/* 时段开关行 */}
          <View className="edit-setting-row">
            <View className="edit-setting-left">
              <View className={`edit-toggle ${timeEnabled ? 'on' : ''}`} onClick={() => setTimeEnabled(!timeEnabled)}>
                <View className="edit-toggle-dot" />
              </View>
              <Text className="edit-setting-label">时段</Text>
            </View>
            <View className={`edit-setting-right ${!timeEnabled ? 'disabled' : ''}`}>
              <Text>{timeEnabled ? `${startTime} ~ ${endTime}` : '任意时间'}</Text>
              <Icon name="chevronRight" size={24} color="#becab9" />
            </View>
          </View>
        </View>

        {/* ===== 时段选择器 ===== */}
        {timeEnabled && (
          <View className="edit-card">
            <View className="edit-field">
              <Text className="edit-label">执行时段</Text>
              <View className="edit-time-range">
                <Picker mode="time" value={startTime} onChange={(e) => setStartTime(e.detail.value)}>
                  <View className="edit-time-picker"><Text>{startTime}</Text></View>
                </Picker>
                <Text className="edit-time-sep">~</Text>
                <Picker mode="time" value={endTime} onChange={(e) => setEndTime(e.detail.value)}>
                  <View className="edit-time-picker"><Text>{endTime}</Text></View>
                </Picker>
              </View>
            </View>
            <View className="edit-reminder-row">
              <Text className="edit-reminder-label">提醒</Text>
              <View className={`edit-toggle small ${reminderEnabled ? 'on' : ''}`} onClick={() => setReminderEnabled(!reminderEnabled)}>
                <View className="edit-toggle-dot" />
              </View>
            </View>
            {reminderEnabled && (
              <Picker mode="time" value={reminderTime} onChange={(e) => setReminderTime(e.detail.value)}>
                <View className="edit-picker-row">
                  <Icon name="bell" size={28} color="#006e1c" style={{ marginRight: '8rpx' }} />
                  <Text>{reminderTime} 提醒</Text>
                  <Icon name="chevronRight" size={24} color="#becab9" />
                </View>
              </Picker>
            )}
          </View>
        )}

        {/* ===== 星星奖励 + 成员选择 ===== */}
        <View className="edit-card">
          {/* 星星积分奖励 — Stepper */}
          <View className="edit-field">
            <Text className="edit-label">星星积分奖励</Text>
            <View className="edit-stepper">
              <View className="edit-step-btn" onClick={() => setRewardStars(Math.max(0, rewardStars - 1))}><Text>-</Text></View>
              <View className="edit-step-value">
                <Icon name="star" size={28} color="#F9A825" />
                <Text className="edit-step-num">{rewardStars}</Text>
              </View>
              <View className="edit-step-btn" onClick={() => setRewardStars(rewardStars + 1)}><Text>+</Text></View>
            </View>
          </View>

          <View className="edit-divider" />

          {/* 发布家长 */}
          {parentMembers.length > 0 && (
            <>
              <Text className="edit-label-tiny">发布家长</Text>
              <View className="edit-members-row">
                {parentMembers.map(p => (
                  <View
                    key={p.id}
                    className={`edit-member-wrap ${creatorId === p.id ? 'selected' : ''}`}
                    onClick={() => setCreatorId(p.id)}
                  >
                    <Image className="edit-member-avatar" src={resolveAvatarPath(p.avatar || '')} />
                    <Text className={`edit-member-name-sm ${creatorId === p.id ? 'selected' : ''}`}>{p.name}</Text>
                  </View>
                ))}
              </View>
              <View className="edit-divider" />
            </>
          )}

          {/* 执行的小朋友 */}
          <Text className="edit-label-tiny">执行的小朋友</Text>
          <View className="edit-members-row">
            {(childMembers.length > 0 ? childMembers : members).map(kid => (
              <View
                key={kid.id}
                className={`edit-member-wrap ${assigneeIds.includes(kid.id) ? 'selected' : ''}`}
                onClick={() => toggleAssignee(kid.id)}
              >
                <Image className="edit-member-avatar" src={resolveAvatarPath(kid.avatar || '')} />
                {assigneeIds.includes(kid.id) && (
                  <View className="edit-check-badge"><Icon name="check" size={20} color="#ffffff" /></View>
                )}
                <Text className={`edit-member-name-sm ${assigneeIds.includes(kid.id) ? 'selected' : ''}`}>{kid.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== 习惯模式开关 ===== */}
        <View className="edit-card">
          <View className="edit-setting-row">
            <View className="edit-setting-left">
              <View className={`edit-toggle ${isHabit ? 'on' : ''}`} onClick={() => setIsHabit(!isHabit)}>
                <View className="edit-toggle-dot" />
              </View>
              <Text className="edit-setting-label">习惯打卡模式</Text>
            </View>
          </View>
          {isHabit && (
            <>
              <View className="edit-divider" />
              <View className="edit-field">
                <Text className="edit-label">目标次数</Text>
                <View className="edit-stepper">
                  <View className="edit-step-btn" onClick={() => setTargetCount(Math.max(1, targetCount - 1))}><Text>-</Text></View>
                  <Text className="edit-step-num">{targetCount} 次</Text>
                  <View className="edit-step-btn" onClick={() => setTargetCount(Math.min(30, targetCount + 1))}><Text>+</Text></View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ===== 底部保存按钮 ===== */}
      <View className="edit-save-bar">
        <View className={`edit-save-btn ${saving ? 'disabled' : ''}`} onClick={() => !saving && handleSave()}>
          <Text className="edit-save-btn-text">{saving ? '保存中...' : '保存修改'}</Text>
        </View>
      </View>

      {/* 模板选择器弹窗 */}
      <TaskTemplateSelector
        visible={showTemplates}
        mode="task"
        onSelect={handleTemplateSelect}
        onClose={() => setShowTemplates(false)}
      />
    </View>
  );
}
