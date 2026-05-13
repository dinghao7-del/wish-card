import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Gift,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WandSparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import {
  productHuntDemoMembers,
  productHuntDemoPlan,
  productHuntDemoTasks,
  productHuntDemoWeeklyReview,
  productHuntDemoWish,
} from '../lib/productHuntDemoData';
import { recordProductHuntEvent } from '../lib/productHuntAnalytics';
import { cn } from '../lib/utils';

const steps = [
  'Family profile',
  'AI weekly plan',
  'Daily tasks',
  'Stars and wish',
  'Parent promise',
  'Weekly review',
];

const pageTitle = 'WishCard - AI family planner with wish-powered rewards';
const pageDescription = 'WishCard turns family routines into kid-friendly tasks, stars, real wishes, and weekly reviews.';

function setDocumentMeta(selector: string, attribute: 'content' | 'href', value: string) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export function ProductHuntDemo() {
  const navigate = useNavigate();
  const { currentUser, guestMode, loadGuestDemoData, setCurrentUser, setFamilyId } = useFamily();
  const [activeStep, setActiveStep] = useState(0);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set(['ph-task-reset']));
  const [wishRedeemed, setWishRedeemed] = useState(false);
  const [promiseCreated, setPromiseCreated] = useState(false);
  const [waitlistPlan, setWaitlistPlan] = useState<'Plus' | 'Pro' | null>(null);
  const trackedStepViews = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (guestMode && currentUser) return;
    const demoUser = loadGuestDemoData();
    if (demoUser) setCurrentUser(demoUser);
    setFamilyId('guest-family');
  }, [currentUser, guestMode, loadGuestDemoData, setCurrentUser, setFamilyId]);

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.title = pageTitle;
    setDocumentMeta('meta[name="description"]', 'content', pageDescription);
    setDocumentMeta('meta[property="og:title"]', 'content', pageTitle);
    setDocumentMeta('meta[property="og:description"]', 'content', pageDescription);
    setDocumentMeta('meta[name="twitter:title"]', 'content', pageTitle);
    setDocumentMeta('meta[name="twitter:description"]', 'content', pageDescription);
    recordProductHuntEvent('ph_landing_view');
  }, []);

  useEffect(() => {
    if (trackedStepViews.current.has(activeStep)) return;
    trackedStepViews.current.add(activeStep);
    const eventByStep = [
      'ph_demo_family_profile_view',
      'ph_demo_ai_plan_view',
      'ph_demo_tasks_generated',
      undefined,
      'ph_demo_parent_promise_view',
      'ph_demo_weekly_report_view',
    ] as const;
    const eventName = eventByStep[activeStep];
    if (eventName) {
      recordProductHuntEvent(eventName, { step: activeStep + 1, label: steps[activeStep] });
    }
  }, [activeStep]);

  const earnedStars = useMemo(() => {
    return productHuntDemoTasks
      .filter(task => completedTaskIds.has(task.id))
      .reduce((sum, task) => sum + task.rewardStars, 24);
  }, [completedTaskIds]);

  const canRedeemWish = earnedStars >= productHuntDemoWish.cost;
  const selectedStep = steps[activeStep];

  const completeReadingTask = () => {
    setCompletedTaskIds(prev => new Set([...prev, 'ph-task-reading']));
    recordProductHuntEvent('ph_demo_task_completed', {
      taskId: 'ph-task-reading',
      taskTitle: 'Reading mission',
      rewardStars: 6,
    });
    setActiveStep(3);
  };

  const redeemWish = () => {
    if (!canRedeemWish) return;
    setWishRedeemed(true);
    setPromiseCreated(true);
    recordProductHuntEvent('ph_demo_wish_redeemed', {
      wishId: productHuntDemoWish.id,
      wishTitle: productHuntDemoWish.title,
      cost: productHuntDemoWish.cost,
      earnedStars,
    });
    setActiveStep(4);
  };

  const resetDemo = () => {
    setCompletedTaskIds(new Set(['ph-task-reset']));
    setWishRedeemed(false);
    setPromiseCreated(false);
    setActiveStep(0);
    trackedStepViews.current = new Set();
    recordProductHuntEvent('ph_demo_reset');
  };

  const joinWaitlist = (plan: 'Plus' | 'Pro') => {
    setWaitlistPlan(plan);
    recordProductHuntEvent(plan === 'Plus' ? 'ph_pricing_plus_click' : 'ph_pricing_pro_click', {
      plan,
    });
    recordProductHuntEvent('ph_waitlist_join', {
      plan,
    });
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="sticky top-0 z-30 border-b border-outline-variant/40 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveStep(0)}
            className="flex min-h-11 items-center gap-2 text-left"
            aria-label="WishCard Product Hunt demo home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
              <Sparkles size={20} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-base font-black leading-none text-primary">WishCard</p>
              <p className="text-[11px] font-bold text-on-surface-variant">Product Hunt demo</p>
            </div>
          </button>
          <div className="hidden items-center gap-2 md:flex">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={cn(
                  'min-h-9 rounded-full px-3 text-xs font-black transition-all',
                  activeStep === index
                    ? 'bg-primary text-white'
                    : 'bg-white text-on-surface-variant hover:bg-primary/10'
                )}
              >
                {index + 1}. {step}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant bg-white px-3 text-xs font-black text-primary-text shadow-sm"
          >
            <RefreshCw size={14} />
            Reset
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-12">
          <div className="flex flex-col justify-center">
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-black text-primary">
              <WandSparkles size={15} />
              AI family planner with wish-powered rewards
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-normal text-on-surface sm:text-5xl lg:text-6xl">
              Plan family routines. Motivate kids. Fulfill wishes.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-on-surface-variant sm:text-lg">
              WishCard turns a family profile into weekly routines, kid-friendly tasks, visible progress, real wishes, and weekly reviews parents can act on.
            </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  recordProductHuntEvent('ph_demo_start');
                  setActiveStep(1);
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20"
              >
                Start the demo
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  recordProductHuntEvent('ph_full_guest_app_click');
                  navigate('/');
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-white px-5 text-sm font-black text-primary-text shadow-sm"
              >
                Open full guest app
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  recordProductHuntEvent('ph_gallery_frames_click');
                  navigate('/demo/product-hunt/gallery');
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-white px-5 text-sm font-black text-primary-text shadow-sm"
              >
                View gallery frames
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-outline-variant/40 bg-white p-4 shadow-xl shadow-primary-text/10"
          >
            <div className="rounded-[1.5rem] bg-surface-container-low p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-outline">Demo family</p>
                  <h2 className="mt-1 text-2xl font-black text-on-surface">Emma and Leo</h2>
                </div>
                <div className="rounded-2xl bg-reward-display/25 px-3 py-2 text-sm font-black text-secondary">
                  {earnedStars} stars
                </div>
              </div>
              <div className="grid gap-3">
                {productHuntDemoMembers.map(member => (
                  <div key={member.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white">
                      {member.avatarLabel}
                    </div>
                    <div>
                      <p className="text-sm font-black text-on-surface">{member.name}</p>
                      <p className="text-xs font-bold leading-5 text-on-surface-variant">{member.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className="border-y border-outline-variant/40 bg-white">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={cn(
                  'min-h-14 rounded-2xl px-3 text-left text-xs font-black transition-all',
                  activeStep === index
                    ? 'bg-primary text-white shadow-lg shadow-primary/15'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                )}
              >
                <span className="mb-1 block text-[10px] opacity-70">Step {index + 1}</span>
                {step}
              </button>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-outline">Current demo step</p>
              <h2 className="mt-1 text-2xl font-black text-on-surface sm:text-3xl">{selectedStep}</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveStep(Math.min(activeStep + 1, steps.length - 1))}
              className="hidden min-h-11 items-center gap-2 rounded-2xl bg-on-surface px-4 text-sm font-black text-white sm:inline-flex"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>

          {activeStep === 0 && <FamilyProfileStep />}
          {activeStep === 1 && <AiPlanStep />}
          {activeStep === 2 && (
            <TasksStep
              completedTaskIds={completedTaskIds}
              onCompleteReading={completeReadingTask}
            />
          )}
          {activeStep === 3 && (
            <WishStep
              earnedStars={earnedStars}
              canRedeemWish={canRedeemWish}
              wishRedeemed={wishRedeemed}
              onRedeem={redeemWish}
            />
          )}
          {activeStep === 4 && <PromiseStep promiseCreated={promiseCreated} />}
          {activeStep === 5 && <WeeklyReviewStep />}
        </section>

        <section className="bg-on-surface text-white">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-black text-primary-surface">Built for parent trust</p>
              <h2 className="mt-2 text-3xl font-black">A family system, not another chore list.</h2>
            </div>
            <div className="grid gap-3">
              {[
                'Children do not need email or phone accounts.',
                'Parents control family data and decisions.',
                'No child-facing ads.',
                'Community templates are anonymized by default.',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/8 p-3">
                  <ShieldCheck className="mt-0.5 text-primary-surface" size={18} />
                  <p className="text-sm font-bold leading-6 text-white/82">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing-waitlist" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-outline">Launch validation</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-on-surface sm:text-4xl">
              Start free. Tell us what would be worth paying for.
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-on-surface-variant">
              Product Hunt launch users can explore the family loop for free. Plus and Pro are waitlist signals while we learn which planning features parents value most.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              description="For trying the family action loop."
              features={[
                'Family members',
                'Tasks and habits',
                'Stars and wishes',
                'Basic weekly review',
              ]}
              action="Included in demo"
            />
            <PricingCard
              name="Plus"
              price="$7.99/mo"
              description="For parents who want AI to plan the week."
              features={[
                'AI weekly family plans',
                'Plan-to-task generation',
                'Advanced weekly and monthly reviews',
                'Calendar sync',
              ]}
              action={waitlistPlan === 'Plus' ? 'Plus interest saved' : 'Join Plus waitlist'}
              highlighted
              onClick={() => joinWaitlist('Plus')}
            />
            <PricingCard
              name="Pro"
              price="$14.99/mo"
              description="For deeper planning across seasons and multiple kids."
              features={[
                'Holiday and summer planning',
                'AI quadrant prioritization',
                'Community template adaptation',
                'Expert template packs',
              ]}
              action={waitlistPlan === 'Pro' ? 'Pro interest saved' : 'Join Pro waitlist'}
              onClick={() => joinWaitlist('Pro')}
            />
          </div>
          {waitlistPlan && (
            <div className="mt-4 rounded-3xl border border-outline-variant bg-primary/10 p-4 text-sm font-black text-primary-text">
              Thanks. We saved your {waitlistPlan} interest in this demo session. In the production launch this becomes the early-access waitlist event.
            </div>
          )}
        </section>

        <section id="launch-gallery" className="border-y border-outline-variant/40 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <div className="mb-6 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-outline">Screenshot-ready story</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-on-surface sm:text-4xl">
                Five Product Hunt gallery frames from one working demo.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                ['01', 'From daily chaos to family rhythm'],
                ['02', 'AI builds routines from your family profile'],
                ['03', 'Turn plans into kid-sized tasks'],
                ['04', 'Stars unlock real family wishes'],
                ['05', 'Weekly reviews keep everyone aligned'],
              ].map(([number, title]) => (
                <div key={number} className="rounded-3xl bg-surface-container-low p-4">
                  <p className="text-xs font-black text-primary">{number}</p>
                  <p className="mt-3 text-base font-black leading-snug text-on-surface">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-outline">FAQ</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-on-surface sm:text-4xl">
                Parent trust comes before growth.
              </h2>
              <p className="mt-3 text-sm font-bold leading-6 text-on-surface-variant">
                WishCard handles family routines and child motivation, so the launch surface needs to answer trust questions before users ask them.
              </p>
            </div>
            <div className="grid gap-3">
              <FaqItem
                question="Do children need their own accounts?"
                answer="No. WishCard is designed around one parent-controlled family account. Children can use family member profiles without email or phone accounts."
              />
              <FaqItem
                question="Does WishCard show ads to kids?"
                answer="No. The child experience is not an ad surface. Any future commercial recommendation should be parent-side, transparent, and opt-in."
              />
              <FaqItem
                question="What does AI use to create plans?"
                answer="The planner uses family profile details such as age, routine constraints, parent availability, goals, and friction points to suggest realistic schedules."
              />
              <FaqItem
                question="Can community templates expose private family details?"
                answer="Community templates should be anonymized by default and should not include child names, schools, addresses, routes, phone numbers, or parent workplace details."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FamilyProfileStep() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DemoPanel icon={ClipboardList} title="Family profile" tone="green">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">
          WishCard starts from real constraints: school rhythm, parent availability, friction points, and what motivates the child.
        </p>
      </DemoPanel>
      <DemoMetric label="Parent pain" value="Too much reminding" />
      <DemoMetric label="Child goal" value="Homework, reading, piano, bedtime" />
    </div>
  );
}

function AiPlanStep() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <DemoPanel icon={WandSparkles} title={productHuntDemoPlan.title} tone="green">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">{productHuntDemoPlan.summary}</p>
        <div className="mt-4 space-y-2">
          {productHuntDemoPlan.assumptions.map(item => (
            <p key={item} className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-black text-primary-text">
              {item}
            </p>
          ))}
        </div>
      </DemoPanel>
      <div className="grid gap-3">
        {productHuntDemoPlan.slots.map(slot => (
          <div key={slot.id} className="rounded-3xl border border-outline-variant/40 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-primary">{slot.time} · {slot.category}</p>
                <h3 className="mt-1 text-lg font-black text-on-surface">{slot.title}</h3>
                <p className="mt-1 text-sm font-bold leading-6 text-on-surface-variant">{slot.why}</p>
              </div>
              <span className="rounded-full bg-reward-display/25 px-3 py-1 text-xs font-black text-secondary">
                +{slot.stars}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksStep({
  completedTaskIds,
  onCompleteReading,
}: {
  completedTaskIds: Set<string>;
  onCompleteReading: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="grid gap-3">
        {productHuntDemoTasks.map(task => {
          const completed = completedTaskIds.has(task.id);
          const isReadingTask = task.id === 'ph-task-reading';
          return (
            <div key={task.id} className="rounded-3xl border border-outline-variant/40 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    completed ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                  )}>
                    {completed ? <CheckCircle2 size={20} /> : <CalendarCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-on-surface">{task.title}</h3>
                    <p className="text-xs font-bold leading-5 text-on-surface-variant">{task.description}</p>
                  </div>
                </div>
                {isReadingTask && !completed ? (
                  <button
                    type="button"
                    onClick={onCompleteReading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-white"
                  >
                    Complete task
                    <Star size={16} />
                  </button>
                ) : (
                  <span className="rounded-full bg-reward-display/25 px-3 py-1 text-xs font-black text-secondary">
                    {completed ? 'Done' : `+${task.rewardStars} stars`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <DemoPanel icon={Sparkles} title="Plans become kid-sized action" tone="amber">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">
          The parent does not manually rewrite the routine. WishCard converts each routine slot into a task with timing, context, and a star reward.
        </p>
      </DemoPanel>
    </div>
  );
}

function WishStep({
  earnedStars,
  canRedeemWish,
  wishRedeemed,
  onRedeem,
}: {
  earnedStars: number;
  canRedeemWish: boolean;
  wishRedeemed: boolean;
  onRedeem: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <DemoPanel icon={Star} title={`${earnedStars} stars earned`} tone="amber">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">
          Stars make progress visible. Leo can see how daily actions connect to something he actually cares about.
        </p>
      </DemoPanel>
      <div className="rounded-[2rem] border border-outline-variant/40 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-reward-display/25 text-secondary">
            <Gift size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-outline">Wish reward</p>
            <h3 className="mt-1 text-2xl font-black text-on-surface">{productHuntDemoWish.title}</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-on-surface-variant">{productHuntDemoWish.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary-text">
                Cost: {productHuntDemoWish.cost} stars
              </span>
              <button
                type="button"
                disabled={!canRedeemWish || wishRedeemed}
                onClick={onRedeem}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-black text-white disabled:bg-outline-variant"
              >
                {wishRedeemed ? 'Wish redeemed' : canRedeemWish ? 'Redeem wish' : 'Earn more stars'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromiseStep({ promiseCreated }: { promiseCreated: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <DemoPanel icon={HeartHandshake} title="Wishes become family promises" tone="green">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">
          A redeemed wish is not just a digital reward. WishCard creates a parent-side promise so the family keeps trust visible.
        </p>
      </DemoPanel>
      <div className="rounded-[2rem] border border-outline-variant/40 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-outline">Parent task</p>
        <h3 className="mt-2 text-2xl font-black text-on-surface">Fulfill Leo's museum trip wish</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-on-surface-variant">{productHuntDemoWish.parentPromise}</p>
        <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm font-black text-primary-text">
          {promiseCreated ? 'Promise created after redemption.' : 'Redeem the wish in the previous step to create this promise.'}
        </div>
      </div>
    </div>
  );
}

function WeeklyReviewStep() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <DemoPanel icon={ClipboardList} title={productHuntDemoWeeklyReview.title} tone="green">
        <p className="text-sm font-bold leading-6 text-on-surface-variant">{productHuntDemoWeeklyReview.nextWeek}</p>
      </DemoPanel>
      <div className="grid gap-3">
        <ReviewBlock title="Leo's wins this week" items={productHuntDemoWeeklyReview.childHighlights} />
        <ReviewBlock title="Parent focus" items={productHuntDemoWeeklyReview.parentFocus} />
      </div>
    </div>
  );
}

function DemoPanel({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  tone: 'green' | 'amber';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-outline-variant/40 bg-white p-5 shadow-sm">
      <div className={cn(
        'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl',
        tone === 'green' ? 'bg-primary/10 text-primary' : 'bg-reward-display/25 text-secondary'
      )}>
        <Icon size={24} strokeWidth={2.6} />
      </div>
      <h3 className="text-xl font-black text-on-surface">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DemoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-outline-variant/40 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-outline">{label}</p>
      <p className="mt-3 text-2xl font-black leading-tight text-on-surface">{value}</p>
    </div>
  );
}

function ReviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-outline-variant/40 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-black text-on-surface">{title}</h3>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={17} />
            <p className="text-sm font-bold leading-6 text-on-surface-variant">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  action,
  highlighted = false,
  onClick,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  action: string;
  highlighted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn(
      'rounded-[2rem] border p-5 shadow-sm',
      highlighted
        ? 'border-primary bg-primary/10 shadow-primary/10'
        : 'border-outline-variant/40 bg-white'
    )}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-on-surface">{name}</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-on-surface-variant">{description}</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-black text-primary">{price}</p>
      </div>
      <div className="space-y-2">
        {features.map(feature => (
          <div key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={16} />
            <p className="text-sm font-bold leading-5 text-on-surface-variant">{feature}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black',
          onClick
            ? 'bg-primary text-white shadow-lg shadow-primary/15'
            : 'bg-surface-container-low text-on-surface-variant'
        )}
      >
        {action}
        {onClick ? <Users size={16} /> : null}
      </button>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-3xl border border-outline-variant/40 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-on-surface">{question}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-on-surface-variant">{answer}</p>
    </div>
  );
}
