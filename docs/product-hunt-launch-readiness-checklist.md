# Product Hunt Launch Readiness Checklist

This checklist turns the English Product Hunt package into a launch-day operating plan. Use it as the final gate before submitting WishCard to Product Hunt.

## Current Readiness

Status: launch package ready for production deployment.

Automated check:

```bash
npm run ph:preflight
```

Run this after replacing production links and before creating the Product Hunt draft.

Completed assets:

- English interactive demo: `/demo/product-hunt`
- Product Hunt gallery frames: `/demo/product-hunt/gallery`
- Gallery PNG exports: `assets/product-hunt/wishcard-ph-gallery-1.png` through `wishcard-ph-gallery-5.png`
- Social preview image: `/product-hunt/wishcard-ph-og.png`
- Demo video script: `docs/product-hunt-demo-video-script.md`
- Launch copy pack: `docs/product-hunt-launch-copy-pack.md`
- Launch runbook: `docs/product-hunt-launch-runbook.md`
- Supporter outreach tracker: `docs/product-hunt-supporter-outreach-template.csv`
- Launch metrics tracker: `docs/product-hunt-launch-metrics-template.csv`
- Comment reply bank: `docs/product-hunt-comment-reply-bank.md`
- Analytics event adapter: `src/lib/productHuntAnalytics.ts`

## Replace Before Launch

- Replace `https://YOUR_DOMAIN/demo/product-hunt` in launch copy with the production URL.
- Replace `[PRODUCT HUNT URL]` after the Product Hunt page is created.
- Confirm the production demo route loads without login.
- Confirm the full guest app CTA opens the intended English guest experience.
- Confirm Open Graph and Twitter previews show the WishCard title, description, and preview image.
- Confirm the Product Hunt draft follows `docs/product-hunt-launch-runbook.md`.
- Confirm `npm run ph:preflight` has zero blockers after production links are replaced.
- Fill the first 30 supporter rows in `docs/product-hunt-supporter-outreach-template.csv`.
- Prepare `docs/product-hunt-launch-metrics-template.csv` for launch-day tracking.
- Record and export the final demo video using the script.
- Upload the five gallery PNGs in the planned order.

## Product Hunt Page

Recommended page setup:

- Name: `WishCard`
- Tagline: `An AI family operating system that turns plans into kid-sized action.`
- Primary URL: production `/demo/product-hunt` URL
- Topics: `Productivity`, `Parenting`, `AI`, `Family`, `Kids`
- Gallery order: problem, AI plan, kid tasks, wish rewards, weekly review
- First maker comment: use the copy pack section `Maker First Comment`

Go condition:

- The first screenshot explains the product without reading the description.
- The tagline says what the product does in one sentence.
- The demo can be understood in under 60 seconds.

## Demo Flow QA

Desktop:

- Open `/demo/product-hunt`.
- Click `Start the demo`.
- Advance through the family profile, AI plan, and tasks.
- Complete the reading task.
- Redeem the museum wish.
- Confirm the parent promise and weekly review screens appear.
- Click `Reset demo` and confirm the demo returns to the first step.

Mobile:

- Repeat the same flow at a mobile width.
- Confirm no key CTA text wraps awkwardly.
- Confirm the AI plan and task cards remain readable.
- Confirm the gallery CTA remains reachable.

Go condition:

- No login wall appears.
- No console errors appear during the main flow.
- The user can finish the core loop without explanation.

## Analytics QA

The demo stores local launch-event evidence and forwards events to common analytics adapters when available.

Required event path:

- `ph_landing_view`
- `ph_demo_start`
- `ph_demo_family_profile_view`
- `ph_demo_ai_plan_view`
- `ph_demo_tasks_generated`
- `ph_demo_task_completed`
- `ph_demo_wish_redeemed`
- `ph_demo_parent_promise_view`
- `ph_demo_weekly_report_view`

CTA events:

- `ph_gallery_frames_click`
- `ph_full_guest_app_click`
- `ph_pricing_plus_click`
- `ph_pricing_pro_click`
- `ph_waitlist_join`
- `ph_demo_reset`

Manual verification:

```js
JSON.parse(localStorage.getItem('wishcard.productHuntEvents.v1') || '[]').map((event) => event.name)
```

Go condition:

- Core demo events are recorded in order.
- Plus and Pro CTAs record both pricing intent and waitlist intent.
- Production analytics receives events through `dataLayer`, `gtag`, or `plausible` if those adapters are installed.

## Launch-Day Monitoring

First 2 hours:

- Watch Product Hunt comments every 10-15 minutes.
- Reply with concise, specific answers.
- Track demo starts, completed tasks, redeemed wishes, and waitlist intent.
- Capture repeated objections and add them to replies.
- Share the launch post through X, LinkedIn, Indie Hackers, founder groups, and parenting/productivity communities.

Do:

- Ask for feedback, comments, and questions.
- Explain the family operating system positioning.
- Show that the product is already usable in guest mode.

Avoid:

- Asking for upvotes.
- Overexplaining AI before showing the routine-to-action loop.
- Positioning only as a chore or reward app.

## Go / No-Go

Go if:

- Production demo URL is stable.
- Demo works on desktop and mobile.
- Gallery exports are uploaded and readable.
- Demo video is uploaded.
- Maker comment and replies are ready.
- Analytics events are visible.
- A launch-day response owner is available for the first 4 hours.

No-go if:

- The demo requires login.
- The core loop breaks before wish redemption.
- Mobile layout hides or overlaps primary actions.
- Production analytics cannot distinguish demo starts from ordinary traffic.
- The team cannot respond to launch comments during the first half day.
