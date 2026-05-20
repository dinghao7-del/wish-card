import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clipboard, Eye, ShieldCheck, WandSparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const tt = (zh: string, en: string) => (isZh ? zh : en);
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
      member_name: tt('家庭成员姓名', 'Family member names'),
      phone: tt('手机号', 'Phone numbers'),
      specific_place: tt('具体地点', 'Specific places'),
      custom_sensitive_term: tt('自定义敏感词', 'Custom sensitive terms'),
    };
    return draft?.redactions.map(item => labels[item] || item) || [];
  }, [draft, isZh]);

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
      showToastGlobal(tt('请先确认分享授权', 'Please confirm the sharing permissions first.'), 'warning');
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
        showToastGlobal(tt('分享草稿已确认', 'Share draft confirmed.'), 'success');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      showToastGlobal(tt('已复制分享草稿', 'Share draft copied.'), 'success');
    } catch {
      showToastGlobal(tt('复制失败，请稍后重试', 'Copy failed. Please try again later.'), 'error');
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
        <TopAppBar title={tt('分享确认', 'Share Review')} onBack={() => { navigate(-1); }} />
        <div className="p-5 text-center">
          <p className="text-sm font-bold text-on-surface-variant/60">{tt('没有找到这份分享草稿', 'This share draft was not found.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low pb-28">
      <TopAppBar title={tt('分享确认', 'Share Review')} onBack={() => { navigate(-1); }} />

      <div className="p-4 space-y-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-on-surface">{tt('发布前隐私检查', 'Privacy Check Before Publishing')}</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 mt-1 leading-relaxed">
                {tt('这份内容只保留日程结构和粗粒度标签，发布前仍建议你再看一遍文字。', 'This keeps only the schedule structure and broad tags. Please review the text once more before publishing.')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('年龄', 'Age')}</span>
              <span className="text-xs font-black text-on-surface">{draft.ageRange || tt('未填写', 'Not set')}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('阶段', 'Stage')}</span>
              <span className="text-xs font-black text-on-surface">{draft.gradeBand || tt('未填写', 'Not set')}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('城市', 'City')}</span>
              <span className="text-xs font-black text-on-surface">{draft.cityLevel || tt('未填写', 'Not set')}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-primary" />
            <h3 className="text-sm font-black text-on-surface">{tt('可分享内容', 'Shareable Content')}</h3>
          </div>
          <label className="text-[10px] font-black text-on-surface-variant/40 block mb-1">{tt('标题', 'Title')}</label>
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
          <h3 className="text-sm font-black text-on-surface mb-3">{tt('已处理的信息', 'Processed Information')}</h3>
          <div className="flex flex-wrap gap-2">
            {redactionLabels.length > 0 ? redactionLabels.map(label => (
              <span key={label} className="px-3 py-1.5 rounded-full bg-primary-container/20 text-primary text-[11px] font-black">
                {label}
              </span>
            )) : (
              <span className="text-xs font-bold text-on-surface-variant/50">{tt('未发现明显敏感字段', 'No obvious sensitive fields found.')}</span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">{tt('模板资产标签', 'Template Asset Tags')}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('时段', 'Slots')}</span>
              <span className="text-sm font-black text-on-surface">{storedDraft.asset?.slotCount ?? draft.content.slots.length}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('类别', 'Categories')}</span>
              <span className="text-sm font-black text-on-surface">{storedDraft.asset?.categoryMix?.length || 0}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('风险', 'Risk')}</span>
              <span className="text-sm font-black text-on-surface">
                {storedDraft.asset?.privacyRiskLevel === 'high' ? tt('偏高', 'High') : storedDraft.asset?.privacyRiskLevel === 'medium' ? tt('中等', 'Medium') : tt('较低', 'Low')}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 flex items-center gap-1">
                <BarChart3 size={12} /> {tt('模板质量', 'Template Quality')}
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
            {storedDraft.asset?.reuseHint || tt('复用前建议按自家作息和父母陪伴时间微调。', 'Before reusing, adjust it to your family schedule and parent availability.')}
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">{tt('可沉淀的家庭画像', 'Family Signals That Can Be Learned')}</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('覆盖度', 'Coverage')}</span>
              <span className="text-xs font-black text-on-surface">
                {storedDraft.asset?.profileSignal.timeCoverage === 'full_day' ? tt('全天', 'Full day') : storedDraft.asset?.profileSignal.timeCoverage === 'partial_day' ? tt('半天/多段', 'Half day / multiple slots') : tt('轻量', 'Light')}
              </span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">{tt('需要家长陪伴', 'Needs Parent Time')}</span>
              <span className="text-xs font-black text-on-surface">{storedDraft.asset?.profileSignal.caregiverRequiredSlots || 0} {tt('段', 'slots')}</span>
            </div>
          </div>
          <div className="space-y-2">
            {(storedDraft.asset?.profileSignal.commercialSignals || []).length > 0 ? (
              storedDraft.asset.profileSignal.commercialSignals.map(signal => (
                <div key={signal.category} className="rounded-2xl bg-surface-container-low p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-on-surface">
                      {signal.category === 'education' ? tt('教育资源', 'Education Resources') : signal.category === 'travel' ? tt('假期旅行', 'Holiday Travel') : tt('健康就医', 'Healthcare')}
                    </span>
                    <span className="text-[10px] font-black text-primary">
                      {signal.strength === 'strong' ? tt('强相关', 'Strong') : signal.strength === 'medium' ? tt('中相关', 'Medium') : tt('弱相关', 'Weak')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 mt-1 leading-relaxed">{signal.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-on-surface-variant/50">
                {tt('这份模板暂时只适合作为社区参考，不会形成明显的推荐信号。', 'For now, this template is only useful as a community reference and does not create strong recommendation signals.')}
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <h3 className="text-sm font-black text-on-surface mb-3">{tt('分享授权', 'Sharing Permission')}</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3 active:scale-[0.99] transition-transform">
              <input
                type="checkbox"
                checked={privacyReviewed}
                onChange={(event) => setPrivacyReviewed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary shrink-0"
              />
              <span className="text-xs font-bold leading-relaxed text-on-surface-variant">
                {tt('我已检查标题和日程内容，确认没有包含孩子姓名、联系方式、住址、学校班级等隐私信息。', 'I have reviewed the title and schedule content and confirmed it does not include children’s names, contact info, addresses, school classes, or similar private details.')}
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
                {tt('我同意将这份脱敏日程作为社区模板，供其他家庭浏览、收藏和参考。', 'I agree to share this anonymized schedule as a community template for other families to browse, save, and reference.')}
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
          <Clipboard size={16} /> {tt('复制草稿', 'Copy Draft')}
        </button>
        <button
          onClick={handleReuseAsPlan}
          className="flex-1 py-3 rounded-2xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <WandSparkles size={16} /> {tt('复用为计划', 'Reuse as Plan')}
        </button>
        <button
          onClick={handleSaveReadyDraft}
          disabled={saving || !privacyReviewed || !communityUseAgreed}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> {storedDraft.status === 'ready_to_publish' ? tt('已确认', 'Confirmed') : tt('确认可分享', 'Confirm Sharing')}
        </button>
      </div>
    </div>
  );
}
