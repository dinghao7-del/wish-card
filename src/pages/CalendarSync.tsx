import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Download, Smartphone, ChevronRight, Check, Copy, 
  ExternalLink, Calendar, Plus, Trash2, Upload,
  Link, X, Monitor, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { generateICSFile, downloadICS, getCalendarSyncGuide, type CalendarSyncGuide } from '../lib/voiceAssistant';
import * as api from '../lib/api';

interface CalendarSubscription {
  id: string;
  family_id: string;
  token: string;
  name: string;
  is_active: boolean;
  last_accessed_at?: string;
  created_at: string;
}

// 设备检测
function detectDevice(): { brand: string; platform: string; icon: string } {
  const ua = navigator.userAgent;
  
  // 检测平台
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { brand: 'Apple', platform: 'iOS', icon: '🍎' };
  }
  
  if (/Android/i.test(ua)) {
    // 尝试检测 Android 设备品牌
    if (/HUAWEI|HONOR/i.test(ua)) {
      if (/HONOR/i.test(ua)) {
        return { brand: '荣耀', platform: 'Android', icon: '🔵' };
      }
      return { brand: '华为', platform: 'Android', icon: '🔴' };
    }
    if (/Xiaomi|Redmi|POCO/i.test(ua)) {
      return { brand: '小米', platform: 'Android', icon: '🟠' };
    }
    if (/OPPO/i.test(ua)) {
      return { brand: 'OPPO', platform: 'Android', icon: '🟢' };
    }
    if (/vivo/i.test(ua)) {
      return { brand: 'vivo', platform: 'Android', icon: '🔵' };
    }
    if (/Samsung/i.test(ua)) {
      return { brand: '三星', platform: 'Android', icon: '🔵' };
    }
    // 通用 Android
    return { brand: '通用Android', platform: 'Android', icon: '🤖' };
  }
  
  if (/Macintosh|Mac OS/i.test(ua)) {
    return { brand: 'Apple', platform: 'macOS', icon: '🍎' };
  }
  
  if (/Windows/i.test(ua)) {
    return { brand: '通用', platform: 'Windows', icon: '💻' };
  }
  
  return { brand: '通用', platform: '未知', icon: '📱' };
}

const BRANDS = [
  { id: 'Apple', icon: '🍎', color: '#555555', name: 'Apple / iOS' },
  { id: '华为', icon: '🔴', color: '#CF0A2C', name: '华为' },
  { id: '荣耀', icon: '🔵', color: '#1A6DB5', name: '荣耀' },
  { id: '小米', icon: '🟠', color: '#FF6900', name: '小米' },
  { id: 'OPPO', icon: '🟢', color: '#1D8348', name: 'OPPO' },
  { id: 'vivo', icon: '🔵', color: '#415FFF', name: 'vivo' },
  { id: '三星', icon: '🔵', color: '#1428A0', name: '三星' },
  { id: '通用', icon: '📱', color: '#6B7280', name: '其他品牌' },
];

