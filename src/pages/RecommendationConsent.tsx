import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, GraduationCap, HeartPulse, Lock, Map, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import { useFamily } from '../context/FamilyContext';
import {
  DEFAULT_RECOMMENDATION_CONSENT,
  RECOMMENDATION_CATEGORY_DEFINITIONS,
  buildRecommendationTransparencySummary,
  getRecommendationConsent,
  saveRecommendationConsent,
  type RecommendationCategory,
  type RecommendationConsentState,
} from '../lib/recommendationConsent';
import { getRecommendationEventCounts, getRecommendationEventTypeCounts, removeAllRecommendationEvents, type RecommendationEventType } from '../lib/recommendationEvents';
import { buildDefaultRecommendationCandidates, buildRecommendationGateway } from '../lib/recommendationGateway';
import { syncRecommendationPrivacyData } from '../lib/recommendationSync';

const CONSENT_ITEMS: Array<{
  id: RecommendationCategory;
  title: string;
  desc: string;
  icon: LucideIcon;
}> = [
  {
    id: 'education',
    title: '教育产品与活动',
    desc: '课程、训练营、学习工具、亲子活动',
    icon: GraduationCap,
  },
  {
    id: 'travel',
    title: '假期旅行与营地',
    desc: '寒暑假路线、亲子游、冬夏令营',
    icon: Map,
  },
  {
    id: 'healthcare',
    title: '健康与就医建议',
    desc: '儿童健康提醒、就医路径、护理安排',
    icon: HeartPulse,
  },
];

const EVENT_TYPE_LABELS: Record<RecommendationEventType, string> = {
  impression: '展示',
  click: '点击',
  dismiss: '关闭',
  conversion: '转化',
};

