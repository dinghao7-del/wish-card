import { View, Text, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import './index.scss';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchTasks();
  }, [filter]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', user.id)
        .single();
      setUser(data);
    }
  };

  const fetchTasks = async () => {
    let query = supabase
      .from('tasks')
      .select('*');
    
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('start_time', today).lt('start_time', today + 'T23:59:59');
    } else if (filter === 'week') {
      const today = new Date();
      const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      query = query.gte('start_time', today.toISOString()).lte('start_time', weekLater.toISOString());
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }
    
    const { data } = await query.order('start_time', { ascending: true });
    setTasks(data || []);
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
    
    fetchTasks();
  };

  return (
    <View className="tasks-page">
      <View className="header">
        <Text className="page-title">所有任务</Text>
        <View className="add-button">
          <Text>+</Text>
        </View>
      </View>

      {/* 筛选Tab */}
      <View className="filter-tabs">
        {['全部', '今日', '本周', '已完成'].map((tab, index) => (
          <View
            key={index}
            className={`filter-tab ${filter === ['all', 'today', 'week', 'completed'][index] ? 'active' : ''}`}
            onClick={() => setFilter(['all', 'today', 'week', 'completed'][index])}
          >
            <Text>{tab}</Text>
          </View>
        ))}
      </View>

      {/* 任务列表 */}
      <View className="task-list">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <View key={task.id} className="task-card">
              <View className="task-icon">
                <Text>{task.icon || '📝'}</Text>
              </View>
              <View className="task-content">
                <Text className="task-title">{task.title}</Text>
                <Text className="task-time">
                  {new Date(task.start_time).toLocaleDateString()} {new Date(task.start_time).toLocaleTimeString()}
                </Text>
              </View>
              <Text className="task-stars">★ {task.reward_stars}</Text>
              <View
                className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                onClick={() => toggleTaskStatus(task.id, task.status)}
              >
                {task.status === 'completed' && <Text>✓</Text>}
              </View>
            </View>
          ))
        ) : (
          <View className="empty-state">
            <Text>暂无任务</Text>
          </View>
        )}
      </View>
    </View>
  );
}
