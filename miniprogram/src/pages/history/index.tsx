import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser } from '@/utils/localUser';
import { getGuestData, isGuestMode } from '@/lib/guestData';
import { normalizeStarHistoryRecords, type StarHistoryRecord } from '@/lib/starHistory';
import Icon from '@/components/Icon';
import './index.scss';

const GUEST_STAR_HISTORY_KEY = 'wishcard_guest_star_history';

export default function History() {
  const [records, setRecords] = useState<StarHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [starBalance, setStarBalance] = useState(0);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const user = getLocalUser();
      if (!user) {
        setRecords([]);
        setStarBalance(0);
        return;
      }

      if (isGuestMode() || user.family_id === 'guest-family' || user.family_id === 'demo-family') {
        const stored = Taro.getStorageSync(GUEST_STAR_HISTORY_KEY);
        const storedRecords = typeof stored === 'string' ? JSON.parse(stored || '[]') : (stored || []);
        const demoRecords = getGuestData().history.filter((item: any) => item.user_id === user.id || item.userId === user.id);
        setRecords(normalizeStarHistoryRecords([...storedRecords, ...demoRecords]));
        setStarBalance(user.stars || 0);
        return;
      }

      if (user?.family_id && user.family_id !== 'guest-family' && user.family_id !== 'demo-family') {
        // 查询星星交易记录
        const { data: transactions } = await supabase
          .from('star_transactions')
          .select('*')
          .eq('family_id', user.family_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (transactions) {
          setRecords(normalizeStarHistoryRecords(transactions.map((t: any) => ({
            id: t.id,
            amount: t.amount || 0,
            reason: t.reason || (t.amount > 0 ? '获得奖励' : '兑换消费'),
            created_at: t.created_at,
            type: t.amount > 0 ? 'earn' : 'spend',
          }))));
        }

        // 查询当前余额
        const { data: member } = await supabase
          .from('members')
          .select('stars')
          .eq('id', user.id)
          .single();

        setStarBalance(member?.stars || 0);
      }
    } catch (err) {
      console.error('[History] fetch error:', err);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // 按日期分组
  const groupedRecords = records.reduce((groups, record) => {
    const date = record.created_at ? record.created_at.split('T')[0] : '未知日期';
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {} as Record<string, StarHistoryRecord[]>);

  // 图标映射（对齐Web端不同类型显示不同图标）
  const getRecordIcon = (type: string, amount: number) => {
    if (amount > 0) {
      if (amount >= 10) return 'gift';       // 大额→礼物
      return 'trendingUp';                    // 小额→上升
    }
    if (amount <= -10) return 'shoppingCart'; // 大额消费
    return 'trendingDown';                   // 小额扣减
  };

  return (
    <View className="history-page">
      {/* Header — 对齐Web: 返回 + "星星足迹" */}
      <View className="history-header">
        <View className="history-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={36} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="history-title">星星足迹</Text>
        <View style={{ width: '60rpx' }} />
      </View>

      {/* 余额卡 — 对齐Web: 渐变背景(primary-container) + Star图标 + 超大字号 */}
      <View className="history-balance-card">
        <View className="balance-bg-decoration">
          <Icon name="sparkles" size={60} color="rgba(249,168,37,0.15)" />
        </View>
        <Icon name="star" size={56} color="#F9A825" />
        <Text className="balance-num">{starBalance}</Text>
        <Text className="balance-label">当前余额</Text>
      </View>

      {loading ? (
        <View className="history-loading">
          <Icon name="loader-2" size={56} color="#006e1c" className="spin" />
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : records.length === 0 ? (
        /* Empty State — 对齐Web: Trophy图标 + "还没有星星记录哦" */
        <View className="history-empty">
          <Icon name="trophy" size={100} color="#becab9" />
          <Text className="empty-title">还没有星星记录</Text>
          <Text className="empty-desc">完成任务和习惯就能获得星星啦！</Text>
          <View className="empty-btn" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Text>去赚星星</Text>
          </View>
        </View>
      ) : (
        /* 变更记录列表 — 对齐Web: 图标(正/负不同色)+标题+时间+变化数值 */
        <ScrollView scrollY enhanced className="history-list">
          {Object.entries(groupedRecords).map(([date, items]) => (
            <View key={date} className={`history-date-group ${loading ? 'fade-in' : ''}`}>
              <Text className="history-date-label">{date}</Text>
              {items.map(record => (
                <View key={record.id} className={`history-record ${record.type}`} /* 入场动画 */>
                  <View className={`record-icon-wrap ${record.type}`}>
                    <Icon
                      name={getRecordIcon(record.type, record.amount) as any}
                      size={28}
                      color={record.type === 'earn' ? '#4CAF50' : '#E57373'}
                    />
                  </View>
                  <View className="record-info">
                    <Text className="record-reason">{record.reason}</Text>
                    <Text className="record-time">{formatDate(record.created_at)}</Text>
                  </View>
                  <Text className={`record-amount ${record.type}`}>
                    {record.type === 'earn' ? '+' : ''}{record.amount}
                    <Text className="record-star-suffix"> ⭐</Text>
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
