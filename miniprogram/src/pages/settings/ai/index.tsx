import { View, Text, Input, Switch, ScrollView, Picker } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getAIConfig } from '@/lib/aiEngine';

interface AIConfigState {
  provider: string;
  model: string;
  apiKey: string;
  apiEndpoint: string;
  enabled: boolean;
}

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
];

const MODEL_MAP: Record<string, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
};

export default function AISettingsPage() {
  const [config, setConfig] = useState<AIConfigState>({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: '',
    apiEndpoint: '',
    enabled: true,
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const stored = Taro.getStorageSync('ai_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig(prev => ({ ...prev, ...parsed }));
      } else {
        const remote = await getAIConfig();
        if (remote) {
          setConfig(prev => ({ ...prev, ...remote }));
        }
      }
    } catch (e) {
      console.error('[AISettings] Load config error:', e);
    }
  };

  const saveConfig = () => {
    try {
      const toSave = { ...config };
      Taro.setStorageSync('ai_config', JSON.stringify(toSave));
      setSaved(true);
      Taro.showToast({ title: '设置已保存', icon: 'success' });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult('');
    try {
      // Save first
      Taro.setStorageSync('ai_config', JSON.stringify(config));
      
      const { sendToAI } = require('@/lib/aiEngine');
      const reply = await sendToAI('你好，这是一条测试消息');
      setTestResult(`✅ 连接成功！\n\n回复：${reply}`);
    } catch (e: any) {
      setTestResult(`❌ 连接失败\n\n${e.message || e}`);
    } finally {
      setTesting(false);
    }
  };

  const resetConfig = () => {
    Taro.showModal({
      title: '重置设置',
      content: '确定要恢复默认配置吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('ai_config');
          setConfig({
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            apiKey: '',
            apiEndpoint: '',
            enabled: true,
          });
          Taro.showToast({ title: '已恢复默认', icon: 'success' });
        }
      },
    });
  };

  const models = MODEL_MAP[config.provider] || MODEL_MAP.gemini;

  return (
    <View className="ai-settings-page">
      {/* Header */}
      <View className="as-header">
        <View className="as-back-btn" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={22} color="#333" />
        </View>
        <Text className="as-title">AI 助手设置</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView scrollY className="as-content">
        {/* Enable Toggle */}
        <View className="as-card">
          <View className="as-card-row">
            <View className="as-card-left">
              <Icon name="sparkles" size={20} color="#006e1c" />
              <Text className="as-card-label">启用 AI 助手</Text>
            </View>
            <Switch
              checked={config.enabled}
              onChange={(e: any) => setConfig(p => ({ ...p, enabled: e.detail.value }))}
              color="#006e1c"
            />
          </View>
          <Text className="as-card-hint">关闭后，AI 对话将使用本地规则引擎</Text>
        </View>

        {/* Provider */}
        <View className="as-card">
          <Text className="as-section-label">AI 服务商</Text>
          
          <View className="as-form-group">
            <Text className="as-form-label">服务商</Text>
            <View className="as-chips">
              {PROVIDERS.map(p => (
                <Text
                  key={p.value}
                  className={`as-chip ${config.provider === p.value ? 'active' : ''}`}
                  onClick={() => setConfig(c => ({
                    ...c,
                    provider: p.value,
                    model: MODEL_MAP[p.value]?.[0] || 'gemini-2.0-flash',
                  }))}
                >{p.label}</Text>
              ))}
            </View>
          </View>

          <View className="as-form-group">
            <Text className="as-form-label">模型</Text>
            <Picker
              mode="selector"
              range={models}
              value={models.indexOf(config.model)}
              onChange={(e: any) => setConfig(c => ({ ...c, model: models[e.detail.value] }))}
            >
              <View className="as-picker">
                <Text>{config.model}</Text>
                <Icon name="chevronDown" size={14} color="#999" />
              </View>
            </Picker>
          </View>

          <View className="as-form-group">
            <Text className="as-form-label">API Key</Text>
            <Input
              className="as-input"
              password
              value={config.apiKey}
              placeholder="输入 API Key"
              onInput={(e) => setConfig(c => ({ ...c, apiKey: e.detail.value }))}
            />
          </View>

          <View className="as-form-group">
            <Text className="as-form-label">API 端点（可选）</Text>
            <Input
              className="as-input"
              value={config.apiEndpoint}
              placeholder="自定义 API 地址（留空使用默认）"
              onInput={(e) => setConfig(c => ({ ...c, apiEndpoint: e.detail.value }))}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="as-card">
          <Text className="as-section-label">快捷操作</Text>
          
          <View className="as-action-list">
            <View className="as-action-item" onClick={testConnection}>
              <Icon name="wifi" size={18} color="#006e1c" />
              <View className="as-action-body">
                <Text className="as-action-name">{testing ? '测试中...' : '测试连接'}</Text>
                <Text className="as-action-desc">发送测试消息验证配置是否正确</Text>
              </View>
              <Icon name="chevronRight" size={16} color="#ccc" />
            </View>

            <View className="as-action-item" onClick={saveConfig}>
              <Icon name="save" size={18} color={saved ? '#22c55e' : '#666'} />
              <View className="as-action-body">
                <Text className="as-action-name" style={{ color: saved ? '#22c55e' : undefined }}>
                  {saved ? '已保存 ✓' : '保存设置'}
                </Text>
                <Text className="as-action-desc">将当前配置保存到本地</Text>
              </View>
              <Icon name="chevronRight" size={16} color="#ccc" />
            </View>

            <View className="as-action-item" onClick={resetConfig}>
              <Icon name="trash2" size={18} color="#ef4444" />
              <View className="as-action-body">
                <Text className="as-action-name" style={{ color: '#ef4444' }}>重置为默认</Text>
                <Text className="as-action-desc">清除所有自定义配置</Text>
              </View>
              <Icon name="chevronRight" size={16} color="#ccc" />
            </View>
          </View>
        </View>

        {/* Test Result */}
        {!!testResult && (
          <View className="as-card as-test-result">
            <Text className="as-section-label">测试结果</Text>
            <Text className="as-test-text">{testResult}</Text>
          </View>
        )}

        {/* Info */}
        <View className="as-info-card">
          <Icon name="info" size={16} color="#8b5cf6" />
          <Text className="as-info-text">
            AI 助手通过 Supabase Edge Function 调用模型 API。
            未配置 API Key 时，会使用本地规则引擎提供基础问答能力。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
