import { View, Text, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import './index.scss';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchFamilyMembers();
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
    }
  };

  const fetchFamilyMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('members')
        .select('family_id')
        .eq('id', user.id)
        .single();
      
      if (userData?.family_id) {
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('family_id', userData.family_id);
        
        setMembers(data || []);
      }
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          await supabase.auth.signOut();
          Taro.redirectTo({ url: '/pages/login/index' });
        }
      },
    });
  };

  return (
    <View className="profile-page">
      <View className="header">
        <Text className="page-title">Forest Family</Text>
        <View className="notification-icon">
          <Text>🔔</Text>
        </View>
      </View>

      {/* 用户信息 */}
      <View className="user-card">
        <Image className="user-avatar" src={user?.avatar} />
        <View className="user-info">
          <Text className="user-name">{user?.name}</Text>
          {user?.role === 'parent' && (
            <View className="admin-badge">
              <Text>管理员</Text>
            </View>
          )}
        </View>
      </View>

      {/* 家庭成员 */}
      <View className="members-section">
        <Text className="section-title">家庭成员</Text>
        <View className="members-list">
          {members.map(member => (
            <View key={member.id} className="member-item">
              <Image className="member-avatar" src={member.avatar} />
              <Text className="member-name">{member.name}</Text>
              <Text className="member-stars">★ {member.stars}</Text>
            </View>
          ))}
          <View className="member-item add-member">
            <Text>+</Text>
          </View>
        </View>
      </View>

      {/* 功能菜单 */}
      <View className="menu-section">
        <View className="menu-item">
          <Text className="menu-icon">🎤</Text>
          <Text className="menu-text">语音助手</Text>
          <Text className="menu-arrow">></Text>
        </View>
        
        <View className="menu-item">
          <Text className="menu-icon">🔔</Text>
          <Text className="menu-text">消息通知</Text>
          <Switch
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.detail.value)}
          />
        </View>
        
        <View className="menu-item">
          <Text className="menu-icon">🌙</Text>
          <Text className="menu-text">深色模式</Text>
          <Switch
            checked={darkModeEnabled}
            onChange={(e) => setDarkModeEnabled(e.detail.value)}
          />
        </View>
        
        <View className="menu-item">
          <Text className="menu-icon">🛡</Text>
          <Text className="menu-text">账号安全</Text>
          <Text className="menu-arrow">></Text>
        </View>
      </View>

      {/* 退出登录 */}
      <View className="logout-button" onClick={handleLogout}>
        <Text>退出登录</Text>
      </View>
    </View>
  );
}
