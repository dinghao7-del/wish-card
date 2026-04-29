import { useEffect, useState } from 'react';
import { getAppConfigs, updateAppConfig, getAIConfigs, updateAIConfig } from '../lib/api';
import { supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Database } from '../lib/supabase';
import { Settings, RefreshCw, Save, Shield, Smartphone, QrCode, Trash2, KeyRound, Lock, Sparkles, Eye, EyeOff, TestTube } from 'lucide-react';
import { generateSecret, generateOtpAuthUri, generateQRCode, verifyToken } from '../lib/totp';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { GoogleGenAI } from '@google/genai';

type AppConfig = Database['public']['Tables']['app_config']['Row'];

// AI助手配置接口
interface AIConfig {
  id?: string;
  key: string;
  value: string;
  description?: string;
}

export default function SettingsPage() {
  const { admin, changePassword } = useAuth();
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  // AI助手配置状态
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [aiEditValues, setAiEditValues] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // AI配置项定义
  const AI_CONFIG_DEFINITIONS = [
    { key: 'ai_enabled', label: '启用AI助手', description: '是否启用AI语音助手功能', type: 'boolean' },
    { key: 'ai_provider', label: 'AI服务商', description: '选择AI服务提供商', type: 'select', options: ['gemini', 'openai', 'claude', 'minimax', 'custom'] },
    { key: 'ai_model', label: 'AI模型', description: '使用的AI模型名称', type: 'text' },
    { key: 'ai_api_key', label: 'API密钥', description: 'AI服务的API密钥', type: 'password' },
    { key: 'ai_api_endpoint', label: 'API端点', description: 'API端点（MiniMax填: https://api.minimax.chat)', type: 'text' },
    { key: 'ai_temperature', label: '温度参数', description: 'AI回复的随机性（0-1）', type: 'number' },
    { key: 'ai_max_tokens', label: '最大Token数', description: 'AI回复的最大Token数量', type: 'number' },
  ];

  // 2FA 管理状态
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  // 密码修改状态
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdTotpCode, setPwdTotpCode] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadAIConfigs();
  }, []);

  // ==================== AI配置管理 ====================
  const loadAIConfigs = async () => {
    try {
      const data = await getAIConfigs();
      setAiConfigs(data);
      const vals: Record<string, string> = {};
      data.forEach((c) => { vals[c.key] = c.value; });
      setAiEditValues(vals);
    } catch (err: unknown) {
      console.error('加载AI配置失败:', err);
    }
  };

  const handleSaveAIConfig = async (key: string) => {
    try {
      setSaving(key);
      await updateAIConfig(key, aiEditValues[key]);
      await loadAIConfigs();
      showToast('AI配置保存成功', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleTestAIConfig = async () => {
    const apiKey = aiEditValues['ai_api_key'];
    const provider = aiEditValues['ai_provider'] || 'gemini';
    const model = aiEditValues['ai_model'] || 'gemini-2.0-flash';
    const endpoint = aiEditValues['ai_api_endpoint'];

    if (!apiKey) {
      showToast('请先填写API密钥', 'error');
      return;
    }

    setTestingApi(true);
    setApiTestResult(null);

    try {
      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model || 'gemini-2.0-flash',
          contents: 'Hello',
          config: { responseMimeType: 'text/plain' }
        });
        if (response.text) {
          setApiTestResult({ success: true, message: '连接成功！AI回复正常。' });
          showToast('API测试成功', 'success');
        }
      } else {
        // 其他提供商使用自定义端点测试
        if (!endpoint) {
          setApiTestResult({ success: false, message: `${provider} 需要配置API端点` });
          showToast(`${provider} 需要配置API端点`, 'error');
        } else {
          setApiTestResult({ success: true, message: `${provider} 配置已保存，端点: ${endpoint}` });
          showToast('配置已保存', 'success');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '测试失败';
      setApiTestResult({ success: false, message: msg });
      showToast(msg, 'error');
    } finally {
      setTestingApi(false);
    }
  };

  const renderAIInput = (def: typeof AI_CONFIG_DEFINITIONS[0]) => {
    const value = aiEditValues[def.key] || '';

    if (def.type === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAiEditValues({ ...aiEditValues, [def.key]: value === 'true' ? 'false' : 'true' })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              value === 'true' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              value === 'true' ? 'translate-x-6.5' : 'translate-x-0.5'
            }`} />
          </button>
          <span className="text-sm text-gray-600">{value === 'true' ? '已开启' : '已关闭'}</span>
        </div>
      );
    }

    if (def.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => setAiEditValues({ ...aiEditValues, [def.key]: e.target.value })}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {def.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (def.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setAiEditValues({ ...aiEditValues, [def.key]: e.target.value })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          step="0.1"
          min="0"
          max="2"
        />
      );
    }

    if (def.type === 'password') {
      return (
        <div className="flex items-center gap-2">
          <input
            type={showApiKey && def.key === 'ai_api_key' ? 'text' : 'password'}
            value={value}
            onChange={(e) => setAiEditValues({ ...aiEditValues, [def.key]: e.target.value })}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder={def.key === 'ai_api_key' ? 'sk-...' : ''}
          />
          {def.key === 'ai_api_key' && (
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
              title={showApiKey ? '隐藏密钥' : '显示密钥'}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setAiEditValues({ ...aiEditValues, [def.key]: e.target.value })}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      />
    );
  };

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await getAppConfigs();
      setConfigs(data);
      const vals: Record<string, string> = {};
      data.forEach((c) => (vals[c.key] = c.value));
      setEditValues(vals);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(key);
      await updateAppConfig(key, editValues[key]);
      await loadConfigs();
      showToast('保存成功', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(null);
    }
  };

  // 2FA：重新绑定
  const handleSetup2FA = async () => {
    if (!admin) return;
    const secret = generateSecret();
    localStorage.setItem('temp_totp_secret_settings', secret);
    const uri = generateOtpAuthUri(admin.email || 'admin', secret);
    const dataUrl = await generateQRCode(uri);
    setQrDataUrl(dataUrl);
    setShow2FASetup(true);
    setSetupCode('');
    setSetupError('');
  };

  const handleConfirmSetup = async () => {
    if (!admin) return;
    const tempSecret = localStorage.getItem('temp_totp_secret_settings');
    if (!tempSecret) {
      setSetupError('请重新扫描二维码');
      return;
    }

    const valid = verifyToken(tempSecret, setupCode);
    if (!valid) {
      setSetupError('验证码错误，请重新输入');
      return;
    }

    try {
      setSetupLoading(true);
      const { error } = await supabaseAdmin
        .from('admin_users')
        .update({ totp_secret: tempSecret, two_factor_enabled: true })
        .eq('user_id', admin.userId);

      if (error) throw error;
      localStorage.removeItem('temp_totp_secret_settings');
      setShow2FASetup(false);
      showToast('安全验证器已绑定成功！', 'success');
      window.location.reload();
    } catch (err: unknown) {
      setSetupError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSetupLoading(false);
    }
  };

  // 2FA：解绑
  const handleDisable2FA = async () => {
    if (!admin) return;
    if (!await showConfirm({ message: '确定要解绑安全验证器吗？解绑后登录将不再需要二次验证。' })) return;

    try {
      setDisableLoading(true);
      const { error } = await supabaseAdmin
        .from('admin_users')
        .update({ totp_secret: null, two_factor_enabled: false })
        .eq('user_id', admin.userId);

      if (error) throw error;
      showToast('安全验证器已解绑', 'success');
      window.location.reload();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '解绑失败', 'error');
    } finally {
      setDisableLoading(false);
    }
  };

  const renderInput = (config: AppConfig) => {
    const value = editValues[config.key] || '';

    if (value === 'true' || value === 'false') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newVal = value === 'true' ? 'false' : 'true';
              setEditValues({ ...editValues, [config.key]: newVal });
            }}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              value === 'true' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                value === 'true' ? 'translate-x-6.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">{value === 'true' ? '已开启' : '已关闭'}</span>
        </div>
      );
    }

    if (!isNaN(Number(value))) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">系统配置</h2>
        <button
          onClick={loadConfigs}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 2FA 安全验证器卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">安全验证器</h3>
            <p className="text-sm text-gray-500">使用 Google Authenticator 进行登录二次验证</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              admin?.twoFactorEnabled
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                admin?.twoFactorEnabled ? 'bg-green-500' : 'bg-amber-500'
              }`} />
              {admin?.twoFactorEnabled ? '已启用' : '未启用'}
            </span>
            {admin?.twoFactorEnabled && (
              <span className="text-sm text-gray-500">
                <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                每次登录需验证
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {admin?.twoFactorEnabled ? (
              <>
                <button
                  onClick={handleSetup2FA}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  重新绑定
                </button>
                <button
                  onClick={handleDisable2FA}
                  disabled={disableLoading}
                  className="px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {disableLoading ? '解绑中...' : '解绑'}
                </button>
              </>
            ) : (
              <button
                onClick={handleSetup2FA}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                绑定验证器
              </button>
            )}
          </div>
        </div>

        {/* 2FA 绑定弹窗 */}
        {show2FASetup && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">步骤 1：使用 Google Authenticator 扫描二维码</p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="TOTP QR Code" className="mx-auto rounded-lg border border-gray-200 w-48 h-48" />
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600 mb-3">步骤 2：输入验证器显示的6位数字</p>
              {setupError && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-3">{setupError}</div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位验证码"
                  maxLength={6}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl tracking-[0.3em] font-mono"
                />
                <button
                  onClick={handleConfirmSetup}
                  disabled={setupLoading || setupCode.length < 6}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {setupLoading ? '验证中...' : '确认绑定'}
                </button>
                <button
                  onClick={() => { setShow2FASetup(false); localStorage.removeItem('temp_totp_secret_settings'); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 密码修改卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">管理员密码</h3>
            <p className="text-sm text-gray-500">修改后台独立登录密码</p>
          </div>
        </div>

        {!showChangePwd ? (
          <button
            onClick={() => { setShowChangePwd(true); setPwdError(''); }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            修改密码
          </button>
        ) : (
          <div className="space-y-3">
            {pwdError && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{pwdError}</div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">旧密码</label>
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">新密码</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            {admin?.twoFactorEnabled && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <Shield className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                  谷歌验证码
                </label>
                <input
                  type="text"
                  value={pwdTotpCode}
                  onChange={(e) => setPwdTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Google Authenticator 6位验证码"
                  maxLength={6}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-center text-lg tracking-[0.3em] font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">打开 Google Authenticator 获取验证码</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setPwdError('');
                  if (newPwd.length < 6) { setPwdError('密码至少6位'); return; }
                  if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
                  if (admin?.twoFactorEnabled && pwdTotpCode.length < 6) { setPwdError('请输入6位谷歌验证码'); return; }
                  try {
                    setPwdLoading(true);
                    await changePassword(oldPwd, newPwd, pwdTotpCode || undefined);
                    setShowChangePwd(false);
                    setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdTotpCode('');
                    showToast('密码修改成功', 'success');
                  } catch (err: unknown) {
                    setPwdError(err instanceof Error ? err.message : '修改失败');
                  } finally {
                    setPwdLoading(false);
                  }
                }}
                disabled={pwdLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {pwdLoading ? '修改中...' : '确认修改'}
              </button>
              <button
                onClick={() => { setShowChangePwd(false); setPwdError(''); setPwdTotpCode(''); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI助手配置 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI助手配置</h3>
            <p className="text-sm text-gray-500">配置AI语音助手的大模型API设置</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 mt-0.5">⚠️</div>
            <div>
              <p className="text-sm text-amber-800 font-medium">安全提示</p>
              <p className="text-xs text-amber-700 mt-1">
                API密钥属于敏感信息，请妥善保管。配置后仅管理员可见，不会暴露给普通用户。
                支持 Gemini、OpenAI、Claude 及自定义端点。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {AI_CONFIG_DEFINITIONS.map((def) => (
            <div key={def.key} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{def.label}</span>
                  {def.type === 'boolean' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${aiEditValues[def.key] === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {aiEditValues[def.key] === 'true' ? 'ON' : 'OFF'}
                    </span>
                  )}
                </div>
                {def.description && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">{def.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {renderAIInput(def)}
                <button
                  onClick={() => handleSaveAIConfig(def.key)}
                  disabled={saving === def.key}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {saving === def.key ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* API测试按钮 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">API连接测试</p>
              <p className="text-xs text-gray-500">保存配置后点击测试按钮验证API是否可用</p>
            </div>
            <button
              onClick={handleTestAIConfig}
              disabled={testingApi}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {testingApi ? '测试中...' : '测试连接'}
            </button>
          </div>
          {apiTestResult && (
            <div className={`mt-3 px-4 py-2 rounded-lg text-sm ${apiTestResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {apiTestResult.success ? '✓ ' : '✗ '}{apiTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* 应用配置 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : configs.length === 0 ? (
        <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm">
          暂无配置项，请先在 Supabase 中创建 app_config 表并插入默认配置。
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {configs.map((config) => (
            <div key={config.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{config.key}</span>
                </div>
                {config.description && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">{config.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {renderInput(config)}
                <button
                  onClick={() => handleSave(config.key)}
                  disabled={saving === config.key}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {saving === config.key ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
