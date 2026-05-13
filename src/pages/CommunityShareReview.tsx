import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clipboard, Eye, ShieldCheck, WandSparkles } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import {
  getCommunityShareDraft,
  updateCommunityShareDraft,
  type CommunityShareConsent,
  type SharedScheduleTemplateDraft,
  type StoredSharedScheduleTemplateDraft,
} from '../lib/communityShare';

export function CommunityShareReview() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [storedDraft, setStoredDraft] = useState<StoredSharedScheduleTemplateDraft | null>(null);
  const [draft, setDraft] = useState<SharedScheduleTemplateDraft | null>(null);
  const [privacyReviewed, setPrivacyReviewed] = useState(false);
  const [communityUseAgreed, setCommunityUseAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDraft() {
      if (!id) return;
      const result = await getCommunityShareDraft(id);
      if (!active) return;
      setStoredDraft(result);
      setDraft(result?.draft || null);
      setPrivacyReviewed(Boolean(result?.consent?.privacyReviewed));
      setCommunityUseAgreed(Boolean(result?.consent?.communityUseAgreed));
      setLoading(false);
    }
    loadDraft();
    return () => { active = false; };
  }, [id]);

  const redactionLabels = useMemo(() => {
    const labels: Record<string, string> = {
      member_name: '家庭成员姓名',
      phone: '手机号',
      specific_place: '具体地点',
      custom_sensitive_term: '自定义敏感词',
    };
    return draft?.redactions.map(item => labels[item] || item) || [];
  }, [draft]);

  const handleSlotChange = (index: number, field: 'title' | 'description', value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const slots = prev.content.slots.map((slot, slotIndex) => (
        slotIndex === index ? { ...slot, [field]: value } : slot
      ));
      return { ...prev, content: { ...prev.content, slots } };
    });
  };

  const handleSaveReadyDraft = async () => {
    if (!id || !draft) return;
    if (!privacyReviewed || !communityUseAgreed) {
      showToastGlobal('请先确认分享授权', 'warning');
      return;
    }

    setSaving(true);
    try {
      const consent: CommunityShareConsent = {
        privacyReviewed,
        communityUseAgreed,
        agreedAt: new Date().toISOString(),
        version: 'community_share_v1',
      };
      const updated = await updateCommunityShareDraft(id, draft, 'ready_to_publish', consent);
      if (updated) {
        setStoredDraft(updated);
        showToastGlobal('分享草稿已确认', 'success');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      showToastGlobal('已复制分享草稿', 'success');
    } catch {
      showToastGlobal('复制失败，请稍后重试', 'error');
    }
  };

  const handleReuseAsPlan = () => {
    if (!id) return;
    sessionStorage.setItem('pending_community_template_reuse', id);
    navigate(`/plans/wizard?communityDraftId=${encodeURIComponent(id)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!draft || !storedDraft) {
    return (
      <div className="min-h-screen bg-surface-container-low">
        <TopAppBar title="分享确认" onBack={() => { navigate(-1); }} />
        <div className="p-5 text-center">
          <p className="text-sm font-bold text-on-surface-variant/60">没有找到这份分享草稿</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low pb-28">
      <TopAppBar title="分享确认" onBack={() => { navigate(-1); }} />

      <div className="p-4 space-y-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-on-surface">发布前隐私检查</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 mt-1 leading-relaxed">
                这份内容只保留日程结构和粗粒度标签，发布前仍建议你再看一遍文字。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">年龄</span>
              <span className="text-xs font-black text-on-surface">{draft.ageRange || '未填写'}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">阶段</span>
              <span className="text-xs font-black text-on-surface">{draft.gradeBand || '未填写'}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">城市</span>
              <span className="text-xs font-black text-on-surface">{draft.cityLevel || '未填写'}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" />
            <h3 className="text-sm font-black text-on-surface">可分享内容</h3>
          </div>
          <label className="text-[10px] font-black text-on-surface-variant/40 block mb-1">标题</label>
          <input
            value={draft.title}
            onChange={(event) => setDraft(prev => prev ? { ...prev, title: event.target.value } : prev)}
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-sm font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/40 mb-4"
          />

          <div className="space-y-3">
            {draft.content.slots.map((slot, index) => (
              <div key={slot.id || `${slot.startTime}-${index}`} className="rounded-2xl border border-outline-variant/10 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-black text-primary">{slot.startTime} - {slot.endTime}</span>
                  <span className="text-[10px] font-black text-on-surface-variant/40">{slot.category}</span>
                </div>
                <input
                  value={slot.title}
                  onChange={(event) => handleSlotChange(index, 'title', event.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-sm font-black text-on-surface outline-none border-2 border-transparent focus:border-primary/40"
                />
                <textarea
                  value={slot.description || ''}
                  onChange={(event) => handleSlotChange(index, 'description', event.target.value)}
                  rows={2}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface-variant outline-none border-2 border-transparent focus:border-primary/40 resize-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">已处理的信息</h3>
          <div className="flex flex-wrap gap-2">
            {redactionLabels.length > 0 ? redactionLabels.map(label => (
              <span key={label} className="px-3 py-1.5 rounded-full bg-primary-container/20 text-primary text-[11px] font-black">
                {label}
              </span>
            )) : (
              <span className="text-xs font-bold text-on-surface-variant/50">未发现明显敏感字段</span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">模板资产标签</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">时段</span>
              <span className="text-sm font-black text-on-surface">{storedDraft.asset?.slotCount ?? draft.content.slots.length}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">类别</span>
              <span className="text-sm font-black text-on-surface">{storedDraft.asset?.categoryMix?.length || 0}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">风险</span>
              <span className="text-sm font-black text-on-surface">
                {storedDraft.asset?.privacyRiskLevel === 'high' ? '偏高' : storedDraft.asset?.privacyRiskLevel === 'medium' ? '中等' : '较低'}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 flex items-center gap-1">
                <BarChart3 size={12} /> 模板质量
              </span>
              <span className="text-sm font-black text-on-surface">{storedDraft.asset?.qualityScore ?? 0}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface overflow-hidden">
              <div
                className={storedDraft.asset?.qualityLevel === 'excellent'
                  ? 'h-full bg-primary-container/200'
                  : storedDraft.asset?.qualityLevel === 'good'
                    ? 'h-full bg-primary-container/200'
                    : 'h-full bg-warning-container/500'}
                style={{ width: `${storedDraft.asset?.qualityScore ?? 0}%` }}
              />
            </div>
            {storedDraft.asset?.qualityReasons?.length ? (
              <p className="text-[10px] font-bold text-on-surface-variant/50 mt-2 leading-relaxed">
                {storedDraft.asset.qualityReasons.join('；')}
              </p>
            ) : null}
            {storedDraft.asset?.publishBlockers?.length ? (
              <p className="text-[10px] font-bold text-warning mt-2 leading-relaxed">
                {storedDraft.asset.publishBlockers.join('；')}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(storedDraft.asset?.tags || []).map(tag => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-primary/5 text-primary text-[11px] font-black">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs font-bold leading-relaxed text-on-surface-variant/60">
            {storedDraft.asset?.reuseHint || '复用前建议按自家作息和父母陪伴时间微调。'}
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">可沉淀的家庭画像</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">覆盖度</span>
              <span className="text-xs font-black text-on-surface">
                {storedDraft.asset?.profileSignal.timeCoverage === 'full_day' ? '全天' : storedDraft.asset?.profileSignal.timeCoverage === 'partial_day' ? '半天/多段' : '轻量'}
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">需要家长陪伴</span>
              <span className="text-xs font-black text-on-surface">{storedDraft.asset?.profileSignal.caregiverRequiredSlots || 0} 段</span>
            </div>
          </div>
          <div className="space-y-2">
            {(storedDraft.asset?.profileSignal.commercialSignals || []).length > 0 ? (
              storedDraft.asset.profileSignal.commercialSignals.map(signal => (
                <div key={signal.category} className="rounded-2xl bg-surface-container-low p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-on-surface">
                      {signal.category === 'education' ? '教育资源' : signal.category === 'travel' ? '假期旅行' : '健康就医'}
                    </span>
                    <span className="text-[10px] font-black text-primary">
                      {signal.strength === 'strong' ? '强相关' : signal.strength === 'medium' ? '中相关' : '弱相关'}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 mt-1 leading-relaxed">{signal.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-on-surface-variant/50">
                这份模板暂时只适合作为社区参考，不会形成明显的推荐信号。
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">分享授权</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3 active:scale-[0.99] transition-transform">
              <input
                type="checkbox"
                checked={privacyReviewed}
                onChange={(event) => setPrivacyReviewed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0"
              />
              <span className="text-xs font-bold leading-relaxed text-on-surface-variant">
                我已检查标题和日程内容，确认没有包含孩子姓名、联系方式、住址、学校班级等隐私信息。
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3 active:scale-[0.99] transition-transform">
              <input
                type="checkbox"
                checked={communityUseAgreed}
                onChange={(event) => setCommunityUseAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0"
              />
              <span className="text-xs font-bold leading-relaxed text-on-surface-variant">
                我同意将这份脱敏日程作为社区模板，供其他家庭浏览、收藏和参考。
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 bg-surface border-t border-outline-variant/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-2xl bg-surface-container-low text-primary font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Clipboard size={16} /> 复制草稿
        </button>
        <button
          onClick={handleReuseAsPlan}
          className="flex-1 py-3 rounded-2xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <WandSparkles size={16} /> 复用为计划
        </button>
        <button
          onClick={handleSaveReadyDraft}
          disabled={saving || !privacyReviewed || !communityUseAgreed}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> {storedDraft.status === 'ready_to_publish' ? '已确认' : '确认可分享'}
        </button>
      </div>
    </div>
  );
}
