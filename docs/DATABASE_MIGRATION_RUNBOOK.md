# Database Migration Runbook

## Current Required Migration

Run `supabase-plans-migration.sql` before deploying the offline-first plan flow.
Run `supabase-reward-redemption-idempotency.sql` before enabling offline reward approval in production.
Run `supabase-task-time-fields-migration.sql` before enabling synced parent fulfillment reminders in production.
Review `supabase-role-permissions-draft.sql` before enabling production writes from untrusted clients.
Review `supabase-family-account-model-draft.sql` before migrating to the final "one family account with PIN-switched members" model.

This migration is required because the app now stores and syncs:

- `plans`
- `plans.metadata`
- `tasks.plan_id`
- `tasks.start_time`
- `tasks.deadline`
- `habits.plan_id`
- `rewards.plan_id`

The target family account model also needs:

- `families.owner_account_id`
- member credential hash fields
- `member_sessions`
- `operation_audit_logs`
- `shared_schedule_templates`
- `recommendation_consents`
- `recommendation_events`

`plans.metadata` stores the actual planning payload: daily schedule, grade, timezone, and weekly activities. Without it, plans can be created locally but will fail when syncing to Supabase.

`tasks.start_time` and `tasks.deadline` support parent fulfillment reminders, period-based quadrant analysis, and offline-first task timing. The client has a temporary legacy-schema fallback: if these columns are missing, it retries task sync without those fields. That protects sync from getting stuck, but the timing data will not sync across devices until the migration is applied.

## Verification

After running the migration, verify the database shape:

```bash
npm run db:verify
```

The command needs one of these env pairs:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

or:

```bash
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Expected result:

```text
OK   plans table and metadata column
OK   tasks plan_id and time columns
OK   habits plan_id column
OK   rewards plan_id column
OK   star transaction sync timestamp
```

## Release Rule

Do not release the offline-first plan and reward flow until:

- `supabase-plans-migration.sql` has been applied.
- `supabase-reward-redemption-idempotency.sql` has been applied.
- `supabase-task-time-fields-migration.sql` has been applied.
- `supabase-role-permissions-draft.sql` has been reviewed and adapted to the final auth/member-session model.
- `supabase-family-account-model-draft.sql` has been reviewed in a test database before any production auth-model migration.
- `npm run db:verify` passes against the target Supabase project.
