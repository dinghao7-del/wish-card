# Parent Child Feedback Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight parent-child feedback card inside the existing reward/penalty area without adding a new top-level menu.

**Architecture:** Reuse the existing task data model. Feedback cards are zero-star tasks marked by a stable description token, children can create them for parents, and parents can acknowledge or convert them into a promise task.

**Tech Stack:** React, Taro, Supabase tasks table, existing FamilyContext and HabitRewards screens.

---

### Task 1: Add Shared Feedback Task Helpers

**Files:**
- Modify: `src/context/FamilyContext.tsx`

- [x] **Step 1: Add constants and builders**

Add a `PARENT_FEEDBACK_MARKER`, a parser for feedback source ids, and a builder that creates a zero-star reviewing task assigned to the chosen parent.

- [x] **Step 2: Add context methods**

Expose `submitParentFeedback(parentId, title, detail)` and `respondParentFeedback(feedbackTaskId, mode)`.

- [x] **Step 3: Implement behavior**

Children can submit feedback. Parents can acknowledge it or create a promise task assigned to themselves. Guest mode uses local state; online mode uses DataLayer.

### Task 2: Add Web Feedback Tab

**Files:**
- Modify: `src/pages/HabitRewards.tsx`

- [x] **Step 1: Extend tab state**

Change the tab union from `reward | penalty` to `reward | penalty | feedback`.

- [x] **Step 2: Render feedback cards**

For children, show quick feedback templates and a parent selector. For parents, show pending feedback and actions.

- [x] **Step 3: Keep menu simple**

Do not add a new bottom navigation item or route.

### Task 3: Add Mini Program Feedback Tab

**Files:**
- Modify: `miniprogram/src/pages/habits/index.tsx`

- [x] **Step 1: Extend tab state**

Add `feedback` to the tab union.

- [x] **Step 2: Persist feedback**

Insert feedback as a zero-star reviewing task with the same marker used by Web.

- [x] **Step 3: Parent response**

Allow parents to mark feedback as completed or create a promise task from it.

### Task 4: Verify

**Commands:**
- `npm run lint`
- `npm run build`
- `cd miniprogram && npm run build:weapp`

**Expected:** All commands complete successfully. Existing Sass deprecation warnings in the mini program build are acceptable.
