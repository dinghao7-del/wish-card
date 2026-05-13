# Security And Conflict Rules

## Permission Rules

The app currently uses one authenticated family account with member switching under that account. Because of that, every write operation must record and respect the current family member, not only the authenticated account.

Current front-end rules:

- Parents can create, edit, delete, and approve tasks.
- Children can complete tasks and request reward redemption.
- Parents can create, edit, delete, and approve rewards.
- Parents can add, edit, and delete family members.
- A member can update their own local profile credentials, such as PIN/password.
- Sensitive actions require an extra parent confirmation when a parent PIN/password exists: deleting members, changing member credentials, and approving high-value reward redemption.

Front-end checks are only a usability and offline safety layer. Supabase policies or server functions must enforce the same rules before production use.

## Server-Side Role Model Caveat

The existing Supabase schema mostly assumes `auth.uid() = members.id`.

The product direction is different: one authenticated family account can contain multiple PIN-switched members. Under that model, Supabase RLS can reliably enforce family-account isolation, but it cannot cryptographically know which PIN member is currently active unless the app introduces a server-verified member session.

Use `supabase-role-permissions-draft.sql` as a transition guard for the current auth model. Before production-grade child/parent separation, add one of these:

- RPC-only writes that receive `actor_member_id` and validate a short-lived member session token.
- Separate auth identities per member.
- A signed member-session table created after PIN/password verification.

## Sync Conflict Rules

The current sync engine uses last-write-wins with field-level merge exceptions:

- Member `stars`: keep the larger value during remote/local conflict.
- Task `current_count`: keep the larger value.
- Task `status`: only move forward by status priority.

Reward redemption needs stricter production rules:

- A reward can move from `available` to `pending_approval` only once.
- A reward can move from `pending_approval` to `redeemed` only by a parent/admin member.
- Star spending must be idempotent. The same reward redemption must not create duplicate negative star transactions.
- Local reward spend transactions use a stable transaction ID based on family, member, and reward.
- Supabase should run `supabase-reward-redemption-idempotency.sql` so one reward can produce only one `spend` transaction.

## Required Server-Side Follow-Up

Before release, add database-side enforcement for:

- Current member role validation for task approval and reward approval.
- Family isolation for every table.
- Idempotency for `star_transactions` linked to reward redemption.
- Rejecting reward approval if the requester no longer has enough stars at sync time.
