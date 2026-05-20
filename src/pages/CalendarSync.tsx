import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Download, Smartphone, ChevronRight, Check, Copy, 
  ExternalLink, Calendar, Plus, Trash2, Upload,
  Link, X, Sparkles, ShieldCheck, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useFamily } from '../context/FamilyContext';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { AppModal } from '../components/AppModal';
import { showToastGlobal } from '../components/Toast';
import { generateICSFile, downloadICS, getCalendarSyncGuide, type CalendarSyncGuide } from '../lib/voiceAssistant';
import { cn } from '../lib/utils';
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 设备检测
function detectDevice(): { brand: string; platform: string } {
  const ua = navigator.userAgent;
  
  // 检测平台
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { brand: 'Apple', platform: 'iOS' };
  }
  
  if (/Android/i.test(ua)) {
    // 尝试检测 Android 设备品牌
    if (/HUAWEI|HONOR/i.test(ua)) {
      if (/HONOR/i.test(ua)) {
        return { brand: '荣耀', platform: 'Android' };
      }
      return { brand: '华为', platform: 'Android' };
    }
    if (/Xiaomi|Redmi|POCO/i.test(ua)) {
      return { brand: '小米', platform: 'Android' };
    }
    if (/OPPO/i.test(ua)) {
      return { brand: 'OPPO', platform: 'Android' };
    }
    if (/vivo/i.test(ua)) {
      return { brand: 'vivo', platform: 'Android' };
    }
    if (/Samsung/i.test(ua)) {
      return { brand: '三星', platform: 'Android' };
    }
    // 通用 Android
    return { brand: '通用', platform: 'Android' };
  }
  
  if (/Macintosh|Mac OS/i.test(ua)) {
    return { brand: 'Apple', platform: 'macOS' };
  }
  
  if (/Windows/i.test(ua)) {
    return { brand: '通用', platform: 'Windows' };
  }
  
  return { brand: '通用', platform: '未知' };
}

// 品牌标识组件：统一使用简洁字标，避免临时图形和真实品牌图标混用造成观感不一致。
function BrandLogo({ brand, size = 32 }: { brand: string; size?: number }) {
  const logos: Record<string, React.ReactNode> = {
    Apple: <span className="ui-brand-wordmark ui-brand-wordmark-apple">Apple</span>,
    华为: <span className="ui-brand-wordmark ui-brand-wordmark-huawei">HUAWEI</span>,
    荣耀: <span className="ui-brand-wordmark ui-brand-wordmark-honor">HONOR</span>,
    小米: <span className="ui-brand-wordmark ui-brand-wordmark-xiaomi">MI</span>,
    OPPO: <span className="ui-brand-wordmark ui-brand-wordmark-oppo">OPPO</span>,
    vivo: <span className="ui-brand-wordmark ui-brand-wordmark-vivo">vivo</span>,
    三星: <span className="ui-brand-wordmark ui-brand-wordmark-samsung">SAMSUNG</span>,
    通用: <span className="ui-brand-wordmark ui-brand-wordmark-generic">OTHER</span>,
  };
  
  return <span style={{ width: size, height: size }} className="inline-flex items-center justify-center overflow-hidden text-current">{logos[brand] || logos['通用']}</span>;
}

const BRANDS = [
  { id: 'Apple', toneClass: 'bg-surface-container-low text-on-surface', name: 'Apple / iOS' },
  { id: '华为', toneClass: 'bg-surface-container-low text-on-surface', name: '华为' },
  { id: '荣耀', toneClass: 'bg-primary/10 text-primary', name: '荣耀' },
  { id: '小米', toneClass: 'bg-primary/10 text-primary', name: '小米' },
  { id: 'OPPO', toneClass: 'bg-primary/10 text-primary-text', name: 'OPPO' },
  { id: 'vivo', toneClass: 'bg-primary/10 text-primary', name: 'vivo' },
  { id: '三星', toneClass: 'bg-surface-container-low text-on-surface', name: '三星' },
  { id: '通用', toneClass: 'bg-surface-container-low text-outline', name: '其他品牌' },
];

