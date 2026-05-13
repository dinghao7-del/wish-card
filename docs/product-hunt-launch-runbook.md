# WishCard Product Hunt Launch Runbook

This runbook is the launch-day operating document for WishCard's English Product Hunt launch. It assumes the Product Hunt demo, gallery frames, launch copy, video script, analytics, and readiness checklist already exist.

## Official Product Hunt Constraints

Use these as hard launch rules:

- Launch timing: Product Hunt recommends `12:01 AM Pacific Time` when makers are planning ahead.
- Account type: do not use a company account. Product Hunt says company accounts are prohibited.
- Gallery: Product Hunt requires at least 2 gallery images before the gallery is viewable.
- Gallery size: recommended image size is `1270 x 760`.
- Gallery file size: images should be under `3MB`.
- Video: Product Hunt supports YouTube links for videos. Use the full YouTube URL and make sure the video is not private.
- First comment: Product Hunt defines the first comment as the highly visible comment below the gallery; it is a key place for the maker story and product context.

Sources:

- Product Hunt launch guide: `https://www.producthunt.com/launch`
- Product Hunt preparation guide: `https://www.producthunt.com/launch/preparing-for-launch`
- Product Hunt posting help: `https://help.producthunt.com/en/articles/479557-how-to-post-a-product`
- Product Hunt definitions: `https://www.producthunt.com/launch/definitions`

## Launch Position

Product name:

`WishCard`

Product Hunt tagline:

`AI family planner with wish-powered rewards`

Short description:

`WishCard helps busy parents turn family routines, growth plans, and daily tasks into kid-friendly actions. Kids earn stars, redeem wishes, and parents get weekly reviews to keep the whole family rhythm on track.`

Primary launch URL:

`https://YOUR_DOMAIN/demo/product-hunt`

Product category topics:

- Productivity
- Parenting
- Artificial Intelligence
- Kids
- Family

Primary CTA:

`Try the demo family`

Secondary CTA:

`Join early access`

## Submission Worksheet

Fill these fields before creating the Product Hunt draft.

| Field | Final Value | Owner | Status |
| --- | --- | --- | --- |
| Product name | WishCard | Maker | Ready |
| Tagline | AI family planner with wish-powered rewards | Maker | Ready |
| Website URL | `https://YOUR_DOMAIN/demo/product-hunt` | Maker | Replace before draft |
| Thumbnail / icon | WishCard app icon | Designer | Needs final pick |
| Gallery image 1 | `assets/product-hunt/wishcard-ph-gallery-1.png` | Maker | Ready |
| Gallery image 2 | `assets/product-hunt/wishcard-ph-gallery-2.png` | Maker | Ready |
| Gallery image 3 | `assets/product-hunt/wishcard-ph-gallery-3.png` | Maker | Ready |
| Gallery image 4 | `assets/product-hunt/wishcard-ph-gallery-4.png` | Maker | Ready |
| Gallery image 5 | `assets/product-hunt/wishcard-ph-gallery-5.png` | Maker | Ready |
| Video URL | Full YouTube URL | Maker | Record and upload |
| Maker first comment | Copy pack first comment | Maker | Ready |
| Launch date | Chosen PH date | Maker | Decide |
| Launch time | 12:01 AM Pacific / 3:01 PM China during May PDT | Maker | Ready |
| Support list | 50-100 people | Founder | Build |
| Analytics check | PH demo events visible | Maker | Ready |

Operational templates:

- Supporter outreach tracker: `docs/product-hunt-supporter-outreach-template.csv`
- Launch metrics tracker: `docs/product-hunt-launch-metrics-template.csv`
- Comment reply bank: `docs/product-hunt-comment-reply-bank.md`

## Asset Upload Order

Use this exact order in the Product Hunt gallery:

1. `wishcard-ph-gallery-1.png` - From daily chaos to family rhythm
2. `wishcard-ph-gallery-2.png` - AI builds routines from your family profile
3. `wishcard-ph-gallery-3.png` - Turn plans into kid-sized tasks
4. `wishcard-ph-gallery-4.png` - Stars unlock real family wishes
5. `wishcard-ph-gallery-5.png` - Weekly reviews keep everyone aligned
6. YouTube demo video - 45-60 second walkthrough

Why this order:

- The first image explains the problem and positioning.
- The middle three images prove the product loop.
- The fifth image shows the family operating system angle.
- The video is the final confidence builder for users who want to see motion.

## Prelaunch Timeline

Before starting D-7 work, run the automated preflight check:

```bash
npm run ph:preflight
```

The check verifies that the launch route, gallery assets, social preview image, Product Hunt documents, operational templates, and English metadata exist. It also blocks launch if `YOUR_DOMAIN`, `[PRODUCT HUNT URL]`, or `[DEMO URL]` placeholders are still present in launch materials.

### D-7 To D-5

Goal: lock product and message.

- Deploy production demo URL.
- Replace every `YOUR_DOMAIN` placeholder.
- Run desktop and mobile demo QA.
- Confirm no signup wall appears on `/demo/product-hunt`.
- Pick the final app icon for PH.
- Build the first 30-person support list.
- Ask 5 English-speaking testers to complete the demo without guidance.

Exit criteria:

- 4 of 5 testers can describe WishCard as an AI family planner or family routine system.
- No tester describes it only as a chore tracker.

### D-4 To D-3

Goal: prepare PH draft and video.

- Record the 45-60 second demo video from `/demo/product-hunt`.
- Upload the video to YouTube as public or unlisted, not private.
- Create the Product Hunt draft.
- Upload gallery images in the final order.
- Add the YouTube video URL.
- Paste final tagline and description.
- Add makers.
- Save the draft and preview it.

Exit criteria:

