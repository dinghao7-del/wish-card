import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import './index.scss';

export default function CheckIn() {
  const [taskId, setTaskId] = useState(null);
  const [task, setTask] = useState(null);
  const [checkInType, setCheckInType] = useState('photo');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    if (!taskId) {
      Taro.showToast({
        title: '请先选择任务',
        icon: 'none',
      });
      return;
    }

    setLoading(true);
    
    try {
      // 创建打卡记录
      await supabase
        .from('check_ins')
        .insert({
          task_id: taskId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          type: checkInType,
          content: content,
          stars_earned: task?.reward_stars || 0,
        });

      // 更新用户星星余额
      await supabase.rpc('increment_stars', {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        stars: task?.reward_stars || 0,
      });

      Taro.showToast({
        title: '打卡成功！',
        icon: 'success',
      });

      // 返回上一页
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      Taro.showToast({
        title: '打卡失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="check-in-page">
      <View className="header">
        <Text className="page-title">确认打卡</Text>
      </View>

      {/* 任务信息卡片 */}
      {task && (
        <View className="task-card">
          <View className="task-icon">
            <Text>{task.icon || '📝'}</Text>
          </View>
          <View className="task-content">
            <Text className="task-title">{task.title}</Text>
            <Text className="task-time">
              {new Date(task.start_time).toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}

      {/* 打卡按钮 */}
      <View className="check-in-button" onClick={handleCheckIn}>
        <Text className="check-icon">✓</Text>
      </View>

      <Text className="reward-text">
        ★ 打卡后将获得 {task?.reward_stars || 0} 颗星星
      </Text>

      <Text className="motivation-text">
        太棒了！今天也要加油哦 🌲
      </Text>
    </View>
  );
}
