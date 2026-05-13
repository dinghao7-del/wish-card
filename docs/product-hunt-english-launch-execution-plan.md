# WishCard Product Hunt English Launch Execution Plan

> Date: 2026-05-14
> Goal: Prepare WishCard for an English Product Hunt launch as an AI family planner with wish-powered rewards.

## 1. Launch Positioning

### Product Name

Use `WishCard` as the only external English launch name.

Do not use `Forest Family`, `星愿卡`, or mixed bilingual naming in Product Hunt materials, screenshots, demo routes, or landing copy.

### Core Positioning

WishCard is an AI family planner that turns family routines, kids' growth plans, and daily tasks into kid-friendly actions, stars, wishes, and weekly reviews.

### Product Hunt Tagline

Primary:

`AI family planner with wish-powered rewards`

Backup options:

- `Turn family plans into kids' daily action`
- `Plan routines, motivate kids, and fulfill wishes`
- `The AI copilot for family routines and kids' growth`

### Main Narrative

Busy families do not only need reminders. They need a complete loop:

1. Understand the family.
2. Build a realistic routine.
3. Turn the routine into daily actions.
4. Help kids feel progress.
5. Turn earned stars into real wishes.
6. Help parents keep those promises.
7. Review and adjust the next cycle.

### What Not To Say

Avoid leading with:

- Chore tracker
- Kids reward app
- Family todo list
- Habit tracker for kids

These are too small for the product's real scope and make WishCard look like a crowded niche app.

## 2. Launch Success Targets

### Product Hunt Targets

| Tier | Outcome |
| --- | --- |
| Minimum success | Top 10, 1,000+ visits, 100+ signups, 20+ comments |
| Strong launch | Top 5, 3,000+ visits, 300+ signups, 50+ comments |
| Breakout launch | Product of the Day, 10,000+ visits, 1,000+ signups, 100+ comments |

### Business Validation Targets

Track these even if Product Hunt rank is modest:

- 100-300 English-speaking families try the demo or app.
- 30+ users complete the no-signup demo path.
- 20+ meaningful comments mention family planning, routines, AI, rewards, or weekly review.
- 20+ users join the Plus or Pro waitlist.
- 10+ parents agree to follow-up interviews.

## 3. Launch Scope

### Must Show In Product Hunt Demo

The launch demo should show one complete loop:

1. Parent creates or loads a family profile.
2. AI generates a weekly routine.
3. The routine becomes daily tasks.
4. A child completes tasks and earns stars.
5. The child redeems a wish.
6. The parent receives a fulfillment reminder.
7. The weekly report summarizes progress and suggests next steps.

### Product Hunt Demo Family

Use a fixed English demo family:

- Parent: Emma
- Child: Leo
- Leo age: 8
- Context: Busy school week
- Parent pain: Too much reminding, homework friction, inconsistent bedtime
- Child goal: Homework rhythm, reading, piano, bedtime
- Wish: Saturday museum trip
- Reward currency: Stars

### Launch Demo Route

Recommended route:

`/demo/product-hunt`

The route should require no registration and should use deterministic demo data.

## 4. Product Workstreams

### Workstream A: English Launch Surface

Owner: Frontend / product

Purpose: Make the external-facing launch experience clear to English users.

Deliverables:

- English landing page.
- Product Hunt demo route.
- English demo copy.
- English Open Graph metadata.
- Product Hunt CTA buttons.

Acceptance criteria:

- A new visitor can understand the product in 60 seconds.
- The first CTA is `Try Demo Family`.
- The second CTA is `Join Early Access`.
- No Chinese copy appears in the Product Hunt landing path.
- No mixed `Forest Family / WishCard` branding appears in the launch surface.

Suggested landing page structure:

1. Hero
   - H1: `Plan family routines. Motivate kids. Fulfill wishes.`
   - Subhead: `WishCard is an AI family planner that turns routines into kid-friendly tasks, rewards, and weekly progress reviews.`
   - CTA: `Try Demo Family`
   - Secondary CTA: `Join Early Access`
2. Loop section
   - Family profile
   - AI weekly plan
   - Daily tasks
   - Stars and wishes
   - Weekly review
3. Parent trust section
   - Parent-controlled data
   - No child email required
   - No child-facing ads
   - Anonymized community templates
4. Pricing waitlist
   - Free
   - Plus
   - Pro

### Workstream B: Product Hunt Demo Flow

Owner: Frontend / product logic

Purpose: Make the product feel real without requiring signup or live AI calls.

Deliverables:

- Demo family data set.
- Demo AI weekly plan.
- Demo task list generated from plan.
- Demo child completion state.
- Demo reward redemption state.
- Demo parent fulfillment task.
- Demo weekly review.

