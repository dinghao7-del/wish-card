import { View, Text, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import './index.scss';

export default function Home() {
  const [user, setUser] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [starBalance, setStarBalance] = useState(0);

  useEffect(() => {
    fetchUserData();
    fetchTodayTasks();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUser(data);
      setStarBalance(data?.stars || 0);
    }
  };

  const fetchTodayTasks = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_ids', user?.id)
      .gte('start_time', today)
      .lt('start_time', today + 'T23:59:59')
      .eq('status', 'pending');
    
    setTodayTasks(data || []);
  };

  return (
    <View className="home-page">
      {/* 顶部栏 */}
      <View className="header">
        <View className="user-info">
          <Image className="avatar" src={user?.avatar} />
          <Text className="user-name">{user?.name}</Text>
        </View>
        <View className="notification-icon">
          <Text>🔔</Text>
        </View>
      </View>

      {/* 今日概览卡片 */}
      <View className="overview-card">
        <Text className="star-balance">★ {starBalance}</Text>
        <Text className="star-label">当前星星余额</Text>
        
        <View className="quick-actions">
          <View className="action-item">
            <Text className="action-icon">📝</Text>
            <Text className="action-text">发布任务</Text>
          </View>
          <View className="action-item">
            <Text className="action-icon">📅</Text>
            <Text className="action-text">查看日历</Text>
          </View>
          <View className="action-item">
            <Text className="action-icon">🎁</Text>
            <Text className="action-text">兑换奖励</Text>
          </View>
        </View>
      </View>

      {/* 今日任务列表 */}
      <View className="section">
        <View className="section-header">
          <Text className="section-title">今日任务</Text>
          <View className="task-count-badge">
            <Text>{todayTasks.length}</Text>
          </View>
        </View>
        
        {todayTasks.length > 0 ? (
          todayTasks.map(task => (
            <View key={task.id} className="task-card">
              <View className="task-color-bar" style={{ backgroundColor: '#4CAF50' }} />
              <View className="task-content">
                <Text className="task-title">{task.title}</Text>
                <Text className="task-time">{new Date(task.start_time).toLocaleTimeString()}</Text>
              </View>
              <Text className="task-stars">★ {task.reward_stars}</Text>
            </View>
          ))
        ) : (
          <View className="empty-state">
            <Text>今天没有任务 🎉</Text>
          </View>
        )}
      </View>

      {/* 家庭排行榜 */}
      <View className="section">
        <Text className="section-title">家庭排行榜</Text>
        <View className="ranking-list">
          {/* 排行数据将通过API获取 */}
        </View>
      </View>
    </View>
  );
}