export function RecommendationConsent() {
  const navigate = useNavigate();
  const { currentUser, familyId, syncStatus } = useFamily();
  const [consent, setConsent] = useState<RecommendationConsentState>(DEFAULT_RECOMMENDATION_CONSENT);
  const [eventCounts, setEventCounts] = useState<Record<RecommendationCategory, number>>({
    education: 0,
    travel: 0,
    healthcare: 0,
  });
  const [eventTypeCounts, setEventTypeCounts] = useState<Record<RecommendationEventType, number>>({
    impression: 0,
    click: 0,
    dismiss: 0,
    conversion: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadConsent() {
      const [result, counts] = await Promise.all([
        getRecommendationConsent(),
        getRecommendationEventCounts(),
      ]);
      const typeCounts = await getRecommendationEventTypeCounts();
      if (!active) return;
      setConsent(result);
      setEventCounts(counts);
      setEventTypeCounts(typeCounts);
      setLoading(false);
    }
    loadConsent();
    return () => { active = false; };
  }, []);

  const enabledCount = useMemo(
    () => Object.values(consent.categories).filter(Boolean).length,
    [consent.categories],
  );
  const transparencySummary = useMemo(
    () => buildRecommendationTransparencySummary(consent),
    [consent],
  );
  const recommendationGateway = useMemo(
    () => buildRecommendationGateway(buildDefaultRecommendationCandidates(), consent),
    [consent],
  );

  const toggleCategory = (category: RecommendationCategory) => {
    setConsent(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = await saveRecommendationConsent(consent.categories);
      setConsent(next);
      setEventCounts(await getRecommendationEventCounts());
      setEventTypeCounts(await getRecommendationEventTypeCounts());

      if (familyId && syncStatus.isOnline) {
        try {
          const result = await syncRecommendationPrivacyData(familyId, next, currentUser?.id);
          setCloudSyncMessage(`已同步 ${result.consentRows} 项授权设置和 ${result.eventRows} 条推荐记录`);
          showToastGlobal('推荐授权已保存并同步', 'success');
        } catch {
          setCloudSyncMessage('已本机保存，云端同步稍后重试');
          showToastGlobal('推荐授权已本机保存', 'success');
        }
      } else {
        setCloudSyncMessage('已本机保存，联网后可同步');
        showToastGlobal('推荐授权已本机保存', 'success');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearEvents = async () => {
    const removedCount = await removeAllRecommendationEvents();
    setEventCounts({
      education: 0,
      travel: 0,
      healthcare: 0,
    });
    setEventTypeCounts({
      impression: 0,
      click: 0,
      dismiss: 0,
      conversion: 0,
    });
    showToastGlobal(removedCount > 0 ? '推荐记录已清理' : '暂无推荐记录', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low pb-28">
      <TopAppBar title="推荐授权" onBack={() => { navigate('/profile'); }} />

      <div className="p-4 space-y-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-on-surface">由你决定是否开启个性化推荐</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 mt-1 leading-relaxed">
                这些开关只影响未来的教育、旅行、健康推荐，不影响基础日程、任务、积分功能。
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-3 mt-4">
            <span className="text-[10px] font-black text-on-surface-variant/40 block">已开启</span>
            <span className="text-xl font-black text-on-surface">{enabledCount} / {CONSENT_ITEMS.length}</span>
          </div>
          {transparencySummary.enabledCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {transparencySummary.enabledCategories.map(category => (
                <span key={category} className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-black text-primary">
                  {RECOMMENDATION_CATEGORY_DEFINITIONS[category].shortLabel}已开启
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-2 shadow-sm border border-outline-variant/10">
          {CONSENT_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => toggleCategory(item.id)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.99] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                <item.icon size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-on-surface">{item.title}</h3>
                <p className="text-xs font-bold text-on-surface-variant/50 mt-0.5">
                  {item.desc} · 本机记录 {eventCounts[item.id]} 条
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant/35 mt-1 leading-relaxed">
                  {RECOMMENDATION_CATEGORY_DEFINITIONS[item.id].sensitiveBoundary}
                </p>
              </div>
              <div className={consent.categories[item.id]
                ? 'w-12 h-7 rounded-full bg-primary p-1 flex justify-end transition-colors shrink-0'
                : 'w-12 h-7 rounded-full bg-surface-container-high p-1 flex justify-start transition-colors shrink-0'}
              >
                <span className="w-5 h-5 rounded-full bg-surface shadow-sm" />
              </div>
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles size={19} />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">开启后会出现什么</h3>
              <p className="text-xs font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                {recommendationGateway.headline}。关闭的类别只显示说明，不记录展示和点击。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[...recommendationGateway.visible, ...recommendationGateway.locked].map(card => (
              <div key={card.id} className="rounded-2xl bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={card.locked
                        ? 'rounded-full bg-surface px-2 py-0.5 text-[9px] font-black text-on-surface-variant/50'
                        : 'rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary'}
                      >
                        {card.gateLabel}
                      </span>
                      {card.locked && <Lock size={11} className="text-on-surface-variant/35" />}
                    </div>
                    <p className="text-xs font-black text-on-surface leading-relaxed">{card.title}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/50 mt-1 leading-relaxed">{card.reason}</p>
                  </div>
                  <ChevronRight size={15} className={card.locked ? 'text-on-surface-variant/25 shrink-0 mt-1' : 'text-primary shrink-0 mt-1'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-2">边界说明</h3>
          <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed">
            关闭后不应基于家庭成员、日程、任务完成情况做该类别推荐。打开后也应优先使用粗粒度标签，避免直接使用孩子姓名、住址、联系方式等敏感信息。
          </p>
          {transparencySummary.riskNotes.length > 0 && (
            <div className="mt-3 space-y-2">
              {transparencySummary.riskNotes.map(note => (
                <p key={note} className="rounded-2xl bg-surface-container-low px-3 py-2 text-[11px] font-bold leading-relaxed text-on-surface-variant">
                  {note}
                </p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {(Object.keys(EVENT_TYPE_LABELS) as RecommendationEventType[]).map(type => (
              <div key={type} className="rounded-2xl bg-surface-container-low p-2 text-center">
                <span className="block text-[9px] font-black text-on-surface-variant/40">{EVENT_TYPE_LABELS[type]}</span>
                <span className="text-sm font-black text-on-surface">{eventTypeCounts[type]}</span>
              </div>
            ))}
          </div>
          {consent.updatedAt && (
            <p className="text-[10px] font-black text-on-surface-variant/35 mt-3">
              上次更新：{new Date(consent.updatedAt).toLocaleString('zh-CN')}
            </p>
          )}
          {cloudSyncMessage && (
            <p className="text-[10px] font-black text-primary/70 mt-2">
              {cloudSyncMessage}
            </p>
          )}
          <button
            onClick={handleClearEvents}
            className="mt-4 w-full py-2.5 rounded-2xl bg-surface-container-low text-on-surface-variant text-xs font-black active:scale-[0.98] transition-all"
          >
            清理本机推荐记录
          </button>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-surface border-t border-outline-variant/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-primary text-white font-black text-sm active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存授权设置'}
        </button>
      </div>
    </div>
  );
}