Acceptance criteria:

- Demo loads in under 3 seconds on a typical connection.
- Demo does not require auth, Clerk, Supabase session, or API key.
- User can click through the loop in 3-5 minutes.
- Demo state can reset.
- Every step has a visible next action.

Recommended demo sequence:

1. `Meet Emma and Leo`
2. `Build Leo's weekly rhythm`
3. `Turn plan into daily tasks`
4. `Complete today's reading task`
5. `Earn stars`
6. `Redeem Saturday museum trip`
7. `Parent promise created`
8. `Weekly review`

### Workstream C: AI Family Planner Story

Owner: Product / AI

Purpose: Make the existing AI planning capability visible and understandable.

Deliverables:

- English AI plan output sample.
- English family profile summary.
- English explanation of assumptions.
- English parent tips.
- English plan-to-task explanation.

Acceptance criteria:

- AI planning is presented as a planner, not a chatbot.
- The user sees why the plan was generated.
- The user sees which tasks came from which routine slots.
- The demo can run with fixed AI output to avoid launch-day instability.

Demo AI plan sample:

- 7:30 AM: Morning checklist
- 4:30 PM: Snack and reset
- 5:00 PM: Homework focus block
- 5:45 PM: Reading mission
- 6:20 PM: Piano practice
- 8:30 PM: Bedtime wind-down

### Workstream D: Wish Loop And Parent Promise

Owner: Product / frontend

Purpose: Show the feature that differentiates WishCard from ordinary reward apps.

Deliverables:

- English wish reward screen.
- `Museum Trip` reward card.
- Redemption confirmation.
- Parent fulfillment task.
- Weekly report mention of fulfilled or pending wish.

Acceptance criteria:

- A viewer understands that a wish is a family promise, not just a digital badge.
- Parent-side task says exactly what should happen next.
- Weekly review references the promise loop.

Recommended copy:

- Reward card: `Saturday Museum Trip`
- Child message: `Leo has enough stars to unlock this wish.`
- Parent task: `Fulfill Leo's museum trip wish`
- Parent reminder: `Leo used 30 stars for this wish. Pick a time this weekend and keep the promise visible.`

### Workstream E: Weekly Review

Owner: Product / frontend

Purpose: Show that WishCard is a cycle-management system, not a one-off task tool.

Deliverables:

- English weekly report demo.
- Child highlights.
- Parent focus.
- Next week adjustment.

Acceptance criteria:

- Report feels encouraging, not like a management dashboard.
- It mentions tasks, habits, wishes, and next-week rhythm.
- It includes one useful recommendation.

Recommended report sections:

- `Leo's wins this week`
- `Stars earned`
- `Family promises`
- `What to protect next week`
- `What to simplify`

### Workstream F: Privacy And Trust

Owner: Product / legal copy / engineering review

Purpose: Reduce concerns around child data, AI, and commercial recommendations.

Deliverables:

- English privacy summary page.
- Product Hunt FAQ.
- Landing page trust section.
- Child account explanation.

Acceptance criteria:

- Users understand children do not need email or phone accounts.
- Users understand parents control family data.
- Users understand child-facing ads are not part of the model.
- Users understand community templates are anonymized by default.
- Users understand recommendations are opt-in.

Recommended FAQ entries:

- `Do children need their own accounts?`
- `Does WishCard show ads to kids?`
- `Can I use WishCard without sharing private family details?`
- `How does AI use family profile data?`
- `Can I delete or export my family data?`

### Workstream G: Pricing Validation

Owner: Product / growth

Purpose: Test subscription intent without forcing payment during Product Hunt.

Deliverables:

- Pricing waitlist section.
- Plus waitlist CTA.
- Pro waitlist CTA.
- Analytics events for plan interest.

Acceptance criteria:

- Free plan looks useful.
- Plus and Pro communicate clear extra value.
- Users can join a waitlist without entering payment.

Recommended pricing:

Free:

- Family members
- Tasks and habits
- Stars and wishes
- Basic templates
- Simple weekly review

Plus:

- AI weekly family plans
- Plan-to-task generation
- Advanced weekly and monthly reports
- Multi-child planning
- Calendar sync

Pro:

- Holiday and summer break planning
- Term plans
- AI quadrant prioritization
- Community template adaptation
- Expert template packs
- Deep growth reports

## 5. Marketing Asset Workstreams

### Product Hunt Gallery

Create 5 gallery images with these titles:

