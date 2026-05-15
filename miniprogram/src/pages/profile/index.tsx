import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser } from '@/utils/localUser';
import { resolveAvatarPath } from '@/lib/templates';
import { getGuestData, isGuestMode } from '@/lib/guestData';
import Icon from '@/components/Icon';
import { NotificationBell, NotificationPanel } from '@/components/NotificationCenter';
import { APP_RELEASE_DATE, APP_VERSION, APP_VERSION_LABEL } from '@/lib/appMeta';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

// 对齐 Web 端 Profile.tsx (462行) 完整功能清单
export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  // 导入导出弹窗状态
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{ time: string; count: string } | null>(null);
  // 通知中心面板（对齐Web版 NotificationPanel: 铃铛按钮→侧滑面板）
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => { initData(); }, []);

  const initData = async () => {
    setLoading(true);
    try {
      // 优先本地缓存（对齐 Web 的 useFamily / getLocalUser）
      const localUser = getLocalUser();
      if (localUser?.id) {
        setUser(localUser);
        setDarkMode(!!localUser.darkMode);
        if (localUser.family_id) await fetchMembers(localUser.family_id);
      } else {
        // fallback: Supabase Auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data } = await supabase.from('members').select('*').eq('id', authUser.id).single();
          if (data) {
            setUser(data);
            setDarkMode(!!data.dark_mode);
            if (data.family_id) await fetchMembers(data.family_id);
          }
        }
      }
    } catch (err) {
      console.error('[Profile] init error:', err);
    }
    setLoading(false);
  };

  const fetchMembers = async (familyId: string) => {
    if (!familyId || familyId === 'guest-family' || familyId === 'demo-family' || isGuestMode()) {
      setMembers(getGuestData().members || []);
      return;
    }
    try {
      const { data } = await supabase.from('members').select('*').eq('family_id', familyId);
      setMembers(Array.isArray(data) ? data : []);
    } catch {}
  };

  // ===== 对齐 Web: 导出 JSON 备份 =====
  const handleExport = async () => {
    if (!user?.family_id || user.family_id === 'guest-family') {
      Taro.showToast({ title: '请先登录', icon: 'none' }); return;
    }
    setExporting(true);
    Taro.showLoading({ title: '导出中...' });
    try {
      const [tasksRes, rewardsRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', user.family_id),
        supabase.from('rewards').select('*').eq('family_id', user.family_id),
        supabase.from('members').select('*').eq('family_id', user.family_id),
      ]);
      const data = {
        version: '1.0', exportTime: new Date().toISOString(),
        tasks: tasksRes.data || [], rewards: rewardsRes.data || [], members: membersRes.data || [],
      };
      Taro.setStorageSync('wishcard_backup', JSON.stringify(data));
      setBackupInfo({
        time: new Date().toLocaleString('zh-CN'),
        count: `任务 ${data.tasks.length} · 心愿 ${data.rewards.length}`,
      });
      Taro.hideLoading();
      Taro.showToast({ title: '导出成功', icon: 'success' });
    } catch {
      Taro.hideLoading();
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
    setExporting(false);
  };

  // ===== 对齐 Web: 分享链接生成 =====
  const handleShare = () => {
    try {
      const shareData = JSON.stringify({ familyId: user?.family_id, exportTime: Date.now() });
      const encoded = btoa(unescape(encodeURIComponent(shareData)));
      Taro.setClipboardData({
        data: `https://wishcard.app/share/${encoded}`,
        success: () => Taro.showToast({ title: '链接已复制', icon: 'success' }),
      });
    } catch {
      Taro.showToast({ title: '生成失败', icon: 'none' });
    }
  };

  // ===== 对齐 Web: 退出登录确认 =====
  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出当前账户吗？',
      confirmColor: '#e53935',
      success: async (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('guest_user');
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.warn('[Profile] remote signOut skipped:', err);
          }
          Taro.reLaunch({ url: '/pages/login/index' });
        }
      },
    });
  };

  // 菜单项配置（对齐 Web 端菜单组1+2）
  const menuGroup1 = [
    { icon: 'shield', label: '账号安全', route: '/pkg/settings/security/index', color: '#006e1c' },
    { icon: 'download', label: '数据备份', action: () => setShowBackupModal(true), color: '#1976D2' },
    { icon: 'calendar', label: '日历同步', route: '/pkg/settings/calendar/index', color: '#7B1FA2' },
    { icon: 'bell', label: '消息通知', route: '/pkg/settings/notifications/index', color: '#F57C00' },
    { icon: 'messageSquare', label: '意见反馈', route: '/pkg/settings/feedback/index', color: '#0288D1' },
  ];

  const menuGroupAi = [
    { icon: 'sparkles', label: 'AI分析与建档', route: '/pkg/ai-analysis/index', color: '#006e1c' },
    { icon: 'barChart', label: '家庭复盘', route: '/pkg/reports/index', color: '#1976D2' },
    { icon: 'calendar', label: '日程方案', route: '/pkg/schedule-recommend/index', color: '#0288D1' },
    { icon: 'users', label: '家庭社区', route: '/pkg/community/templates/index', color: '#0f8f43' },
    { icon: 'target', label: '四象限分析', route: '/pkg/quadrant/index', color: '#F57C00' },
    { icon: 'globe', label: '公共时间与校历', route: '/pkg/calendar/index', color: '#0288D1' },
    { icon: 'settings2', label: 'AI助手设置', route: '/pkg/settings/ai/index', color: '#7B1FA2' },
  ];

  if (loading) {
    return (
      <View className={`profile-page ${getThemeClass()}`}>
        <View className="profile-loading"><Icon name="loader-2" size={48} color="#006e1c" /><Text>加载中...</Text></View>
      </View>
    );
  }

  return (
    <View className={`profile-page ${getThemeClass()} ${darkMode ? 'dark-mode' : ''}`}>
      <ScrollView scrollY enhanced className="profile-scroll">
        {/* ===== Header (对齐Web: 头像+标题"我的"+通知铃铛) ===== */}
        <View className="profile-header">
          <Text className="profile-title">我的</Text>
          <View className="profile-header-actions">
            <NotificationBell onClick={() => setShowNotifPanel(true)} />
          </View>
        </View>

        {/* ===== Hero区域 (对齐Web: 大头像144px+编辑按钮悬浮+昵称+角色Badge) ===== */}
        <View className="profile-hero">
          <View className="hero-avatar-wrap" onClick={() => Taro.navigateTo({ url: '/pkg/profile/edit/index' })}>
            <Image
              className="hero-avatar"
              src={resolveAvatarPath(user?.avatar || '')}
              mode="aspectFill"
            />
            <View className="hero-edit-btn">
              <Icon name="edit" size={20} color="#ffffff" />
            </View>
          </View>
          <Text className="hero-name">{user?.name || '未设置昵称'}</Text>
          {user?.role === 'parent' && (
            <View className="role-badge parent"><Text>家长</Text></View>
          )}
          {user?.role === 'child' && (
            <View className="role-badge child"><Text>孩子</Text></View>
          )}
          <View className="profile-version-badge">
            <Text>{APP_VERSION_LABEL} · {APP_RELEASE_DATE}</Text>
          </View>
        </View>

        {/* ===== 家庭成员 (对齐Web: 横向滚动卡片+头像+名字+星星+当前用户高亮) ===== */}
        <View className="section-block">
          <View className="section-header">
            <Text className="section-title">家庭成员</Text>
            <View className="section-add-btn" onClick={() => Taro.navigateTo({ url: '/pkg/members/add/index' })}>
              <Icon name="plus" size={24} color="#006e1c" />
            </View>
          </View>
          <ScrollView scrollX enhanced className="members-scroll">
            {(members || []).map(m => (
              <View
                key={m.id}
                className={`member-card ${m.id === user?.id ? 'current-user' : ''}`}
                onClick={() => m.id !== user?.id && Taro.navigateTo({ url: `/pkg/members/detail/index?id=${m.id}` })}
              >
                <Image className="member-avatar" src={resolveAvatarPath(m.avatar || '')} mode="aspectFill" />
                <Text className="member-name">{m.name}</Text>
                <View className="member-stars">
                  <Icon name="star" size={22} color="#F9A825" />
                  <Text className="member-star-num">{m.stars || 0}</Text>
                </View>
                {m.id === user?.id && <View className="current-tag"><Text>我</Text></View>}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ===== AI能力入口：建档 / 复盘 / 日程 / 四象限 ===== */}
        <View className="section-block">
          {menuGroupAi.map((item, idx) => (
            <View
              key={idx}
              className="menu-item"
              onClick={() => Taro.navigateTo({ url: item.route })}
            >
              <View className="menu-icon-wrap" style={{ backgroundColor: `${item.color}15` }}>
                <Icon name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text className="menu-label">{item.label}</Text>
              <Icon name="chevronRight" size={28} color="#becab9" />
            </View>
          ))}
        </View>

        {/* ===== 菜单组1 (安全/备份/日历同步/通知/反馈) ===== */}
        <View className="section-block">
          {menuGroup1.map((item, idx) => (
            <View
              key={idx}
              className="menu-item"
              onClick={() => item.route ? Taro.navigateTo({ url: item.route }) : item.action?.()}
            >
              <View className="menu-icon-wrap" style={{ backgroundColor: `${item.color}15` }}>
                <Icon name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text className="menu-label">{item.label}</Text>
              <Icon name="chevronRight" size={28} color="#becab9" />
            </View>
          ))}
        </View>

        {/* ===== 菜单组2: 深色模式Toggle + 基础设置 ===== */}
        <View className="section-block">
          {/* 深色模式 Toggle — 必须使用 div[role=switch] 模板 (memory ID: 31560453) */}
          <View className="menu-item">
            <View className="menu-icon-wrap" style={{ backgroundColor: '#3f4a3c15' }}>
              <Icon name="moon" size={32} color="#3f4a3c" />
            </View>
            <Text className="menu-label">深色模式</Text>
            <View
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                // 持久化到本地
                const stored = Taro.getStorageSync('guest_user');
                if (stored) {
                  const u = JSON.parse(stored);
                  u.darkMode = next;
                  Taro.setStorageSync('guest_user', JSON.stringify(u));
                }
                Taro.showToast({ title: next ? '已开启深色模式' : '已关闭深色模式', icon: 'none' });
              }}
              style={{
                width: 48, height: 28, borderRadius: 9999, padding: 4,
                display: 'flex', alignItems: 'center',
                backgroundColor: darkMode ? '#4CAF50' : '#E5E7EB',
                border: 'none',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                outline: 'none', flexShrink: 0,
              }}
            >
              <View
                style={{
                  width: 20, height: 20, backgroundColor: 'white',
                  borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0,
                  transform: `translateX(${darkMode ? 20 : 0}px)`,
                  transition: 'transform 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)',
                }}
              />
            </View>
          </View>

          <View className="menu-item" onClick={() => Taro.navigateTo({ url: '/pkg/settings/basic/index' })}>
            <View className="menu-icon-wrap" style={{ backgroundColor: '#75757515' }}>
              <Icon name="settings" size={32} color="#757575" />
            </View>
            <Text className="menu-label">基础设置与主题皮肤</Text>
            <Icon name="chevronRight" size={28} color="#becab9" />
          </View>
        </View>

        {/* ===== 退出登录 (红色按钮，居中) ===== */}
        <View className="logout-section">
          <View className="logout-btn" onClick={handleLogout}>
            <Icon name="logOut" size={32} color="#e53935" />
            <Text className="logout-text">退出登录</Text>
          </View>
        </View>

        <View style={{ height: '80rpx' }} />
      </ScrollView>

      {/* ===== 导入导出弹窗 (对齐Web: 全屏Modal) ===== */}
      {showBackupModal && (
        <View className="backup-modal-mask" onClick={() => setShowBackupModal(false)}>
          <View className="backup-modal" onClick={(e) => e.stopPropagation()}>
            <View className="bm-header">
              <Text className="bm-title">数据备份与分享</Text>
              <View className="bm-close" onClick={() => setShowBackupModal(false)}>
                <Icon name="x" size={32} color="#3f4a3c" />
              </View>
            </View>

            <ScrollView scrollY className="bm-body">
              {/* 备份信息 */}
              {backupInfo ? (
                <View className="bm-info-card">
                  <Text className="bm-info-label">最近备份时间</Text>
                  <Text className="bm-info-value">{backupInfo.time}</Text>
                  <Text className="bm-info-count">{backupInfo.count}</Text>
                </View>
              ) : (
                <View className="bm-empty-state">
                  <Icon name="cloud-off" size={64} color="#becab9" />
                  <Text className="bm-empty-text">暂无备份记录</Text>
                </View>
              )}

              {/* 操作按钮区 */}
              <View className="bm-actions">
                <View
                  className={`bm-action-btn primary ${exporting ? 'disabled' : ''}`}
                  onClick={() => !exporting && handleExport()}
                >
                  <Icon name="download" size={36} color="#ffffff" />
                  <View className="bm-action-info">
                    <Text className="bm-action-title">{exporting ? '导出中...' : '导出备份数据'}</Text>
                    <Text className="bm-action-desc">将任务、心愿、成员信息保存到本地</Text>
                  </View>
                </View>

                <View className="bm-action-btn secondary" onClick={handleShare}>
                  <Icon name="share2" size={36} color="#006e1c" />
                  <View className="bm-action-info">
                    <Text className="bm-action-title">复制分享链接</Text>
                    <Text className="bm-action-desc">生成可分享的家庭数据链接</Text>
                  </View>
                </View>

                <View
                  className="bm-action-btn warning"
                  onClick={() => {
                    Taro.showModal({
                      title: '导入数据',
                      content: '将从本地备份恢复，是否继续？',
                      success: async (res) => {
                        if (!res.confirm) return;
                        Taro.showLoading({ title: '导入中...' });
                        try {
                          const backupStr = Taro.getStorageSync('wishcard_backup');
                          if (!backupStr) throw new Error('无备份数据');
                          const data = JSON.parse(backupStr);
                          let count = 0;
                          for (const t of data.tasks || []) {
                            const { error } = await supabase.from('tasks').upsert(t, { onConflict: 'id' });
                            if (!error) count++;
                          }
                          for (const r of data.rewards || []) await supabase.from('rewards').upsert(r, { onConflict: 'id' });
                          for (const m of data.members || []) await supabase.from('members').upsert(m, { onConflict: 'id' });
                          Taro.hideLoading();
                          Taro.showToast({ title: `导入成功！${count}条`, icon: 'success' });
                          setShowBackupModal(false);
                        } catch (e: any) {
                          Taro.hideLoading();
                          Taro.showToast({ title: e.message || '导入失败', icon: 'none' });
                        }
                      },
                    });
                  }}
                >
                  <Icon name="upload" size={36} color="#F57C00" />
                  <View className="bm-action-info">
                    <Text className="bm-action-title">导入备份数据</Text>
                    <Text className="bm-action-desc">从本地备份文件恢复数据</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
      {/* 通知中心面板（对齐Web版 NotificationPanel） */}
      <NotificationPanel visible={showNotifPanel} onClose={() => setShowNotifPanel(false)} />
    </View>
  );
}
