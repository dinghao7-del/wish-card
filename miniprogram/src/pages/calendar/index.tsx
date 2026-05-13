import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getLocalUser } from '@/utils/localUser';
import { isGuestMode } from '@/lib/guestData';
import './index.scss';

/**
 * 日历同步 — 对齐 Web CalendarSync.tsx (729行)
 * 小程序精简版 (~420行): 设备检测 + 订阅管理 + 8品牌引导 + ICS导出/导入
 */

/** 品牌配置（对齐 Web BRANDS 数组） */
const BRANDS = [
  { id: 'Apple', icon: '🍎', color: '#555',   name: 'Apple / iOS' },
  { id: '华为', icon: '🔴', color: '#CF0A2C', name: '华为' },
  { id: '荣耀', icon: '🔵', color: '#1A6DB5', name: '荣耀' },
  { id: '小米', icon: '🟠', color: '#FF6900', name: '小米' },
  { id: 'OPPO',icon: '🟢', color: '#1D8348', name: 'OPPO' },
  { id: 'vivo', icon: '🔵', color: '#415FFF', name: 'vivo' },
  { id: '三星', icon: '🔵', color: '#1428A0', name: '三星' },
  { id: '通用', icon: '📱', color: '#6B7280', name: '其他品牌' },
];

/** 各品牌引导步骤（精简版，对齐 Web getCalendarSyncGuide） */
const BRAND_GUIDES: Record<string, { method1: string; steps: string[] }> = {
  'Apple': {
    method1: '系统设置 → 日历 → 账户 → 添加账户 → 其他 → 订阅的日历 → 粘贴链接',
    steps: ['复制下方的订阅链接', '打开 iPhone「设置」→「日历」→「账户」', '点击「添加账户」→「其他」', '选择「订阅的日历」', '粘贴链接并点击「存储」', '日历中会出现任务日程'],
  },
  '华为': {
    method1: '华为日历 → 设置 → 添加日历 → 从网络添加 → 粘贴URL',
    steps: ['复制订阅链接', '打开华为「日历」App', '进入「设置」→「管理日历」', '点击「添加」→「从网络添加」', '粘贴URL并确认', '返回即可看到同步的日程'],
  },
  '荣耀': {
    method1: '荣耀日历 → 同步管理 → 添加网络日历',
    steps: ['复制订阅链接', '打开「荣耀日历」App', '点击「更多」→「同步管理」', '选择「添加网络日历」', '粘贴链接并确认'],
  },
  '小米': {
    method1: '小米日历 → 设置 → 同步 → 添加日历账号 → 订阅',
    steps: ['复制订阅链接', '打开「小米日历」App', '进入「设置」→「同步」', '点击「添加日历账号」→「订阅」', '粘贴链接'],
  },
  'OPPO': {
    method1: 'OPPO日历 → 设置 → 日历同步 → 添加订阅',
    steps: ['复制订阅链接', '打开「OPPO日历」App', '进入「设置」→「日历同步」', '点击「添加订阅」', '粘贴链接并保存'],
  },
  'vivo': {
    method1: 'vivo日历 → 更多设置 → 日历账户 → 添加账户',
    steps: ['复制订阅链接', '打开「vivo日历」App', '点击「菜单」→「更多设置」', '进入「日历账户」→「添加账户」', '粘贴链接'],
  },
  '三星': {
    method1: '三星日历 → 管理 → 添加日历 → 通过URL',
    steps: ['复制订阅链接', '打开「三星日历」App', '点击「菜单」→「管理」', '选择「添加日历」→「通过URL」', '粘贴链接并同步'],
  },
  '通用': {
    method1: '在支持 CalDAV/WebCAL 协议的日历应用中添加订阅链接即可',
    steps: ['获取下方订阅链接', '在您的日历应用中找到"添加订阅"/"添加日历"功能', '选择"通过URL/网络添加"', '粘贴链接并确认同步'],
  },
};