1. `From daily chaos to family rhythm`
2. `AI builds routines from your family profile`
3. `Turn plans into kid-sized tasks`
4. `Stars unlock real family wishes`
5. `Weekly reviews keep everyone aligned`

Acceptance criteria:

- Each image works without reading the Product Hunt description.
- Each image uses English only.
- Images show product UI, not abstract illustrations only.
- The sequence tells the complete loop.

### Demo Video

Length: 45-60 seconds.

Structure:

1. 0-5s: Busy parents are tired of reminding.
2. 5-15s: WishCard builds a weekly family plan.
3. 15-25s: Plan turns into kid-friendly tasks.
4. 25-35s: Kids earn stars and redeem wishes.
5. 35-45s: Parents get fulfillment reminders.
6. 45-60s: Weekly review helps the family adjust.

Acceptance criteria:

- Captions are readable on mobile.
- The product UI appears within the first 5 seconds.
- The full loop is visible.
- No Chinese UI appears.

Production handoff:

- Use `docs/product-hunt-demo-video-script.md` for the voiceover, captions, shot list, and recording checklist.
- Primary recording route: `/demo/product-hunt`.
- Backup closing visuals: `/demo/product-hunt/gallery`.

### Product Hunt Page Copy

Product name:

`WishCard`

Tagline:

`AI family planner with wish-powered rewards`

Description:

`WishCard helps busy parents turn family routines, growth plans, and daily tasks into kid-friendly actions. Kids earn stars, redeem wishes, and parents get weekly reviews to keep the whole family rhythm on track.`

Topics:

- Artificial Intelligence
- Productivity
- Parenting
- Kids
- Family

Full copy pack:

- Use `docs/product-hunt-launch-copy-pack.md` for the Product Hunt page copy, maker first comment, launch replies, social posts, outreach messages, website microcopy, and FAQ short answers.

Launch readiness checklist:

- Use `docs/product-hunt-launch-readiness-checklist.md` for the final Go / No-Go gate, analytics QA, production replacement list, and launch-day monitoring plan.

Launch runbook:

- Use `docs/product-hunt-launch-runbook.md` for the Product Hunt submission worksheet, official launch constraints, asset upload order, D-7 prelaunch actions, launch-day schedule, comment response rules, and post-launch follow-up.

### Maker First Comment

Use this draft and revise before launch:

`Hi Product Hunt, I’m building WishCard because family life often breaks down not from big problems, but from repeated planning, reminding, checking, and negotiating every day.`

`WishCard is an AI family planner that turns a child’s profile and family constraints into weekly routines, then converts those routines into daily tasks kids can actually follow.`

`The part I care about most is the wish loop: kids earn stars, redeem real wishes, and parents get gentle reminders to fulfill those promises. The goal is not to gamify parenting for its own sake, but to help families build trust, rhythm, and positive motivation.`

`I’d love feedback from parents, educators, and builders: what would make this genuinely useful for your family?`

## 6. Analytics And Measurement

### Required Events

Track these Product Hunt launch events:

- `ph_landing_view`
- `ph_demo_start`
- `ph_demo_family_profile_view`
- `ph_demo_ai_plan_view`
- `ph_demo_tasks_generated`
- `ph_demo_task_completed`
- `ph_demo_wish_redeemed`
- `ph_demo_parent_promise_view`
- `ph_demo_weekly_report_view`
- `ph_waitlist_join`
- `ph_pricing_plus_click`
- `ph_pricing_pro_click`
- `ph_gallery_frames_click`
- `ph_full_guest_app_click`
- `ph_demo_reset`

Implementation:

- Product Hunt demo events are recorded through `src/lib/productHuntAnalytics.ts`.
- Events are persisted locally for QA and forwarded to `dataLayer`, `gtag`, or `plausible` when those adapters exist.

### Launch Dashboard Metrics

Check every 2 hours on launch day:

- Product Hunt rank
- Upvotes
- Comments
- Landing visits
- Demo starts
- Demo completions
- Signup or waitlist conversion
- Plus and Pro interest clicks
- Most common comment themes

## 7. Four-Week Timeline

### Week 1: Positioning And English Surface

Goal: Make the product externally understandable.

Tasks:

- Finalize English positioning and tagline.
- Create Product Hunt landing page copy.
- Create demo family story.
- Define demo route and demo data.
- Write privacy and trust copy.
- Remove mixed branding from launch path.

Deliverables:

- English launch copy pack.
- Demo family data spec.
- Landing page wireframe.
- Privacy FAQ draft.

Exit criteria:

- A new English user can describe the product after reading the landing page.
- Launch path has one brand name: WishCard.

### Week 2: Demo Loop

Goal: Build a no-signup demo that shows the full family OS loop.