export function CalendarSync() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tasks, members, currentUser, familyId } = useFamily();
  
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
  const [detectedDevice, setDetectedDevice] = useState(detectDevice());
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file');
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTasks = tasks.filter(t => !t.isHabit && t.status !== 'completed');
  const guide = selectedBrand ? getCalendarSyncGuide(selectedBrand) : null;

  // 页面加载时自动检测设备
  useEffect(() => {
    const device = detectDevice();
    setDetectedDevice(device);
    // 自动打开对应品牌的引导
    if (device.brand !== '通用') {
      setSelectedBrand(device.brand);
    }
  }, []);

  // 加载订阅列表
  useEffect(() => {
    if (familyId) {
      loadSubscriptions();
    }
  }, [familyId]);

  const loadSubscriptions = async () => {
    try {
      const data = await api.getCalendarSubscriptions(familyId!);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('加载订阅失败:', error);
    }
  };

  // 创建订阅
  const handleCreateSubscription = async () => {
    try {
      const newSub = await api.createCalendarSubscription(familyId!, {
        name: `${detectedDevice.brand} 订阅 ${subscriptions.length + 1}`,
      });
      setSubscriptions([...subscriptions, newSub]);
    } catch (error: any) {
      alert(`创建失败: ${error.message}`);
    }
  };

  // 删除订阅
  const handleDeleteSubscription = async (id: string) => {
    if (!confirm(t('calendar_sync.confirm_delete', { defaultValue: '确认删除' }) || '确定要删除此订阅吗？')) {
      return;
    }
    try {
      await api.deleteCalendarSubscription(id);
      setSubscriptions(subscriptions.filter(s => s.id !== id));
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  // 复制订阅链接
  const handleCopySubscribeLink = async (token: string) => {
    const link = `${window.location.origin}/api/calendar-subscribe?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      // 降级方案
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // 一键订阅（iOS 使用 webcal:// 协议）
  const handleOneClickSubscribe = async (token: string) => {
    const baseUrl = `${window.location.origin}/api/calendar-subscribe?token=${token}`;
    
    // iOS 设备尝试直接使用 webcal:// 协议
    if (detectedDevice.platform === 'iOS') {
      const webcalUrl = baseUrl.replace(/^https?:/, 'webcal:');
      window.location.href = webcalUrl;
      return;
    }
    
    // 其他设备：复制链接并提示
    await handleCopySubscribeLink(token);
    alert(t('calendar_sync.copied_then_open_calendar', { defaultValue: '链接已复制！请在手机日历App中粘贴此链接' }) || '链接已复制！请在手机日历App中粘贴此链接');
  };

  // 导出 ICS 文件
  const handleExportICS = () => {
    setIsExporting(true);
    try {
      const ics = generateICSFile(
        tasks.filter(t => !t.isHabit),
        members,
        '星愿卡'
      );
      downloadICS(ics, `wishcard-${new Date().toISOString().split('T')[0]}.ics`);
    } catch (error) {
      console.error('导出 ICS 失败:', error);
      alert('导出失败，请重试', { defaultValue: '导出失败，请重试' });
    } finally {
      setIsExporting(false);
    }
  };

  // 导入 ICS 文件
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const events = parseICS(content);
        
        if (events.length === 0) {
          alert(t('calendar_sync.no_events', { defaultValue: '未找到可导入的事件' }) || '未找到可导入的事件');
          return;
        }

        if (confirm(`${t('calendar_sync.import_confirm', { defaultValue: '导入确认' }) || '发现'} ${events.length} ${t('calendar_sync.events_found', { defaultValue: '个事件，是否导入为任务？' }) || '个事件，是否导入为任务？'}`)) {
          for (const event of events) {
            await api.createTask(familyId!, {
              title: event.summary,
              description: event.description,
              rewardStars: 0,
              assigneeIds: [currentUser?.id || ''],
              startTime: event.start,
              icon: '📅',
            });
          }
          alert(`${t('calendar_sync.import_success', { defaultValue: '成功导入' }) || '成功导入'} ${events.length} ${t('calendar_sync.events', { defaultValue: '个事件' }) || '个事件'}`);
        }
      } catch (error: any) {
        alert(`导入失败: ${error.message}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // 解析 ICS 文件
  const parseICS = (content: string): Array<{summary: string; description: string; start: string; end: string}> => {
    const events: Array<{summary: string; description: string; start: string; end: string}> = [];
    const lines = content.split(/\r\n|\n/);
    let currentEvent: any = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT') {
        if (currentEvent) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentEvent.summary = line.substring(8);
        } else if (line.startsWith('DESCRIPTION:')) {
          currentEvent.description = line.substring(12).replace(/\\n/g, '\n');
        } else if (line.startsWith('DTSTART')) {
          const dateStr = line.split(':')[1];
          currentEvent.start = formatICSDateToISO(dateStr);
        } else if (line.startsWith('DTEND')) {
          const dateStr = line.split(':')[1];
          currentEvent.end = formatICSDateToISO(dateStr);
        }
      }
    }

    return events;
  };

  const formatICSDateToISO = (icsDate: string): string => {
    if (icsDate.length >= 15) {
      const year = icsDate.substring(0, 4);
      const month = icsDate.substring(4, 6);
      const day = icsDate.substring(6, 8);
      const hour = icsDate.substring(9, 11);
      const minute = icsDate.substring(11, 13);
      const second = icsDate.substring(13, 15);
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    }
    return icsDate;
  };

  const openGuide = (brand: string) => {
    setSelectedBrand(brand);
    setShowGuide(true);
  };

  const closeGuide = () => {
    setShowGuide(false);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 sticky top-0 bg-background/90 backdrop-blur-xl z-40 border-b border-outline-variant/10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-on-surface">{t('calendar_sync.title', { defaultValue: '日历同步' })}</h1>
          <p className="text-[10px] text-on-surface-variant font-bold">{t('calendar_sync.subtitle', { defaultValue: '与手机日历无缝同步' })}</p>
        </div>
      </header>

      <div className="px-6 space-y-6 mt-4">
        {/* 自动检测的设备卡片 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-[2rem] p-6 border border-primary/10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-surface-container-low shadow-sm flex items-center justify-center text-4xl">
              {detectedDevice.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-on-surface">
                {t('calendar_sync.detected_device', { defaultValue: '检测到您的设备' }) || '检测到您的设备'}
              </h2>
              <p className="text-sm text-primary font-black">
                {detectedDevice.brand} {detectedDevice.platform}
              </p>
            </div>
            <button
              onClick={() => openGuide(detectedDevice.brand)}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              {t('calendar_sync.view_guide', { defaultValue: '查看引导' }) || '查看引导'}
            </button>
          </div>

          {/* 一键操作按钮 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportICS}
              disabled={isExporting || activeTasks.length === 0}
              className="bg-white dark:bg-surface-container-low text-on-surface py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <Download size={16} />
              {isExporting ? t('calendar_sync.exporting', { defaultValue: '导出中...' }) : t('calendar_sync.export_ics', { defaultValue: '导出ICS' })}
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-white dark:bg-surface-container-low text-on-surface py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Upload size={16} />
              {t('calendar_sync.import_ics', { defaultValue: '导入ICS' })}
            </button>
          </div>
        </motion.div>

        {/* 订阅管理 */}
        <div className="bg-white dark:bg-surface-container-low rounded-[2rem] p-6 shadow-sm border border-outline-variant/5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
              <Link size={18} className="text-primary" />
              {t('calendar_sync.subscriptions', { defaultValue: '订阅管理' }) || '订阅管理'}
            </h2>
            <button
              onClick={handleCreateSubscription}
              className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-on-surface-variant font-bold mb-2">
                {t('calendar_sync.no_subscriptions', { defaultValue: '暂无订阅' }) || '暂无订阅'}
              </p>
              <p className="text-xs text-on-surface-variant/60">
                {t('calendar_sync.create_subscription_hint', { defaultValue: '点击 + 创建订阅链接，可同步到手机日历' }) || '点击 + 创建订阅链接，可同步到手机日历'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="bg-surface-container-low dark:bg-surface-container rounded-2xl p-4 border border-outline-variant/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${sub.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-bold text-sm text-on-surface">{sub.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySubscribeLink(sub.token)}
                      className="flex-1 bg-surface-container-highest dark:bg-surface-container py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      {copied === sub.token ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          {t('calendar_sync.copied', { defaultValue: '已复制' })}
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          {t('calendar_sync.copy_link', { defaultValue: '复制链接' })}
                        </>
                      )}
                    </button>
                  </div>

                  {sub.last_accessed_at && (
                    <p className="text-[10px] text-on-surface-variant/50 mt-2">
                      {t('calendar_sync.last_accessed', { defaultValue: '最后访问' }) || '最后访问'}: {new Date(sub.last_accessed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 所有品牌选择 */}
        <div>
          <h2 className="text-lg font-black text-on-surface mb-2">
            {t('calendar_sync.all_brands', { defaultValue: '所有品牌' }) || '所有品牌'}
          </h2>
          <p className="text-xs text-on-surface-variant font-bold mb-4">
            {t('calendar_sync.brand_hint', { defaultValue: '选择您的手机品牌，查看详细的日历同步步骤' }) || '选择您的手机品牌，查看详细的日历同步步骤'}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {BRANDS.map((brand) => (
              <motion.button
                key={brand.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => openGuide(brand.id)}
                className={`relative bg-white dark:bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 shadow-sm border-2 transition-all active:scale-[0.98] ${
                  selectedBrand === brand.id 
                    ? 'border-primary shadow-md' 
                    : 'border-transparent hover:border-primary/30'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${brand.color}15` }}
                >
                  {brand.icon}
                </div>
                <div className="text-left">
                  <p className="font-black text-on-surface text-sm">{brand.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-bold">
                    {selectedBrand === brand.id ? t('calendar_sync.selected', { defaultValue: '已选择' }) || '已选择' : t('calendar_sync.brand_tap', { defaultValue: '点击查看步骤' }) || '点击查看步骤'}
                  </p>
                </div>
                {selectedBrand === brand.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* 品牌引导弹窗 - 完整的引导页面 */}
      <AnimatePresence>
        {showGuide && guide && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-background rounded-t-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl border-t border-outline-variant/10"
            >
              <div className="p-6">
                {/* Handle */}
                <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full mx-auto mb-6" />

                {/* 顶部导航栏 - 有关闭按钮 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${guide.brandColor || '#555555'}15` }}
                    >
                      {guide.brandLogo}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-on-surface">{guide.brand}</h2>
                      <p className="text-xs text-on-surface-variant font-bold">
                        {guide.supported ? (t('calendar_sync.supported', { defaultValue: '支持同步' }) || '支持同步') : (t('calendar_sync.limited', { defaultValue: '有限支持' }) || '有限支持')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeGuide}
                    className="w-10 h-10 rounded-full bg-surface-container dark:bg-surface-container-high flex items-center justify-center active:scale-95 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 方法选择 */}
                <div className="mb-6">
                  <h3 className="font-black text-on-surface mb-3 flex items-center gap-2">
                    <Smartphone size={18} className="text-primary" />
                    {t('calendar_sync.method_title', { defaultValue: '同步方式' }) || '同步方式'}
                  </h3>
                  
                  {/* 方法1: 订阅链接 */}
                  {subscriptions.length > 0 && (
                    <div className="bg-surface-container-low dark:bg-surface-container rounded-2xl p-4 mb-3">
                      <h4 className="font-black text-sm text-on-surface mb-2">
                        {t('calendar_sync.method_subscribe', { defaultValue: '方法一：订阅链接（推荐）' }) || '方法一：订阅链接（推荐）'}
                      </h4>
                      <p className="text-xs text-on-surface-variant font-bold mb-3">
                        {t('calendar_sync.method_subscribe_desc', { defaultValue: '自动同步，无需手动导入' }) || '自动同步，无需手动导入'}
                      </p>
                      {subscriptions.map((sub) => (
                        <>
                          {/* iOS 设备显示一键订阅按钮 */}
                          {detectedDevice.platform === 'iOS' && (
                            <button
                              key={`oneclick-${sub.id}`}
                              onClick={() => handleOneClickSubscribe(sub.token)}
                              className="w-full bg-green-500 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all mb-2"
                            >
                              <Smartphone size={14} />
                              {t('calendar_sync.one_click_subscribe', { defaultValue: '一键订阅' }) || '一键订阅'}
                            </button>
                          )}
                          <button
                            key={sub.id}
                            onClick={() => handleCopySubscribeLink(sub.token)}
                            className="w-full bg-primary/10 text-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all mb-2"
                          >
                            {copied === sub.token ? <Check size={14} /> : <Copy size={14} />}
                            {copied === sub.token ? (t('calendar_sync.copied', { defaultValue: '已复制' }) || '已复制') : (t('calendar_sync.copy_subscribe_link', { defaultValue: '复制订阅链接' }) || '复制订阅链接')}
                          </button>
                        </>
                      ))}
                    </div>
                  )}

                  {/* 方法2: 导出文件 */}
                  <div className="bg-surface-container-low dark:bg-surface-container rounded-2xl p-4">
                    <h4 className="font-black text-sm text-on-surface mb-2">
                      {t('calendar_sync.method_export', { defaultValue: '方法二：导出文件' }) || '方法二：导出文件'}
                    </h4>
                    <p className="text-xs text-on-surface-variant font-bold mb-3">
                      {t('calendar_sync.method_export_desc', { defaultValue: '手动导入，适合一次性同步' }) || '手动导入，适合一次性同步'}
                    </p>
                    <button
                      onClick={handleExportICS}
                      className="w-full bg-surface-container-highest dark:bg-surface-container-high py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Download size={14} />
                      {t('calendar_sync.export_ics', { defaultValue: '导出ICS' }) || '导出 .ics 文件'}
                    </button>
                  </div>
                </div>

                {/* 步骤 */}
                {guide.steps.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="font-black text-on-surface flex items-center gap-2">
                      <ExternalLink size={18} className="text-primary" />
                      {t('calendar_sync.steps_title', { defaultValue: '导入步骤' }) || '导入步骤'}
                    </h3>
                    <div className="space-y-3">
                      {guide.steps.map((step: string, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex gap-3 bg-surface-container-low dark:bg-surface-container rounded-2xl p-4"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm font-bold text-on-surface leading-relaxed pt-1">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 提示 */}
                {guide.tips.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-2xl p-4 mb-6 border border-yellow-200 dark:border-yellow-500/20">
                    <h4 className="font-black text-yellow-700 dark:text-yellow-400 text-sm mb-2">
                      {t('calendar_sync.tips_title', { defaultValue: '温馨提示' }) || '温馨提示'}
                    </h4>
                    <ul className="space-y-1.5">
                      {guide.tips.map((tip: string, idx: number) => (
                        <li key={idx} className="text-xs font-bold text-on-surface-variant leading-relaxed">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 关闭按钮 */}
                <button
                  onClick={closeGuide}
                  className="w-full bg-surface-container dark:bg-surface-container-high py-4 rounded-2xl font-black text-sm text-on-surface-variant active:scale-95 transition-all"
                >
                  {t('calendar_sync.close', { defaultValue: '关闭' }) || '关闭'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 导入弹窗 */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-surface-container rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-on-surface">{t('calendar_sync.import_ics', { defaultValue: '导入ICS' }) || '导入日历'}</h3>
                  <button 
                    onClick={() => setShowImportModal(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container dark:bg-surface-container-high transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 导入方式选择 */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setImportMethod('file')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      importMethod === 'file' 
                        ? 'bg-primary text-white' 
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {t('calendar_sync.import_file', { defaultValue: '文件导入' }) || '文件导入'}
                  </button>
                  <button
                    onClick={() => setImportMethod('url')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                      importMethod === 'url' 
                        ? 'bg-primary text-white' 
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {t('calendar_sync.import_url', { defaultValue: '链接导入' }) || '链接导入'}
                  </button>
                </div>

                {importMethod === 'file' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ics,.ical,.icalendar"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Upload size={18} />
                      {isImporting ? (t('calendar_sync.importing', { defaultValue: '导入中...' }) || '导入中...') : (t('calendar_sync.select_file', { defaultValue: '选择 .ics 文件' }) || '选择 .ics 文件')}
                    </button>
                    <p className="text-[10px] text-on-surface-variant/60 mt-3 text-center">
                      {t('calendar_sync.import_file_hint', { defaultValue: '支持 .ics、.ical 格式' }) || '支持 .ics、.ical 格式'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-4">
                      <input 
                        type="url"
                        placeholder={t('calendar_sync.import_url_placeholder', { defaultValue: '粘贴日历订阅链接...' }) || '粘贴日历订阅链接...'}
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        className="w-full bg-surface-container rounded-xl p-4 pr-12 font-bold text-xs outline-none transition-all placeholder:text-on-surface-variant/30 border border-outline-variant/20 focus:border-primary"
                      />
                    </div>
                    <button
                      onClick={() => {
                        alert(t('calendar_sync.coming_soon', { defaultValue: '即将推出' }) || '即将推出');
                      }}
                      disabled={!importUrl}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Link size={18} />
                      {t('calendar_sync.import_from_url', { defaultValue: '从链接导入' }) || '从链接导入'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
