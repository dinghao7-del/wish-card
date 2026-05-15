import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

export default function DataBackup() {
  const [user, setUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);

  useEffect(() => { loadUserInfo(); }, []);

  const loadUserInfo = async () => {
    try {
      const stored = Taro.getStorageSync('guest_user');
      if (stored) { setUser(JSON.parse(stored)); return; }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase.from('members').select('*').eq('id', authUser.id).single();
        if (data) { setUser(data); setFamilyId(data.family_id || ''); }
      }
    } catch {}
  };

  const exportData = async () => {
    // ⚠️ 关键：没有有效 family_id 时禁止导出（避免查询空参数返回无意义数据）
    if (!familyId || familyId === 'guest-family' || familyId === 'demo-family') {
      Taro.showToast({ title: '请先登录家庭账户', icon: 'none' });
      return;
    }

    setExporting(true);
    Taro.showLoading({ title: '导出中...' });

    try {
      // 并行查询所有相关表数据
      const [tasksRes, rewardsRes, exchangesRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', familyId),
        supabase.from('rewards').select('*').eq('family_id', familyId),
        supabase.from('exchanges').select('*'),
        supabase.from('members').select('*').eq('family_id', familyId),
      ]);

      const data = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        familyId,
        tasks: tasksRes.data || [],
        rewards: rewardsRes.data || [],
        exchanges: exchangesRes.data || [],
        members: membersRes.data || [],
      };

      setBackupData(data);

      // 写入本地存储作为备份
      Taro.setStorageSync('wishcard_backup', JSON.stringify(data));
      setLastBackupTime(new Date().toLocaleString('zh-CN'));

      Taro.hideLoading();
      Taro.showToast({
        title: `导出成功！\n任务:${data.tasks.length}\n心愿:${data.rewards.length}\n记录:${data.exchanges.length}`,
        icon: 'success',
        duration: 3000,
      });
    } catch (e) {
      Taro.hideLoading();
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
    setExporting(false);
  };

  const importData = () => {
    Taro.showModal({
      title: '导入数据',
      content: '将从本地备份数据恢复，当前数据可能被覆盖，是否继续？',
      confirmText: '导入',
      success: async (res) => {
        if (!res.confirm) return;

        setImporting(true);
        Taro.showLoading({ title: '导入中...' });

        try {
          const backupStr = Taro.getStorageSync('wishcard_backup');
          if (!backupStr) throw new Error('无备份数据');

          const data = JSON.parse(backupStr);

          let imported = 0;
          // 导入任务
          for (const task of data.tasks || []) {
            const { error } = await supabase.from('tasks').upsert(task, { onConflict: 'id' });
            if (!error) imported++;
          }
          // 导入心愿
          for (const reward of data.rewards || []) {
            await supabase.from('rewards').upsert(reward, { onConflict: 'id' });
          }
          // 导入兑换记录
          for (const ex of data.exchanges || []) {
            await supabase.from('exchanges').upsert(ex, { onConflict: 'id' });
          }
          // 导入成员
          for (const member of data.members || []) {
            await supabase.from('members').upsert(member, { onConflict: 'id' });
          }

          Taro.hideLoading();
          Taro.showToast({ title: `导入成功！${imported}条数据`, icon: 'success', duration: 2000 });
          setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 1500);
        } catch (e: any) {
          Taro.hideLoading();
          Taro.showToast({ title: e.message || '导入失败', icon: 'none' });
        }
        setImporting(false);
      },
    });
  };

  const clearLocalBackup = () => {
    Taro.showModal({
      title: '清除备份',
      content: '确定要清除本地备份数据吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('wishcard_backup');
          setBackupData(null);
          setLastBackupTime('');
          Taro.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  };

  const stats = backupData
    ? `任务 ${backupData.tasks?.length || 0} · 心愿 ${backupData.rewards?.length || 0} · 记录 ${backupData.exchanges?.length || 0}`
    : '';

  return (
    <View className={`settings-page ${getThemeClass()}`}>
      <View className="settings-header">
        <View className="settings-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={32} color="#3f4a3c" />
        </View>
        <Text className="settings-title">数据备份与还原</Text>
        <Text className="settings-desc">导出或导入家庭任务数据</Text>
      </View>

      <ScrollView className="settings-body" scrollY>
        {/* 备份信息 */}
        <View className="settings-section">
          <Text className="settings-section-title">备份信息</Text>
          {lastBackupTime ? (
            <>
              <View className="backup-info-row">
                <Text className="info-label">最近备份时间</Text>
                <Text className="info-value">{lastBackupTime}</Text>
              </View>
              <View className="backup-info-row">
                <Text className="info-label">备份数据量</Text>
                <Text className="info-value">{stats}</Text>
              </View>
            </>
          ) : (
            <View className="empty-backup">
              <Icon name="cloud-off" size={64} color="#becab9" />
              <Text className="empty-text">暂无本地备份</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View className="settings-section">
          <Text className="settings-section-title">操作</Text>

          <View className={`backup-action-btn primary ${exporting ? 'disabled' : ''}`} onClick={() => !exporting && exportData()}>
            <Icon name="download" size={36} color="#ffffff" />
            <View className="action-info">
              <Text className="action-title">{exporting ? '导出中...' : '导出数据'}</Text>
              <Text className="action-desc">将所有家庭数据保存到本地存储</Text>
            </View>
          </View>

          <View className={`backup-action-btn warning ${importing ? 'disabled' : ''}`} onClick={() => !importing && importData()}>
            <Icon name="upload" size={36} color="#F9A825" />
            <View className="action-info">
              <Text className="action-title">{importing ? '导入中...' : '导入数据'}</Text>
              <Text className="action-desc">从本地备份恢复数据</Text>
            </View>
          </View>

          {backupData && (
            <View className="backup-action-btn danger-soft" onClick={clearLocalBackup}>
              <Icon name="trash" size={36} color="#e53935" />
              <View className="action-info">
                <Text className="action-title danger-text">清除本地备份</Text>
                <Text className="action-desc">释放存储空间</Text>
              </View>
            </View>
          )}
        </View>

        {/* 说明 */}
        <View className="settings-section hint">
          <Text className="hint-title">说明</Text>
          <Text className="hint-text">• 导出的数据保存在小程序本地存储中</Text>
          <Text className="hint-text">• 导入会覆盖当前数据库中的对应数据</Text>
          <Text className="hint-text">• 建议定期导出以防数据丢失</Text>
          <Text className="hint-text">• 清除小程序缓存会导致本地备份丢失</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