Tasks:

- Implement or assemble demo family route.
- Add deterministic AI plan sample.
- Show plan-to-task transformation.
- Add task completion interaction.
- Add wish redemption interaction.
- Add parent fulfillment task.
- Add weekly report demo state.

Deliverables:

- Clickable Product Hunt demo.
- Demo reset behavior.
- Demo QA checklist.

Exit criteria:

- A user can complete the demo in 3-5 minutes.
- No auth or API dependency blocks the demo.

### Week 3: Assets And Trust

Goal: Prepare launch materials and remove confidence blockers.

Tasks:

- Produce 5 Product Hunt gallery images.
- Record 45-60 second demo video.
- Add Open Graph image and metadata.
- Finish privacy FAQ.
- Run mobile visual QA.
- Run English copy review.
- Invite 10-20 external testers.

Deliverables:

- Final gallery images.
- Final demo video.
- FAQ page.
- Tester feedback summary.

Exit criteria:

- 80% of testers understand that WishCard is an AI family planner, not just a chore app.
- At least 5 testers complete the demo without guidance.

### Week 4: Prelaunch And Launch Ops

Goal: Build momentum and prepare launch-day execution.

Tasks:

- Complete Product Hunt maker profile.
- Prepare Product Hunt draft.
- Prepare maker first comment.
- Prepare X, LinkedIn, Reddit, Indie Hackers posts.
- Build support list of 50-100 people.
- Schedule launch-day response blocks.
- Final QA on production URL.

Deliverables:

- Product Hunt draft ready.
- Social post pack.
- Supporter list.
- Launch day SOP.

Exit criteria:

- Production demo URL is stable.
- Supporters know the launch date.
- Team knows who responds to comments and issues.

## 8. Launch Day SOP

### Before Launch

- Final production smoke test.
- Confirm demo route works without login.
- Confirm video and gallery assets load.
- Confirm maker profile and product page copy.
- Prepare response snippets for common questions.

### Launch Time

Recommended timing:

`12:01 AM Pacific Time`

Actions:

- Publish Product Hunt page.
- Post maker first comment immediately.
- Share with internal supporters.
- Share on X and LinkedIn.
- Monitor first 30 minutes for broken links or confusing comments.

### First 6 Hours

Actions:

- Reply to every meaningful Product Hunt comment.
- Ask clarifying questions instead of only saying thanks.
- Track demo completion and waitlist events.
- Fix critical copy or broken-link issues immediately.

### Midday Push

Actions:

- Share a behind-the-scenes thread.
- Highlight one comment or insight.
- Share the demo video.
- Invite parenting, education, and productivity communities.

### Final 6 Hours

Actions:

- Re-engage people who said they would check it out.
- Post a progress update.
- Ask for feedback, not votes.
- Capture all recurring objections.

### After Launch

Within 24 hours:

- Export feedback.
- Categorize comments.
- Identify top 5 product issues.
- Send thank-you update.
- Invite interested parents to interviews.

Within 7 days:

- Publish launch learnings.
- Fix highest-impact onboarding/demo issues.
- Follow up with waitlist users.
- Decide whether to prioritize Plus, Pro, or free growth.

## 9. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Users think it is a chore tracker | Weak positioning | Lead with AI family planner and weekly routine loop |
| Product feels too broad | Confusion | Demo only one family and one complete loop |
| AI output fails on launch day | Broken demo | Use deterministic AI sample for PH demo |
| Child data concern | Trust loss | Put privacy and parent control near the demo CTA |
| Registration friction | Low conversion | First CTA is no-signup demo |
| English copy feels translated | Lower credibility | Native-style copy review before launch |
| Too many features shown | Lost story | Hide non-launch modules from PH path |

## 10. Go / No-Go Checklist

Launch only when all are true:

- Product Hunt route uses English only.
- Product name is consistently WishCard.
- No-signup demo works on desktop and mobile.
- Demo shows the complete loop from family profile to weekly review.
- Five gallery images are ready.
- Demo video is ready.
- Privacy FAQ is ready.
- Product Hunt draft is complete.
- Maker first comment is ready.
- At least 10 external users have tested the demo.
- Analytics events are working.
- Production URL has passed smoke testing.

## 11. Recommended First Implementation Order

1. Create demo family data.
2. Create Product Hunt demo route.
3. Build English landing page.
4. Add deterministic AI plan sample.
5. Add plan-to-task demo.
6. Add wish redemption and parent promise demo.
7. Add weekly report demo.
8. Add privacy FAQ.
9. Add waitlist/pricing intent capture.
10. Produce gallery and video assets from the working demo.