const BRAND_TRANSLATION_KEYS: Record<string, string> = {
  Apple: 'apple',
  华为: 'huawei',
  荣耀: 'honor',
  小米: 'xiaomi',
  OPPO: 'oppo',
  vivo: 'vivo',
  三星: 'samsung',
  通用: 'other',
};

export function CalendarSync() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tasks, members, currentUser, familyId, guestMode } = useFamily();
  
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
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [lastSyncText, setLastSyncText] = useState<string | null>(() => {
    try {
      return window.localStorage?.getItem('wishcard_last_calendar_sync_text') || null;
    } catch {
      return null;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTasks = tasks.filter(t => !t.isHabit && t.status !== 'completed');
  const guide = selectedBrand ? getCalendarSyncGuide(selectedBrand) : null;
  const canUseCalendarSubscription = Boolean(familyId && !guestMode && UUID_PATTERN.test(familyId));
  const isNativeApp = Capacitor.isNativePlatform();
  const upcomingTasks = activeTasks.slice(0, 30);
  const getBrandDisplayName = (brand: string) => {
    const key = BRAND_TRANSLATION_KEYS[brand] || 'other';
    return t(`calendar_sync.brand_names.${key}`, { defaultValue: brand });
  };

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
    if (canUseCalendarSubscription) {
      loadSubscriptions();
      return;
    }
    setSubscriptions([]);
  }, [canUseCalendarSubscription]);

  const loadSubscriptions = async () => {
    if (!canUseCalendarSubscription) return;
    try {
      const data = await api.getCalendarSubscriptions(familyId!);
      setSubscriptions(data || []);
    } catch (error) {
      console.error('加载订阅失败:', error);
    }
  };

  // 创建订阅
  const handleCreateSubscription = async () => {
    if (!canUseCalendarSubscription) {
      showToastGlobal(t('calendar_sync.guest_subscription_unavailable', { defaultValue: '体验模式暂不支持在线订阅，可先导出 ICS 文件' }), 'info');
      return;
    }
    try {
      const newSub = await api.createCalendarSubscription(familyId!, {
        name: t('calendar_sync.subscription_name', {
          defaultValue: '{{brand}} 订阅 {{count}}',
          brand: getBrandDisplayName(detectedDevice.brand),
          count: subscriptions.length + 1,
        }),
      });
      setSubscriptions([...subscriptions, newSub]);
    } catch (error: any) {
      showToastGlobal(t('calendar_sync.create_failed', { defaultValue: '创建失败: {{message}}', message: error.message }), 'error');
    }
  };

  // 删除订阅
  const handleDeleteSubscription = async (id: string) => {
    if (!canUseCalendarSubscription) return;
    if (!confirm(t('calendar_sync.confirm_delete', { defaultValue: '确认删除' }) || '确定要删除此订阅吗？')) {
      return;
    }
    try {
      await api.deleteCalendarSubscription(id);
      setSubscriptions(subscriptions.filter(s => s.id !== id));
    } catch (error: any) {
      showToastGlobal(t('calendar_sync.delete_failed', { defaultValue: '删除失败: {{message}}', message: error.message }), 'error');
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
    showToastGlobal(t('calendar_sync.copied_then_open_calendar', { defaultValue: '链接已复制！请在手机日历App中粘贴此链接' }) || '链接已复制！请在手机日历App中粘贴此链接', 'success');
  };

  // 导出 ICS 文件
  const handleExportICS = () => {
    setIsExporting(true);
    try {
      const ics = generateICSFile(
        tasks.filter(t => !t.isHabit),
        members,
        t('welcome.title', { defaultValue: '星愿卡' })
      );
      downloadICS(ics, `wishcard-${new Date().toISOString().split('T')[0]}.ics`);
    } catch (error) {
      console.error('导出 ICS 失败:', error);
      showToastGlobal(t('calendar_sync.export_failed', { defaultValue: '导出失败，请重试' }), 'error');
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
          showToastGlobal(t('calendar_sync.no_events', { defaultValue: '未找到可导入的事件' }) || '未找到可导入的事件', 'warning');
          return;
        }

        if (confirm(t('calendar_sync.import_confirm', { defaultValue: '发现 {{count}} 个事件，是否导入为任务？', count: events.length }))) {
          for (const event of events) {
            await api.createTask(
              familyId!,
              event.summary,
              event.description,
              0,
              [currentUser?.id || ''],
              currentUser?.id || '',
              { icon: 'Calendar' }
            );
          }
          showToastGlobal(t('calendar_sync.import_success', { defaultValue: '成功导入 {{count}} 个事件', count: events.length }), 'success');
        }
      } catch (error: any) {
        showToastGlobal(t('calendar_sync.import_failed', { defaultValue: '导入失败: {{message}}', message: error.message }), 'error');
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

  const saveLastSyncText = (text: string) => {
    setLastSyncText(text);
    try {
      window.localStorage?.setItem('wishcard_last_calendar_sync_text', text);
    } catch {
      // localStorage may be unavailable in embedded runtimes.
    }
  };

  const handleOneTapCalendarSync = async () => {
    if (upcomingTasks.length === 0) {
      showToastGlobal(t('calendar_sync.no_active_tasks', { defaultValue: '目前没有可同步的待办日程' }), 'info');
      return;
    }

    setIsExporting(true);
    try {
      if (canUseCalendarSubscription) {
        let subscription = subscriptions.find((sub) => sub.is_active);
        if (!subscription) {
          subscription = await api.createCalendarSubscription(familyId!, {
            name: t('calendar_sync.default_auto_subscription', { defaultValue: 'WishCard 家庭日历' }),
          });
          setSubscriptions((prev) => [...prev, subscription!]);
        }

        await handleOneClickSubscribe(subscription.token);
        const text = t('calendar_sync.synced_subscription_status', {
          defaultValue: '已为 {{count}} 项待办生成自动同步入口',
          count: upcomingTasks.length,
        });
        saveLastSyncText(text);
        return;
      }

      const ics = generateICSFile(
        upcomingTasks,
        members,
        t('welcome.title', { defaultValue: '星愿卡' })
      );
      downloadICS(ics, `wishcard-calendar-${new Date().toISOString().split('T')[0]}.ics`);
      const fallbackText = isNativeApp
        ? t('calendar_sync.native_bridge_pending_status', {
            defaultValue: '已生成日历文件；下一步接入原生日历权限后会自动写入系统日历',
          })
        : t('calendar_sync.downloaded_status', {
            defaultValue: '已下载日历文件；Web 环境需由系统日历打开确认',
          });
      saveLastSyncText(fallbackText);
      showToastGlobal(fallbackText, 'success');
    } catch (error: any) {
      showToastGlobal(t('calendar_sync.one_tap_failed', {
        defaultValue: '同步失败：{{message}}',
        message: error?.message || t('common.unknown_error', { defaultValue: '未知错误' }),
      }), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <TopAppBar
        title={t('calendar_sync.title', { defaultValue: '日历同步' })}
      />

      <div className="px-6 space-y-5 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.75rem] border border-primary/10 bg-surface p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
              <Calendar size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-primary">
                {isNativeApp
                  ? t('calendar_sync.native_ready', { defaultValue: 'App 内一键同步' })
                  : t('calendar_sync.web_ready', { defaultValue: '自动选择最省事的同步方式' })}
              </p>
              <h2 className="mt-1 text-xl font-black text-on-surface">
                {t('calendar_sync.one_tap_title', { defaultValue: '同步到手机日历' })}
              </h2>
              <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface-variant">
                {t('calendar_sync.one_tap_desc', {
                  defaultValue: '自动读取家庭任务和时间安排，能授权就直接同步，受限环境才使用备用日历文件。',
                })}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-primary/5 p-3">
              <p className="text-[10px] font-black text-on-surface-variant/60">{t('calendar_sync.sync_items', { defaultValue: '可同步' })}</p>
              <p className="mt-1 text-lg font-black text-on-surface">{upcomingTasks.length}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 p-3">
              <p className="text-[10px] font-black text-on-surface-variant/60">{t('calendar_sync.detected_platform', { defaultValue: '当前设备' })}</p>
              <p className="mt-1 truncate text-sm font-black text-primary">{detectedDevice.platform}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 p-3">
              <p className="text-[10px] font-black text-on-surface-variant/60">{t('calendar_sync.sync_method', { defaultValue: '方式' })}</p>
              <p className="mt-1 text-sm font-black text-primary">
                {canUseCalendarSubscription ? t('calendar_sync.auto_subscribe_short', { defaultValue: '自动' }) : t('calendar_sync.local_short', { defaultValue: '本地' })}
              </p>
            </div>
          </div>

          {lastSyncText && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-primary-container/25 p-3 text-xs font-bold leading-relaxed text-primary">
              <Check size={16} className="mt-0.5 shrink-0" />
              <span>{lastSyncText}</span>
            </div>
          )}

          <button
            onClick={handleOneTapCalendarSync}
            disabled={isExporting || upcomingTasks.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-45"
          >
            {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {isExporting
              ? t('calendar_sync.syncing', { defaultValue: '正在同步...' })
              : t('calendar_sync.one_tap_button', { defaultValue: '一键同步' })}
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold text-on-surface-variant/60">
            <ShieldCheck size={13} />
            <span>{t('calendar_sync.privacy_hint', { defaultValue: '只同步任务标题、时间和家庭成员昵称，不上传额外隐私。' })}</span>
          </div>
        </motion.div>

        <div className="rounded-[1.75rem] border border-outline-variant/5 bg-white p-5 shadow-sm dark:bg-surface-container-low">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-on-surface">
                {t('calendar_sync.preview_title', { defaultValue: '将同步这些安排' })}
              </h2>
              <p className="mt-1 text-xs font-bold text-on-surface-variant/60">
                {t('calendar_sync.preview_desc', { defaultValue: '默认同步未来待办，不需要逐项配置。' })}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              {upcomingTasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {upcomingTasks.slice(0, 4).map((task) => {
              const owner = members.find((member) => task.assigneeIds?.includes(member.id));
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 dark:bg-surface-container">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-surface-container-low">
                    <Calendar size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-on-surface">{task.title}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60">
                      {task.reminderTime || (task.startTime ? new Date(task.startTime).toLocaleString() : t('calendar_sync.no_time', { defaultValue: '暂未设置时间' }))}
                      {owner ? ` · ${owner.name}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            {upcomingTasks.length === 0 && (
              <div className="rounded-2xl bg-surface-container-low p-5 text-center text-xs font-bold text-on-surface-variant/60">
                {t('calendar_sync.empty_preview', { defaultValue: '暂无可同步的待办。创建带时间的任务后，这里会自动出现。' })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-outline-variant/5 bg-white p-4 shadow-sm dark:bg-surface-container-low">
          <button
            type="button"
            onClick={() => setShowAdvancedSync((value) => !value)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-1 py-1 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-low text-primary">
                <Smartphone size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-on-surface">
                  {t('calendar_sync.advanced_title', { defaultValue: '高级/备用方式' })}
                </h2>
                <p className="mt-0.5 text-[10px] font-bold text-on-surface-variant/60">
                  {t('calendar_sync.advanced_desc', { defaultValue: '只有一键同步失败或要迁移日历时才需要打开。' })}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className={cn('shrink-0 text-on-surface-variant/40 transition-transform', showAdvancedSync && 'rotate-90')} />
          </button>

          {showAdvancedSync && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportICS}
                  disabled={isExporting || activeTasks.length === 0}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low py-3 text-xs font-black text-on-surface shadow-sm transition-all active:scale-95 disabled:opacity-50 dark:bg-surface-container"
                >
                  <Download size={16} />
                  {isExporting ? t('calendar_sync.exporting', { defaultValue: '导出中...' }) : t('calendar_sync.export_ics', { defaultValue: '导出ICS' })}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low py-3 text-xs font-black text-on-surface shadow-sm transition-all active:scale-95 dark:bg-surface-container"
                >
                  <Upload size={16} />
                  {t('calendar_sync.import_ics', { defaultValue: '导入ICS' })}
                </button>
              </div>

              <div className="rounded-2xl bg-surface-container-low p-4 dark:bg-surface-container">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-black text-on-surface">
                    <Link size={16} className="text-primary" />
                    {t('calendar_sync.subscriptions', { defaultValue: '订阅管理' }) || '订阅管理'}
                  </h3>
                  <button
                    onClick={handleCreateSubscription}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-all active:scale-95"
                    aria-label={t('calendar_sync.create_subscription', { defaultValue: '创建订阅' })}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {subscriptions.length === 0 ? (
                  <p className="py-3 text-center text-xs font-bold text-on-surface-variant/60">
                    {t('calendar_sync.subscription_auto_hint', { defaultValue: '一键同步时会自动创建订阅，无需手动配置。' })}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="rounded-2xl bg-white p-3 dark:bg-surface-container-low">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-black text-on-surface">{sub.name}</span>
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => handleCopySubscribeLink(sub.token)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-container-low py-2 text-xs font-bold transition-all active:scale-95 dark:bg-surface-container"
                        >
                          {copied === sub.token ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          {copied === sub.token ? t('calendar_sync.copied', { defaultValue: '已复制' }) : t('calendar_sync.copy_link', { defaultValue: '复制链接' })}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => openGuide(detectedDevice.brand)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-container-low py-3 text-xs font-black text-on-surface transition-all active:scale-95 dark:bg-surface-container"
              >
                <ExternalLink size={15} />
                {t('calendar_sync.view_manual_guide', { defaultValue: '查看手动导入步骤' })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 品牌引导弹窗 - 完整的引导页面 */}
      <AnimatePresence>
        {showGuide && guide && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-background rounded-t-[2.5rem] max-h-[90svh] overflow-y-auto shadow-2xl border-t border-outline-variant/10 pb-[env(safe-area-inset-bottom,0px)]"
            >
              <div className="p-6">
                {/* Handle */}
                <div className="w-12 h-1.5 bg-on-surface-variant/20 rounded-full mx-auto mb-6" />

                {/* 顶部导航栏 - 有关闭按钮 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-surface-container-low px-2 text-primary">
                      <BrandLogo brand={guide.brand} size={guide.brand === 'Apple' || guide.brand === '小米' || guide.brand === '通用' ? 30 : 54} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-on-surface">{getBrandDisplayName(guide.brand)}</h2>
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
                        <React.Fragment key={sub.id}>
                          {/* iOS 设备显示一键订阅按钮 */}
                          {detectedDevice.platform === 'iOS' && (
                            <button
                              onClick={() => handleOneClickSubscribe(sub.token)}
                              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition-all active:scale-95"
                            >
                              <Smartphone size={14} />
                              {t('calendar_sync.one_click_subscribe', { defaultValue: '一键订阅' }) || '一键订阅'}
                            </button>
                          )}
                          <button
                            onClick={() => handleCopySubscribeLink(sub.token)}
                            className="w-full bg-primary/10 text-primary py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all mb-2"
                          >
                            {copied === sub.token ? <Check size={14} /> : <Copy size={14} />}
                            {copied === sub.token ? (t('calendar_sync.copied', { defaultValue: '已复制' }) || '已复制') : (t('calendar_sync.copy_subscribe_link', { defaultValue: '复制订阅链接' }) || '复制订阅链接')}
                          </button>
                        </React.Fragment>
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
                  <div className="mb-6 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <h4 className="mb-2 text-sm font-black text-primary">
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
          <AppModal
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            title={t('calendar_sync.import_ics', { defaultValue: '导入日历' }) || '导入日历'}
            surface="center"
            zIndexClass="z-[120]"
            bodyClassName="px-6 py-5"
          >

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
                        showToastGlobal(t('calendar_sync.coming_soon', { defaultValue: '即将推出' }) || '即将推出', 'info');
                      }}
                      disabled={!importUrl}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Link size={18} />
                      {t('calendar_sync.import_from_url', { defaultValue: '从链接导入' }) || '从链接导入'}
                    </button>
                  </div>
                )}
          </AppModal>
        )}
      </AnimatePresence>
    </div>
  );
}
