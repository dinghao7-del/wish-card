import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const checks = [
  {
    name: 'plans table and metadata column',
    table: 'plans',
    select: 'id,family_id,name,type,metadata,sort_order,is_active,created_at,updated_at',
  },
  {
    name: 'tasks plan_id and time columns',
    table: 'tasks',
    select: 'id,family_id,plan_id,title,start_time,deadline,updated_at',
  },
  {
    name: 'habits plan_id column',
    table: 'habits',
    select: 'id,family_id,plan_id,title,updated_at',
  },
  {
    name: 'rewards plan_id column',
    table: 'rewards',
    select: 'id,family_id,plan_id,name,updated_at',
  },
  {
    name: 'star transaction sync timestamp',
    table: 'star_transactions',
    select: 'id,family_id,member_id,created_at',
  },
];

const targetFamilyModelChecks = [
  {
    name: 'families owner account columns',
    table: 'families',
    select: 'id,owner_account_id,plan_tier,data_region,privacy_consent_version,privacy_consent_at',
  },
  {
    name: 'members credential hash columns',
    table: 'members',
    select: 'id,credential_hash,credential_algo,credential_updated_at,last_verified_at',
  },
  {
    name: 'member sessions table',
    table: 'member_sessions',
    select: 'id,family_id,member_id,account_id,token_hash,verification_method,expires_at',
  },
  {
    name: 'operation audit logs table',
    table: 'operation_audit_logs',
    select: 'id,family_id,actor_member_id,account_id,operation_type,target_table,target_id,client_operation_id,payload,created_at',
  },
  {
    name: 'shared schedule templates table',
    table: 'shared_schedule_templates',
    select: 'id,source_family_id,source_plan_id,author_member_id,title,scenario,content,visibility,moderation_status',
  },
  {
    name: 'recommendation consent table',
    table: 'recommendation_consents',
    select: 'id,family_id,consent_scope,enabled,consent_version,decided_by_member_id',
  },
  {
    name: 'recommendation events table',
    table: 'recommendation_events',
    select: 'id,family_id,member_id,category,item_id,event_type,context,created_at',
  },
];

if (process.env.VERIFY_TARGET_FAMILY_MODEL === 'true') {
  checks.push(...targetFamilyModelChecks);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let failed = 0;

for (const check of checks) {
  const { error } = await supabase
    .from(check.table)
    .select(check.select)
    .limit(1);

  if (error) {
    failed += 1;
    console.error(`FAIL ${check.name}: ${error.message}`);
  } else {
    console.log(`OK   ${check.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} schema check(s) failed. Run the matching Supabase migration before deploying.`);
  process.exit(1);
}

console.log('\nSupabase schema is compatible with the current offline-first plan/task flow.');