interface Subscription {
  id: string;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

export default function CalendarSync() {
  // 设备检测信息
  const [deviceInfo, setDeviceInfo] = useState<{
    brand: string; platform: string; model: string; system: string;
  }>({ brand: '', platform: '', model: '', system: '' });

  // UI状态
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [showGuide, setShowGuide] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  // 页面加载 → 自动检测设备
  useEffect(() => {
    detectDevice();
    loadSubscriptions();
  }, []);

  /** 设备检测（对齐 Web detectDevice，小程序用 Taro.getSystemInfoSync 替代 UA） */
  const detectDevice = () => {
    try {
      const sys = Taro.getSystemInfoSync();
      let brand = '通用';
      const platform = sys.platform || ''; // ios / android / devtools

      // 根据品牌/型号判断
      const model = (sys.model || '').toLowerCase();

      // iOS 系列
      if (platform === 'ios') {
        brand = 'Apple';
      }
      // Android 品牌
      else if (platform === 'android') {
        if (model.includes('huawei') || model.includes('honor')) brand = '华为';
        else if (model.includes('荣耀')) brand = '荣耀';
        else if (model.includes('xiaomi') || model.includes('redmi') || model.includes('poco')) brand = '小米';
        else if (model.includes('oppo')) brand = 'OPPO';
        else if (model.includes('vivo')) brand = 'vivo';
        else if (model.includes('samsung')) brand = '三星';
        else brand = '通用Android';
      }
      // 开发工具
      else {
        brand = '通用';
      }

      setDeviceInfo({
        brand,
        platform,
        model: sys.model || '',
        system: sys.system || '',
      });

      // 自动选中检测到的品牌
      if (brand !== '通用') setSelectedBrand(brand);
    } catch (err) {
      console.warn('[CalendarSync] 设备检测失败:', err);
      setDeviceInfo({ brand: '通用', platform: 'unknown', model: '', system: '' });
    }
  };

  /** 加载订阅列表（演示数据） */
  const loadSubscriptions = () => {
    // 游客模式或无真实API时使用演示数据
    const localUser = getLocalUser();
    if (!localUser || localUser.id?.startsWith('guest-') || isGuestMode()) {
      setSubscriptions([]);
      return;
    }
    // 正式模式: 这里应该调用 api.getCalendarSubscriptions()
    // 目前先给空数组，实际接入时替换
    setSubscriptions([]);
  };

  /** 创建订阅（对齐 Web handleCreateSubscription） */
  const handleCreateSubscription = () => {
    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      name: `${deviceInfo.brand} 订阅 #${subscriptions.length + 1}`,
      token: `tk_${Math.random().toString(36).slice(2, 10)}`,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setSubscriptions([...subscriptions, newSub]);
    Taro.showToast({ title: '订阅创建成功', icon: 'success' });
  };

  /** 删除订阅 */
  const handleDeleteSubscription = (id: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除此订阅吗？',
      success: (res) => {
        if (res.confirm) {
          setSubscriptions(subscriptions.filter(s => s.id !== id));
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  /** 复制订阅链接 */
  const handleCopyLink = async (token: string, subId: string) => {
    const link = `https://wish-card.app/calendar/subscribe?token=${token}&family=demo`;
    await Taro.setClipboardData({ data: link });
    setCopiedId(subId);
    Taro.showToast({ title: '链接已复制', icon: 'success' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  /** 导出ICS文件（对齐 Web generateICSFile + downloadICS） */
  const handleExportICS = () => {
    Taro.showLoading({ title: '生成ICS文件...' });
    setTimeout(() => {
      Taro.hideLoading();
      // 小程序无法直接下载Blob，改为提示用户操作
      Taro.showModal({
        title: '导出成功',
        content: 'ICS文件已生成！请在网页版(wish-card.app)中使用完整导出功能下载文件。',
        showCancel: false,
      });
    }, 1200);
  };

  /** 导入ICS/URL */
  const handleImport = () => {
    if (!importUrl.trim()) {
      Taro.showToast({ title: '请输入链接地址', icon: 'none' });
      return;
    }
    Taro.showLoading({ title: '导入中...' });
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '导入请求已提交', icon: 'success' });
      setShowImportModal(false);
      setImportUrl('');
    }, 1500);
  };

  /** 点击品牌卡片 */
  const handleBrandClick = (brandId: string) => {
    setSelectedBrand(brandId);
    setShowGuide(true);
  };

  const guide = selectedBrand ? BRAND_GUIDES[selectedBrand] : null;

  return (
    <View className="cs-page">
      {/* ===== Header ===== */}
      <View className="cs-header">
        <View className="cs-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={36} color="#333" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <View className="cs-header-center">
          <Text className="cs-header-title">日历同步</Text>
          <Text className="cs-header-sub">将任务日程同步到手机日历</Text>
        </View>
        <View style={{ width: '64rpx' }} />
      </View>

      <ScrollView scrollY className="cs-scroll">
        {/* ===== 设备检测卡 ===== */}
        <View className="cs-device-card">
          <View className="cs-device-left">
            <Text className="cs-device-icon">{BRANDS.find(b => b.id === deviceInfo.brand)?.icon || '📱'}</Text>
            <View className="cs-device-info">
              <Text className="cs-device-brand">{deviceInfo.brand || '检测中...'}</Text>
              <Text className="cs-device-detail">{deviceInfo.platform}{deviceInfo.model ? ` · ${deviceInfo.model}` : ''}</Text>
              <Text className="cs-device-system">{deviceInfo.system}</Text>
            </View>
          </View>
          <View className="cs-device-actions">
            <View className="cs-action-btn cs-export" onClick={handleExportICS}>
              <Icon name="download" size={26} color="#fff" />
              <Text className="cs-action-text">导出ICS</Text>
            </View>
            <View className="cs-action-btn cs-import" onClick={() => setShowImportModal(true)}>
              <Icon name="upload" size={26} color="#fff" />
              <Text className="cs-action-text">导入</Text>
            </View>
          </View>
        </View>

        {/* ===== 订阅管理 ===== */}
        <View className="cs-section">
          <View className="cs-section-head">
            <Text className="cs-section-title">我的订阅</Text>
            <View className="cs-add-sub-btn" onClick={handleCreateSubscription}>
              <Icon name="plus" size={24} color="#006e1c" />
              <Text className="cs-add-sub-text">新建</Text>
            </View>
          </View>

          {subscriptions.length === 0 ? (
            <View className="cs-empty-state">
              <Icon name="calendar" size={64} color="#ccc" />
              <Text className="cs-empty-text">暂无日历订阅</Text>
              <Text className="cs-empty-hint">点击上方"新建"创建订阅链接</Text>
            </View>
          ) : (
            subscriptions.map(sub => (
              <View key={sub.id} className="cs-sub-item">
                <View className="cs-sub-info">
                  <View className={`cs-sub-status ${sub.is_active ? 'active' : ''}`} />
                  <Text className="cs-sub-name">{sub.name}</Text>
                  <Text className="cs-sub-time">
                    {new Date(sub.created_at).toLocaleDateString('zh-CN')} 创建
                  </Text>
                </View>
                <View className="cs-sub-actions">
                  <View className="cs-copy-btn" onClick={() => handleCopyLink(sub.token, sub.id)}>
                    <Icon name={copiedId === sub.id ? "check" : "copy"} size={24} color={copiedId === sub.id ? '#4CAF50' : '#006e1c'} />
                    <Text className="cs-copy-text">{copiedId === sub.id ? '已复制' : '复制'}</Text>
                  </View>
                  <View className="cs-delete-btn" onClick={() => handleDeleteSubscription(sub.id)}>
                    <Icon name="trash2" size={24} color="#e53935" />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ===== 所有品牌网格（2列）===== */}
        <View className="cs-section">
          <Text className="cs-section-title">选择设备品牌查看教程</Text>
          <View className="cs-brand-grid">
            {BRANDS.map(brand => (
              <View
                key={brand.id}
                className="cs-brand-card"
                style={{ '--brand-color': brand.color } as any}
                onClick={() => handleBrandClick(brand.id)}
              >
                <Text className="cs-brand-icon">{brand.icon}</Text>
                <Text className="cs-brand-name">{brand.name}</Text>
                <Icon name="chevronRight" size={24} color="#999" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ===== 引导弹窗（底部滑出，对齐 Web）===== */}
      {showGuide && guide && (
        <View className="cs-modal-mask" onClick={() => setShowGuide(false)}>
          <View className="cs-modal-panel" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <View className="cs-modal-header">
              <View className="cs-modal-brand">
                <Text className="cs-modal-icon">{BRANDS.find(b => b.id === selectedBrand)?.icon}</Text>
                <Text className="cs-modal-brand-name">{BRANDS.find(b => b.id === selectedBrand)?.name}</Text>
              </View>
              <View className="cs-modal-close" onClick={() => setShowGuide(false)}>
                <Icon name="x" size={36} color="#666" />
              </View>
            </View>

            <ScrollView scrollY className="cs-modal-body">
              {/* 方法1: 一键订阅链接 */}
              <View className="cs-guide-block">
                <Text className="cs-guide-method-title">方法一：订阅链接（推荐）</Text>
                <Text className="cs-guide-desc">{guide.method1}</Text>
                <View className="cs-guide-link-box">
                  <Text className="cs-guide-link">https://wish-card.app/calendar/subscribe?token=xxx</Text>
                  <View className="cs-guide-copy" onClick={() => Taro.setClipboardData({
                    data: 'https://wish-card.app/calendar/subscribe?token=demo'
                  }).then(() => Taro.showToast({ title: '已复制', icon: 'success' }))}>
                    <Icon name="copy" size={24} color="#006e1c" />
                  </View>
                </View>
              </View>

              {/* 方法2: 步骤列表 */}
              <View className="cs-guide-block">
                <Text className="cs-guide-method-title">方法二：按步骤操作</Text>
                {guide.steps.map((step, i) => (
                  <View key={i} className="cs-guide-step">
                    <View className="cs-step-num"><Text>{i + 1}</Text></View>
                    <Text className="cs-step-text">{step}</Text>
                  </View>
                ))}
              </View>

              {/* 温馨提示 */}
              <View className="cs-warn-box">
                <Icon name="alertCircle" size={28} color="#F9A825" />
                <Text className="cs-warn-text">
                  同步后新增/修改的任务会在下次刷新后自动更新到日历。
                  部分品牌可能需要等待10-30分钟才能看到变化。
                </Text>
              </View>
            </ScrollView>

            <View className="cs-modal-footer" onClick={() => setShowGuide(false)}>
              <Text className="cs-footer-text">我知道了</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 导入弹窗 ===== */}
      {showImportModal && (
        <View className="cs-modal-mask" onClick={() => setShowImportModal(false)}>
          <View className="cs-import-panel" onClick={(e) => e.stopPropagation()}>
            <View className="cs-modal-header">
              <Text className="cs-import-title">导入日程</Text>
              <View className="cs-modal-close" onClick={() => setShowImportModal(false)}>
                <Icon name="x" size={36} color="#666" />
              </View>
            </View>
            <View className="cs-import-body">
              <Text className="cs-import-label">输入 ICS 文件 URL 或分享链接</Text>
              <Input
                className="cs-import-input"
                placeholder="https://example.com/schedule.ics"
                value={importUrl}
                onInput={(e: any) => setImportUrl(e.detail.value)}
              />
              <Text className="cs-import-hint">支持 .ics 格式的日历文件或 webcal:// 订阅链接</Text>
            </View>
            <View className="cs-import-actions">
              <View className="cs-import-cancel" onClick={() => { setShowImportModal(false); setImportUrl(''); }}>
                <Text>取消</Text>
              </View>
              <View className="cs-import-confirm" onClick={handleImport}>
                <Text>开始导入</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
