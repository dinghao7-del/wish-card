import { useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Gift,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react';
import {
  productHuntDemoPlan,
  productHuntDemoTasks,
  productHuntDemoWeeklyReview,
  productHuntDemoWish,
} from '../lib/productHuntDemoData';
import { cn } from '../lib/utils';

const frameSize = 'h-[760px] w-[1270px]';

export function ProductHuntGalleryFrames() {
  useEffect(() => {
    document.documentElement.lang = 'en';
    document.title = 'WishCard Product Hunt gallery frames';
  }, []);

  return (
    <div className="min-h-screen bg-surface-container py-10">
      <main className="mx-auto flex w-fit flex-col gap-10">
        <GalleryFrame id="ph-frame-1" eyebrow="01 / FAMILY RHYTHM" title="From daily chaos to family rhythm">
          <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-8">
            <div className="flex flex-col justify-center">
              <LogoBlock />
              <p className="mt-8 max-w-[470px] text-[34px] font-black leading-[1.08] text-on-surface">
                WishCard helps parents stop rebuilding the same family plan every day.
              </p>
              <p className="mt-5 max-w-[490px] text-[18px] font-bold leading-8 text-on-surface-variant">
                It turns routines, goals, and family constraints into a clear weekly rhythm kids can actually follow.
              </p>
            </div>
            <div className="flex items-center">
              <div className="w-full rounded-[42px] border border-outline-variant bg-white p-6 shadow-2xl shadow-primary-text/10">
                <div className="rounded-[32px] bg-surface-container-low p-6">
                  <p className="text-[13px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70">Busy school week</p>
                  <h3 className="mt-2 text-[34px] font-black text-on-surface">Emma and Leo</h3>
                  <div className="mt-6 grid gap-4">
                    <ProblemRow label="Parent pain" value="Too much reminding after school" />
                    <ProblemRow label="Child goal" value="Homework, reading, piano, bedtime" />
                    <ProblemRow label="Wish" value="Saturday museum trip" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GalleryFrame>

        <GalleryFrame id="ph-frame-2" eyebrow="02 / AI PLANNER" title="AI builds routines from your family profile">
          <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-8">
            <div className="flex flex-col justify-center">
              <FeatureBadge icon={WandSparkles} label="Family profile -> weekly routine" />
              <h3 className="mt-7 text-[48px] font-black leading-[1.03] text-on-surface">
                Not a chatbot. A planner for real family constraints.
              </h3>
              <p className="mt-5 text-[18px] font-bold leading-8 text-on-surface-variant">
                WishCard explains assumptions, protects the highest-friction moments, and keeps the plan realistic.
              </p>
            </div>
            <div className="grid content-center gap-3">
              {productHuntDemoPlan.slots.slice(0, 4).map(slot => (
                <div key={slot.id} className="rounded-[26px] border border-outline-variant bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-[13px] font-black text-primary">{slot.time} · {slot.category}</p>
                      <h4 className="mt-1 text-[24px] font-black text-on-surface">{slot.title}</h4>
                      <p className="mt-1 text-[15px] font-bold leading-6 text-on-surface-variant">{slot.why}</p>
                    </div>
                    <span className="rounded-full bg-secondary-container px-4 py-2 text-[14px] font-black text-secondary">+{slot.stars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GalleryFrame>

        <GalleryFrame id="ph-frame-3" eyebrow="03 / DAILY ACTION" title="Turn plans into kid-sized tasks">
          <div className="grid h-full grid-cols-[1.05fr_0.95fr] gap-8">
            <div className="grid content-center gap-4">
              {productHuntDemoTasks.slice(0, 5).map((task, index) => (
                <div key={task.id} className="rounded-[28px] border border-outline-variant bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex h-13 w-13 shrink-0 items-center justify-center rounded-[20px]',
                      index < 2 ? 'bg-primary text-white' : 'bg-primary/5 text-primary'
                    )}>
                      {index < 2 ? <CheckCircle2 size={25} /> : <CalendarCheck size={25} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[25px] font-black leading-tight text-on-surface">{task.title}</h4>
                      <p className="mt-1 text-[15px] font-bold leading-6 text-on-surface-variant">{task.description}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-secondary-container px-4 py-2 text-[14px] font-black text-secondary">
                      +{task.rewardStars}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <FeatureBadge icon={ClipboardList} label="Plan-to-task generation" />
              <h3 className="mt-7 text-[48px] font-black leading-[1.03] text-on-surface">
                Kids do not need a strategy doc. They need the next clear action.
              </h3>
              <p className="mt-5 text-[18px] font-bold leading-8 text-on-surface-variant">
                Each routine slot becomes a concrete task with context, timing, and a visible reward.
              </p>
            </div>
          </div>
        </GalleryFrame>

        <GalleryFrame id="ph-frame-4" eyebrow="04 / WISH LOOP" title="Stars unlock real family wishes">
          <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-8">
            <div className="flex flex-col justify-center">
              <FeatureBadge icon={Star} label="32 stars earned" />
              <h3 className="mt-7 text-[52px] font-black leading-[1.02] text-on-surface">
                Motivation works when progress becomes something meaningful.
              </h3>
              <p className="mt-5 text-[18px] font-bold leading-8 text-on-surface-variant">
                Leo earns stars from daily actions and uses them for a real wish his parent can fulfill.
              </p>
            </div>
            <div className="flex items-center">
              <div className="w-full rounded-[44px] border border-outline-variant bg-white p-8 shadow-2xl shadow-primary-text/10">
                <div className="flex h-20 w-20 items-center justify-center rounded-[32px] bg-secondary-container text-secondary">
                  <Gift size={42} />
                </div>
                <p className="mt-7 text-[14px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70">Wish reward</p>
                <h3 className="mt-2 text-[44px] font-black leading-tight text-on-surface">{productHuntDemoWish.title}</h3>
                <p className="mt-4 text-[19px] font-bold leading-8 text-on-surface-variant">{productHuntDemoWish.description}</p>
                <div className="mt-8 flex items-center gap-4">
                  <span className="rounded-full bg-primary/5 px-5 py-3 text-[16px] font-black text-primary-text">Cost: 30 stars</span>
                  <span className="rounded-full bg-primary px-5 py-3 text-[16px] font-black text-white">Redeemed</span>
                </div>
              </div>
            </div>
          </div>
        </GalleryFrame>

        <GalleryFrame id="ph-frame-5" eyebrow="05 / FAMILY REVIEW" title="Weekly reviews keep everyone aligned">
          <div className="grid h-full grid-cols-[0.85fr_1.15fr] gap-8">
            <div className="flex flex-col justify-center">
              <FeatureBadge icon={HeartHandshake} label="Promises stay visible" />
              <h3 className="mt-7 text-[48px] font-black leading-[1.03] text-on-surface">
                A redeemed wish becomes a parent promise.
              </h3>
              <p className="mt-5 text-[18px] font-bold leading-8 text-on-surface-variant">
                Weekly reviews show wins, pressure points, and what to simplify next week.
              </p>
            </div>
            <div className="grid content-center gap-4">
              <div className="rounded-[34px] border border-outline-variant bg-white p-6 shadow-sm">
                <p className="text-[14px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70">Parent task</p>
                <h4 className="mt-2 text-[34px] font-black leading-tight text-on-surface">Fulfill Leo's museum trip wish</h4>
                <p className="mt-3 text-[17px] font-bold leading-7 text-on-surface-variant">{productHuntDemoWish.parentPromise}</p>
              </div>
              <div className="rounded-[34px] border border-outline-variant bg-white p-6 shadow-sm">
                <p className="text-[14px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70">Weekly review</p>
                <h4 className="mt-2 text-[30px] font-black leading-tight text-on-surface">{productHuntDemoWeeklyReview.title}</h4>
                <div className="mt-4 grid gap-2">
                  {productHuntDemoWeeklyReview.parentFocus.slice(0, 3).map(item => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3">
                      <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} />
                      <p className="text-[15px] font-bold leading-6 text-on-surface-variant">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GalleryFrame>
      </main>
    </div>
  );
}

function GalleryFrame({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-gallery-frame className={cn(frameSize, 'overflow-hidden bg-background p-14 shadow-2xl shadow-on-surface/10')}>
      <div className="mb-6 flex items-start justify-between gap-8">
        <div>
          <p className="text-[14px] font-black uppercase tracking-[0.22em] text-on-surface-variant/70">{eyebrow}</p>
          <h2 className="mt-2 text-[40px] font-black leading-tight text-on-surface">{title}</h2>
        </div>
        <LogoBlock compact />
      </div>
      <div className="h-[568px]">{children}</div>
    </section>
  );
}

function LogoBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex items-center justify-center rounded-[20px] bg-primary text-white', compact ? 'h-12 w-12' : 'h-14 w-14')}>
        <Sparkles size={compact ? 24 : 28} strokeWidth={2.6} />
      </div>
      <div>
        <p className={cn('font-black leading-none text-primary', compact ? 'text-[20px]' : 'text-[24px]')}>WishCard</p>
        <p className="mt-1 text-[12px] font-bold text-on-surface-variant">AI family planner</p>
      </div>
    </div>
  );
}

function FeatureBadge({ icon: Icon, label }: { icon: typeof Sparkles; label: string }) {
  return (
    <div className="inline-flex w-fit items-center gap-3 rounded-full bg-primary/5 px-5 py-3 text-[16px] font-black text-primary">
      <Icon size={21} strokeWidth={2.7} />
      {label}
    </div>
  );
}

function ProblemRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white p-4 shadow-sm">
      <p className="text-[12px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">{label}</p>
      <p className="mt-1 text-[22px] font-black leading-tight text-on-surface">{value}</p>
    </div>
  );
}
