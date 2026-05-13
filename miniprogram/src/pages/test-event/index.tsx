/**
 * 事件诊断 v2 — 渐进式排查
 * 逐个加入业务组件，找出事件破坏者
 */
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { useState } from 'react';

export default function TestEventV2() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log('[TestV2]', msg);
    setLog(prev => [...prev.slice(-12), `${new Date().toLocaleTimeString()}: ${msg}`]);
    Taro.vibrateShort({ type: 'light' });
  };

  return (
    <ScrollView scrollY style={{ height: '100vh', padding: '20rpx', backgroundColor: '#fbf9f5' }}>
      <Text style={{ fontSize: '36rpx', fontWeight: 'bold', marginBottom: '20rpx', display: 'block' }}>
        渐进式事件诊断 v2
      </Text>

      {/* ===== 测试组 A: 基础（已确认正常） ===== */}
      <View style={{ background: '#E8F5E9', padding: '16rpx', borderRadius: '12rpx', marginBottom: '20rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 'bold', display: 'block', marginBottom: '10rpx' }}>A: ScrollView内基础点击</Text>
        <View
          onClick={() => addLog('A1-ScrollView内View+onClick')}
          style={{ background: '#4CAF50', color: 'white', padding: '20rpx', borderRadius: '8rpx', textAlign: 'center', margin: '8rpx 0' }}
        >
          <Text style={{ color: 'white' }}>A1 View+onClick(ScrollView内)</Text>
        </View>
        <Button onClick={() => addLog('A2-ScrollView内Button')} type='primary' size='mini'>
          A2 Button+onClick(ScrollView内)
        </Button>
      </View>

      {/* ===== 测试组 B: Icon 组件 ===== */}
      <View style={{ background: '#E3F2FD', padding: '16rpx', borderRadius: '12rpx', marginBottom: '20rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 'bold', display: 'block', marginBottom: '10rpx' }}>B: Icon组件包裹</Text>
        <View
          onClick={() => addLog('B1-含Icon的View')}
          style={{ background: '#2196F3', color: 'white', padding: '24rpx', borderRadius: '8rpx', display: 'flex', alignItems: 'center', gap: '12rpx' }}
        >
          <Icon name="star" size={32} color="#FFD54F" />
          <Text style={{ color: 'white' }}>B1 含Icon的View</Text>
        </View>

        {/* 纯 Icon 点击 */}
        <View onClick={() => addLog('B2-纯Icon外层View')} style={{ display: 'inline-block', marginTop: '12rpx', padding: '16rpx', background: '#fff3e0', borderRadius: '50%' }}>
          <Icon name="settings" size={48} color="#006e1c" />
        </View>
        <Text style={{ fontSize: '24rpx', marginLeft: '10rpx' }}>B2 纯Icon(点我)</Text>
      </View>

      {/* ===== 测试组 C: 模拟首页结构 ===== */}
      <View style={{ background: '#FFF3E0', padding: '16rpx', borderRadius: '12rpx', marginBottom: '20rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 'bold', display: 'block', marginBottom: '10rpx' }}>C: 模拟首页Header</Text>
        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            onClick={() => addLog('C1-头像区域')}
            style={{ width: '80rpx', height: '80rpx', borderRadius: '50%', background: '#c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text>头</Text>
          </View>
          <View
            onClick={() => addLog('C2-星星胶囊')}
            style={{ background: '#fff8e1', padding: '12rpx 24rpx', borderRadius: '99rpx', display: 'flex', alignItems: 'center', gap: '8rpx' }}
          >
            <Icon name="star" size={28} color="#686000" />
            <Text>C2 星星</Text>
          </View>
          <View
            onClick={() => addLog('C3-设置按钮')}
            style={{ padding: '12rpx' }}
          >
            <Icon name="settings" size={40} color="#006e1c" />
          </View>
        </View>
      </View>

      {/* ===== 测试组 D: 模拟快捷操作网格 ===== */}
      <View style={{ background: '#FCE4EC', padding: '16rpx', borderRadius: '12rpx', marginBottom: '20rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 'bold', display: 'block', marginBottom: '10rpx' }}>D: 快捷操作网格</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', gap: '16rpx' }}>
          {['创建任务', '日历', 'AI推荐', '计划', '番茄钟'].map((label, i) => (
            <View
              key={i}
              onClick={() => addLog(`D${i + 1}-${label}`)}
              style={{
                width: '120rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8rpx',
                padding: '16rpx', background: i === 2 ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e8f5e9',
                borderRadius: '16rpx',
              }}
            >
              <View style={{ width: '72rpx', height: '72rpx', borderRadius: '50%', background: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={['plusCircle', 'calendar', 'sparkles', 'grid', 'clock'][i]} size={32} color="white" />
              </View>
              <Text style={{ fontSize: '22rpx' }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 测试组 E: stopPropagation ===== */}
      <View style={{ background: '#F3E5F5', padding: '16rpx', borderRadius: '12rpx', marginBottom: '40rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 'bold', display: 'block', marginBottom: '10rpx' }}>E: stopPropagation测试</Text>
        <View
          onClick={() => addLog('E0-外层View')}
          style={{ background: '#ce93d8', padding: '30rpx', borderRadius: '8rpx' }}
        >
          <Text style={{ color: 'white', display: 'block', marginBottom: '10rpx' }}>外层（点我应该触发E0）</Text>
          <View
            onClick={(e) => { e?.stopPropagation(); addLog('E1-内层stopPropagation'); }}
            style={{ background: '#ab47bc', padding: '20rpx', borderRadius: '8rpx', display: 'inline-block' }}
          >
            <Text style={{ color: 'white' }}>内层stopProp</Text>
          </View>
        </View>
      </View>

      {/* 日志区 */}
      <View style={{ background: '#f5f5f5', padding: '20rpx', borderRadius: '12rpx', minHeight: '300rpx', marginBottom: '40rpx' }}>
        <Text style={{ fontSize: '28rpx', color: '#666', display: 'block', marginBottom: '10rpx' }}>
          事件日志（共{log.length}条）：
        </Text>
        {log.length === 0 ? (
          <Text style={{ color: '#999', fontSize: '28rpx' }}>点击上方各组按钮测试...</Text>
        ) : (
          log.map((l, i) => (
            <Text key={i} style={{ display: 'block', fontSize: '24rpx', color: '#333', margin: '4rpx 0', fontFamily: 'monospace' }}>
              {l}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}
