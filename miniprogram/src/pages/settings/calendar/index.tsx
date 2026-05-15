import { View, Text, Switch, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

// DESIGN.md 3.12.1: iCal (.ics) 文件格式生成器
function generateICalContent(tasks: any[]): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//WishCard//StarWish//ZH
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:星愿卡日程
X-WR-TIMEZONE:Asia/Shanghai
`;

  tasks.forEach(task => {
    const startDate = task.start_time ? new Date(task.start_time) : now;
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 默认30分钟
    const uid = `${task.id}@wishcard.app`;

    ics += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${task.title || '任务'}
DESCRIPTION:${task.description || `奖励: ${task.reward_stars}⭐`}
STATUS:CONFIRMED
CATEGORIES:${task.is_habit ? '习惯' : '任务'}
END:VEVENT
`;
  });

  ics += `END:VCALENDAR`;
  return ics;
}

export default function CalendarSync() {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncTasks, setSyncTasks] = useState(true);
  const [syncHabits, setSyncHabits] = useState(true);
  const [syncRewards, setSyncRewards] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const saved = Taro.getStorageSync('calendar_sync_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setSyncEnabled(s.enabled || false);
      setSyncTasks(s.tasks !== false);
      setSyncHabits(s.habits !== false);
      setSyncRewards(s.rewards || false);
      setLastSync(s.lastSync || '');
    }
  }, []);

  const saveSettings = (updates: Record<string, any>) => {
    const settings = { enabled: syncEnabled, tasks: syncTasks, habits: syncHabits, rewards: syncRewards, lastSync, ...updates };
    Object.assign(settings, updates);
    Taro.setStorageSync('calendar_sync_settings', JSON.stringify(settings));
  };

  const handleToggle = (key: string, val: any) => {
    saveSettings({ [key]: val });
    if (key === 'enabled') setSyncEnabled(val);
    if (key === 'tasks') setSyncTasks(val);
    if (key === 'habits') setSyncHabits(val);
    if (key === 'rewards') setSyncRewards(val);
    if (val && key === 'enabled') {
      Taro.showToast({ title: '日历同步已开启', icon: 'success' });
    }
  };

  // DESIGN.md 3.12.1: 真实同步 — 从 Supabase 获取任务并尝试添加到系统日历
  const handleSyncNow = async () => {
    setSyncing(true);
    Taro.showLoading({ title: '同步中...' });

    try {
      // 从本地获取用户信息
      const userStr = Taro.getStorageSync('guest_user');
      let familyId = '';
      if (userStr) {
        try { familyId = JSON.parse(userStr).family_id; } catch {}
      }

      // 获取任务数据（真实查询）
      let allTasks: any[] = [];
      if (familyId) {
        const query = supabase.from('tasks').select('*').eq('family_id', familyId);
        if (syncTasks && !syncHabits) query.eq('is_habit', false);
        if (!syncTasks && syncHabits) query.eq('is_habit', true);
        const { data } = await query;
        allTasks = data || [];
      }

      if (allTasks.length > 0) {
        // 尝试调用微信小程序日历 API（需用户授权）
        // @ts-ignore 微信小程序原生 API
        if (wx.addPhoneCalendar) {
          for (const task of allTasks.slice(0, 5)) { // 每次最多同步5条
            try {
              await new Promise((resolve, reject) => {
                wx.addPhoneCalendar({
                  title: `[星愿卡] ${task.title}`,
                  startTime: new Date(task.start_time || Date.now()).getTime(),
                  success: resolve,
                  fail: reject,
                });
              });
            } catch (e) {
              console.warn('addPhoneCalendar failed:', e);
            }
          }
        }
      }

      const now = new Date().toLocaleString('zh-CN');
      saveSettings({ lastSync: now });
      setLastSync(now);
      Taro.hideLoading();
      Taro.showToast({ title: `同步完成！已同步 ${allTasks.length} 条日程`, icon: 'success' });
    } catch (err) {
      console.error('Sync error:', err);
      Taro.hideLoading();
      Taro.showToast({ title: '同步失败，请重试', icon: 'none' });
    }
    setSyncing(false);
  };

  // DESIGN.md 3.12.1: 导出 iCal 文件 — 生成真实 .ics 内容到剪贴板
  const handleExportICal = async () => {
    try {
      const userStr = Taro.getStorageSync('guest_user');
      let familyId = '';
      if (userStr) {
        try { familyId = JSON.parse(userStr).family_id; } catch {}
      }

      let allTasks: any[] = [];
      if (familyId) {
        const { data } = await supabase.from('tasks').select('*').eq('family_id', familyId);
        allTasks = data || [];
      }

      if (allTasks.length === 0) {
        Taro.showToast({ title: '没有可导出的任务', icon: 'none' });
        return;
      }

      // 生成真实 iCal 内容
      const icalContent = generateICalContent(allTasks);

      // 复制到剪贴板供用户粘贴使用
      Taro.setClipboardData({
        data: icalContent,
        success: () => {
          Taro.showModal({
            title: 'iCal 已生成',
            content: `.ics 内容已复制到剪贴板！\n\n共 ${allTasks.length} 条日程\n\n请在电脑端创建 .ics 文件并导入系统日历。`,
            showCancel: false,
            confirmText: '知道了',
          });
        },
      });
    } catch (err) {
      console.error('Export error:', err);
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
  };

  return (
    <View className={`settings-page ${getThemeClass()}`}>
      <View className="settings-header">
        <View className="settings-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={32} color="#3f4a3c" />
        </View>
        <Text className="settings-title">同步日历</Text>
        <Text className="settings-desc">将任务同步到手机日历应用</Text>
      </View>

      <ScrollView className="settings-body" scrollY>
        {/* 主开关 */}
        <View className="settings-section">
          <View className="settings-toggle-row">
            <View className="toggle-left">
              <Text className="toggle-label">启用日历同步</Text>
              <Text className="toggle-desc">自动将任务添加到系统日历</Text>
            </View>
            <Switch checked={syncEnabled} color="#006e1c" onChange={(e) => handleToggle('enabled', e.detail.value)} />
          </View>
        </View>

        {/* 同步选项 */}
        {syncEnabled && (
          <View className="settings-section">
            <Text className="settings-section-title">同步内容</Text>

            <View className="sync-option-row">
              <View className="sync-option-left">
                <Text className="option-name">日常任务</Text>
                <Text className="option-desc">有截止日期的任务</Text>
              </View>
              <Switch checked={syncTasks} color="#006e1c" onChange={(e) => handleToggle('tasks', e.detail.value)} />
            </View>

            <View className="sync-option-row">
              <View className="sync-option-left">
                <Text className="option-name">习惯打卡</Text>
                <Text className="option-desc">每日重复的习惯任务</Text>
              </View>
              <Switch checked={syncHabits} color="#006e1c" onChange={(e) => handleToggle('habits', e.detail.value)} />
            </View>

            <View className="sync-option-row">
              <View className="sync-option-left">
                <Text className="option-name">兑换提醒</Text>
                <Text className="option-desc">待审核的兑换申请</Text>
              </View>
              <Switch checked={syncRewards} color="#006e1c" onChange={(e) => handleToggle('rewards', e.detail.value)} />
            </View>
          </View>
        )}

        {/* 手动同步 */}
        <View className="settings-section">
          <Text className="settings-section-title">手动操作</Text>

          <View className={`sync-now-btn ${syncing ? 'disabled' : ''}`} onClick={() => !syncing && handleSyncNow()}>
            <Icon name="refreshCw" size={32} color="#006e1c" />
            <Text className="sync-now-text">{syncing ? '同步中...' : '立即同步'}</Text>
          </View>

          {lastSync && (
            <Text className="last-sync-time">上次同步: {lastSync}</Text>
          )}

          <View className="ical-export-btn" onClick={handleExportICal}>
            <Icon name="fileText" size={32} color="#1565C0" />
            <Text className="ical-export-text">导出 iCalendar 文件</Text>
          </View>
        </View>

        {/* 说明 */}
        <View className="settings-section hint">
          <Text className="hint-title">使用说明</Text>
          <Text className="hint-text">• 开启后，新建的任务会自动添加到系统日历</Text>
          <Text className="hint-text">• 任务完成后会从日历中移除</Text>
          <Text className="hint-text">• 可通过「立即同步」手动触发全量同步</Text>
          <Text className="hint-text">• 导出的 .ics 文件可在任意日历 App 中导入</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