- Gallery is visible.
- YouTube video loads in the draft.
- The first gallery thumbnail is readable at small size.

### D-2

Goal: warm the right audience without asking for votes.

- Send the demo to 10-20 parents, educators, and productivity people.
- Ask one question: `What would make this useful enough for your family?`
- Share a teaser on X and LinkedIn.
- Prepare launch-day posts from `docs/product-hunt-launch-copy-pack.md`.
- Confirm the first maker comment is ready.

Exit criteria:

- At least 10 people know the launch is coming.
- Common objections are added to the reply bank.

### D-1

Goal: remove launch-day uncertainty.

- Run final production smoke test.
- Check Product Hunt draft links.
- Check Open Graph preview for the production demo URL.
- Confirm `ph_demo_start`, `ph_demo_task_completed`, `ph_demo_wish_redeemed`, and `ph_waitlist_join` are visible.
- Prepare the launch-day monitoring sheet.
- Block the first 4 hours after launch for comments and quick fixes.

Exit criteria:

- No unresolved blocker remains in `docs/product-hunt-launch-readiness-checklist.md`.

## Launch Day Schedule

Assumption: launch at `12:01 AM Pacific Time`.

For a May launch, this is `3:01 PM Asia/Shanghai` because Pacific Time is on daylight time.

### T-60 Minutes

- Open Product Hunt draft.
- Open production demo URL in desktop and mobile viewport.
- Open analytics dashboard.
- Open launch copy pack.
- Open support list.
- Confirm YouTube video is public or unlisted.

### T-10 Minutes

- Run one full demo path:
  - Start demo
  - View AI plan
  - Generate tasks
  - Complete reading task
  - Redeem museum wish
  - View parent promise
  - View weekly review
- Confirm no console errors.
- Confirm analytics records the path.

### T+0

- Publish the Product Hunt launch.
- Immediately post the maker first comment.
- Open the public Product Hunt URL in an incognito window.
- Verify the website CTA opens the production demo.
- Replace `[PRODUCT HUNT URL]` placeholders in social posts.

### T+15 Minutes

- Share the launch on X.
- Share the launch on LinkedIn.
- Message warm supporters with a feedback request.
- Do not ask for upvotes.

Recommended supporter message:

`WishCard is live on Product Hunt today. I would love your feedback on whether the demo explains the family planning loop clearly: [PRODUCT HUNT URL]`

Use `docs/product-hunt-supporter-outreach-template.csv` to track who has been contacted, replied, and needs follow-up.

### T+30 To T+120 Minutes

- Reply to every meaningful Product Hunt comment.
- Ask follow-up questions when users mention kids, routines, AI, privacy, or pricing.
- Track:
  - Product Hunt rank
  - Comments
  - Demo starts
  - Task completions
  - Wish redemptions
  - Plus clicks
  - Pro clicks
  - Waitlist intent
- Fix broken copy or links immediately.

### T+3 To T+6 Hours

- Post one founder/story thread.
- Share a short demo clip or gallery image.
- Reply to social comments.
- Re-message only people who already asked for the launch link.
- Add repeated objections to the reply bank.

### T+8 To T+12 Hours

- Post a mid-launch update.
- Highlight one insight from user feedback.
- Share a parent-focused use case, not only Product Hunt ranking.
- Check if mobile traffic is completing the demo.

### Final 6 Hours

- Reply to remaining comments.
- Thank early users.
- Invite serious parent/educator commenters to short interviews.
- Export comments and analytics snapshots.

## Comment Response Rules

Default style:

- Short.
- Specific.
- Human.
- Ask one useful follow-up question when appropriate.

Positioning guardrails:

- If someone says `chore app`, answer with the full family planning loop.
- If someone asks about AI, explain that it is a planner using family constraints, not a chatbot.
- If someone asks about children, lead with parent control and no child email requirement.
- If someone asks about pricing, say Product Hunt is being used to validate Plus/Pro interest before charging.

Never:

- Ask for upvotes.
- Argue with negative comments.
- Overpromise clinical, educational, or parenting outcomes.
- Claim the AI replaces parent judgment.

Use `docs/product-hunt-comment-reply-bank.md` for ready-to-send replies and adapt them to the exact comment.

## Launch Metrics Sheet

Create a simple sheet with these columns:

- Time
- Product Hunt rank
- Upvotes
- Comments
- Demo starts
- Demo task completions
- Wish redemptions
- Plus clicks
- Pro clicks
- Waitlist joins
- Notable comments
- Bugs or confusion
- Reply owner
- Next action

Check cadence:

- Every 30 minutes for the first 2 hours.
- Every 2 hours after that.
- Once at the end of the day.

Use `docs/product-hunt-launch-metrics-template.csv` as the launch-day tracker.

## Post-Launch Follow-Up

### Within 24 Hours

- Thank commenters and supporters.
- Export all comments.
- Categorize comments into:
  - Positioning
  - Trust/privacy
  - Pricing
  - AI planning
  - Parent workflow
  - Child motivation
  - Bugs/confusion
- Identify the top 5 changes before the next public push.

### Within 7 Days

- Interview 5-10 interested parents or educators.
- Decide whether Plus or Pro has stronger demand.
- Add the strongest PH quote or badge to the landing page if available.
- Publish a short launch learning post.
- Plan the next acquisition channel after PH.

## Final Go Decision

Launch only if all are true:

- Production `/demo/product-hunt` URL is live.
- Product Hunt gallery has at least 5 images.
- Every gallery image is under 3MB.
- YouTube video link is full URL and not private.
- Maker first comment is ready.
- The first 4 launch hours are blocked for live replies.
- Analytics can show demo starts, task completions, wish redemptions, and waitlist joins.
- The product is positioned as an AI family planner, not only a chore tracker.
