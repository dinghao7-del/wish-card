import { View, Text, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import './index.scss';

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [categories, setCategories] = useState(['全部', '娱乐', '零食', '特权']);
  const [activeCategory, setActiveCategory] = useState(0);
  const [starBalance, setStarBalance] = useState(0);

  useEffect(() => {
    fetchRewards();
    fetchStarBalance();
  }, [activeCategory]);

  const fetchRewards = async () => {
    let query = supabase
      .from('rewards')
      .select('*');
    
    if (activeCategory > 0) {
      query = query.eq('category', categories[activeCategory].toLowerCase());
    }
    
    const { data } = await query;
    setRewards(data || []);
  };

  const fetchStarBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('members')
        .select('stars')
        .eq('id', user.id)
        .single();
      
      setStarBalance(data?.stars || 0);
    }
  };

  const exchangeReward = async (reward) => {
    if (starBalance < reward.cost) {
      Taro.showToast({
        title: '星星余额不足',
        icon: 'none',
      });
      return;
    }

    Taro.showModal({
      title: '确认兑换',
      content: `确定要使用 ${reward.cost} 颗星星兑换「${reward.name}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 创建兑换记录
          await supabase
            .from('exchanges')
            .insert({
              reward_id: reward.id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              star_cost: reward.cost,
              status: 'pending',
            });

          // 更新用户星星余额
          await supabase.rpc('decrement_stars', {
            user_id: (await supabase.auth.getUser()).data.user?.id,
            stars: reward.cost,
          });

          Taro.showToast({
            title: '兑换成功！',
            icon: 'success',
          });

          fetchStarBalance();
        }
      },
    });
  };

  return (
    <View className="rewards-page">
      <View className="header">
        <Text className="page-title">奖励商店</Text>
        <View className="star-balance">
          <Text>★ {starBalance}</Text>
        </View>
      </View>

      {/* 分类Tab */}
      <View className="category-tabs">
        {categories.map((category, index) => (
          <View
            key={index}
            className={`category-tab ${activeCategory === index ? 'active' : ''}`}
            onClick={() => setActiveCategory(index)}
          >
            <Text>{category}</Text>
          </View>
        ))}
      </View>

      {/* 奖励网格 */}
      <View className="rewards-grid">
        {rewards.length > 0 ? (
          rewards.map(reward => (
            <View key={reward.id} className="reward-card">
              <Image className="reward-image" src={reward.image} />
              <View className="reward-cost-badge">
                <Text>★ {reward.cost}</Text>
              </View>
              <Text className="reward-name">{reward.name}</Text>
              <Text className="reward-desc">{reward.description}</Text>
              <View className="exchange-button" onClick={() => exchangeReward(reward)}>
                <Text>兑换</Text>
              </View>
            </View>
          ))
        ) : (
          <View className="empty-state">
            <Text>暂无奖励</Text>
          </View>
        )}
      </View>
    </View>
  );
}
