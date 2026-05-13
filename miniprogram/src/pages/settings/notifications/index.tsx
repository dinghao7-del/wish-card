import { View, Text, Switch, ScrollView, Picker } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

export default function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [taskRemind, setTaskRemind] = useState(true);
  const [habitRemind, setHabitRemind] = useState(true);
  const [exchangeNotify, setExchangeNotify] = useState(true);
  const [starChange, setStarChange] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [quietEnabled, setQuietEnabled] = useState(true);

  const toggle = (setter: Function) => (e: any) => {
    setter(e.detail.value);
    Taro.showToast({ title: e.detail.value ? '已开启' : '已关闭', icon: 'none' });
  };

  return (
    <View className="settings-page">
      <View className="settings-header">
        <Text className="settings-title">通知设置</Text>
        <Text className="settings-desc">管理推送通知偏好</Text>
      </View>

      <ScrollView className="settings-body" scrollY>
        {/* 主开关 */}
        <View className="settings-section">
          <View className="settings-toggle-row">
            <View className="toggle-left">
              <Text className="toggle-label">接收推送通知</Text>
              <Text className="toggle-desc">关闭后将不会收到任何通知</Text>
            </View>
            <Switch checked={pushEnabled} color="#006e1c" onChange={toggle(setPushEnabled)} />
          </View>
        </View>

        {/* 通知类型 */}
        {pushEnabled && (
          <View className="settings-section">
            <Text className="settings-section-title">通知类型</Text>

            <View className="notif-option-row">
              <View className="notif-left">
                <Icon name="checkSquare" size={32} color="#006e1c" />
                <View className="notif-info">
                  <Text className="notif-name">任务提醒</Text>
                  <Text className="notif-desc">任务截止前30分钟提醒</Text>
                </View>
              </View>
              <Switch checked={taskRemind} color="#006e1c" onChange={toggle(setTaskRemind)} />
            </View>

            <View className="notif-option-row">
              <View className="notif-left">
                <Icon name="repeat" size={32} color="#F9A825" />
                <View className="notif-info">
                  <Text className="notif-name">习惯打卡提醒</Text>
                  <Text className="notif-desc">每日固定时间提醒打卡</Text>
                </View>
              </View>
              <Switch checked={habitRemind} color="#006e1c" onChange={toggle(setHabitRemind)} />
            </View>

            <View className="notif-option-row">
              <View className="notif-left">
                <Icon name="gift" size={32} color="#f0e269" />
                <View className="notif-info">
                  <Text className="notif-name">兑换通知</Text>
                  <Text className="notif-desc">孩子提交兑换申请时通知家长</Text>
                </View>
              </View>
              <Switch checked={exchangeNotify} color="#006e1c" onChange={toggle(setExchangeNotify)} />
            </View>

            <View className="notif-option-row">
              <View className="notif-left">
                <Icon name="star" size={32} color="#f0e269" />
                <View className="notif-info">
                  <Text className="notif-name">星星变动</Text>
                  <Text className="notif-desc">获得或消耗星星时通知</Text>
                </View>
              </View>
              <Switch checked={starChange} color="#006e1c" onChange={toggle(setStarChange)} />
            </View>
          </View>
        )}

        {/* 免打扰 */}
        <View className="settings-section">
          <Text className="settings-section-title">免打扰时间</Text>
          <View className="settings-toggle-row">
            <View className="toggle-left">
              <Text className="toggle-label-sm">启用免打扰</Text>
            </View>
            <Switch checked={quietEnabled} color="#006e1c" onChange={toggle(setQuietEnabled)} />
          </View>
          {quietEnabled && (
            <View className="time-picker-row">
              <View className="time-picker-item">
                <Text className="time-label">开始</Text>
                <Picker mode="time" value={quietStart} onChange={(e) => setQuietStart(e.detail.value)}>
                  <View className="time-value">{quietStart}</View>
                </Picker>
              </View>
              <Text className="time-sep">—</Text>
              <View className="time-picker-item">
                <Text className="time-label">结束</Text>
                <Picker mode="time" value={quietEnd} onChange={(e) => setQuietEnd(e.detail.value)}>
                  <View className="time-value">{quietEnd}</View>
                </Picker>
              </View>
            </View>
          )}
        </View>

        {/* 说明 */}
        <View className="settings-section hint">
          <Text className="hint-text">• 微信小程序的通知权限需要在微信设置中手动开启</Text>
          <Text className="hint-text">• 免打扰时间内仅接收紧急通知（如安全相关）</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
