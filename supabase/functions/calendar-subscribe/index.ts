import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查找订阅
    const { data: sub, error: subError } = await supabase
      .from('calendar_subscriptions')
      .select('id, family_id, name, is_active')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: 'Invalid or expired subscription', detail: subError?.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 查询家庭名称
    const { data: family } = await supabase
      .from('families')
      .select('name')
      .eq('id', sub.family_id)
      .single();

    // 更新最后访问时间
    await supabase
      .from('calendar_subscriptions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', sub.id);

    // 获取任务
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, star_amount, status, is_habit, created_at, assignee_ids')
      .eq('family_id', sub.family_id)
      .eq('completed', false)
      .order('created_at', { ascending: true });

    if (tasksError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch tasks', detail: tasksError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 获取家庭成员
    const { data: members } = await supabase
      .from('members')
      .select('id, name')
      .eq('family_id', sub.family_id)
      .eq('is_active', true);

    const memberMap = new Map((members || []).map((m: any) => [m.id, m.name]));

    // 生成 ICS
    const familyName = family?.name || '愿望卡';
    const now = new Date();
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ForestFamily//WishCard//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICS(familyName)} - 任务日历`,
      'X-WR-TIMEZONE:Asia/Shanghai',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];

    if (tasks) {
      for (const task of tasks) {
        const startDate = formatICSDate(new Date(task.created_at));
        const endDate = formatICSDate(new Date(new Date(task.created_at).getTime() + 3600000));
        const assignees = (task.assignee_ids || []).map((id: string) => memberMap.get(id) || id).join(', ');
        const status = task.status === 'reviewing' ? 'TENTATIVE' : 'CONFIRMED';

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:task-${task.id}@wishcard`,
          `DTSTAMP:${formatICSDate(now)}`,
          `DTSTART:${startDate}`,
          `DTEND:${endDate}`,
          `SUMMARY:${escapeICS(task.title)}`,
          `DESCRIPTION:${escapeICS(`⭐ ${task.star_amount} 星 | 状态: ${task.status}${assignees ? ` | 执行: ${assignees}` : ''}`)}`,
          `STATUS:${status}`,
          `CATEGORIES:${task.is_habit ? '习惯' : '任务'}`,
          'END:VEVENT',
        );
      }
    }

    icsLines.push('END:VCALENDAR');

    const fileName = `wishcard-tasks.ics`;
    return new Response(icsLines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal server error', detail: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(str: string): string {
  return str.replace(/[\\;,\n]/g, (c) => {
    if (c === '\n') return '\\n';
    return '\\' + c;
  });
}
