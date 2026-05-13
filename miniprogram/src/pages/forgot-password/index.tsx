import { View, Text, Input } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import './index.scss';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'input' | 'sending' | 'sent'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email.trim()) { setError('请输入注册邮箱'); return; }
    if (!email.includes('@')) { setError('邮箱格式不正确'); return; }

    setLoading(true);
    setStep('sending');
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: '/pages/login/index?reset=true',
      });

      if (error) throw error;

      setStep('sent');
    } catch (e: any) {
      setError(e.message || '发送失败，请检查邮箱是否正确');
      setStep('input');
    }
    setLoading(false);
  };

  return (
    <View className="forgot-page">
      <View className="forgot-card">
        {step === 'input' && (
          <>
            <View className="forgot-icon-wrap">
              <Icon name="lock" size={56} color="#006e1c" />
            </View>
            <Text className="forgot-title">忘记密码？</Text>
            <Text className="forgot-desc">输入你注册时使用的邮箱地址，我们将发送密码重置链接。</Text>

            {error ? <Text className="error-msg">{error}</Text> : null}

            <View className="form-group">
              <Text className="form-label">邮箱地址</Text>
              <Input
                className="form-input"
                type="text"
                value={email}
                placeholder="your@email.com"
                onInput={(e) => { setEmail(e.detail.value); setError(''); }}
              />
            </View>

            <View className={`reset-btn ${loading ? 'disabled' : ''}`} onClick={() => !loading && handleReset()}>
              <Text className="reset-btn-text">{loading ? '发送中...' : '发送重置链接'}</Text>
            </View>

            <View className="back-link" onClick={() => Taro.navigateBack()}>
              <Text className="back-link-text">← 返回登录</Text>
            </View>
          </>
        )}

        {step === 'sending' && (
          <View className="sending-state">
            <Icon name="loader" size={64} color="#006e1c" className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <Text className="sending-text">正在发送重置邮件...</Text>
          </View>
        )}

        {step === 'sent' && (
          <>
            <View className="success-icon-wrap">
              <Icon name="mail" size={56} color="#006e1c" />
            </View>
            <Text className="success-title">邮件已发送！</Text>
            <Text className="success-desc">
              我们已向 <Text className="email-highlight">{email}</Text> 发送了密码重置链接。
              请检查收件箱（包括垃圾邮件），点击链接即可设置新密码。
            </Text>

            <View className="actions">
              <View className="action-btn secondary" onClick={() => { setStep('input'); setEmail(''); }}>
                <Text>重新发送</Text>
              </View>
              <View className="action-btn primary" onClick={() => Taro.navigateBack()}>
                <Text>返回登录</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <Text className="help-hint">没有收到邮件？检查垃圾邮件文件夹，或稍后再试。</Text>
    </View>
  );
}
