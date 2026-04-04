import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setUTCHours(23, 59, 59, 999);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const tasks = await base44.asServiceRole.entities.Task.list('-updated_date', 2000);

  // Group tasks per assignee
  const byUser = {};
  for (const task of tasks) {
    if (!task.assigned_to_email) continue;
    if (['done', 'cancelled'].includes(task.status)) {
      // check if overdue (became overdue in last 24h) — skip done/cancelled from "due today"
      continue;
    }
    if (!byUser[task.assigned_to_email]) byUser[task.assigned_to_email] = { dueToday: [], newlyOverdue: [] };

    if (task.due_date) {
      const due = new Date(task.due_date);
      if (due >= todayStart && due <= todayEnd) {
        byUser[task.assigned_to_email].dueToday.push(task);
      } else if (due >= yesterday && due < todayStart && task.is_overdue) {
        byUser[task.assigned_to_email].newlyOverdue.push(task);
      }
    }
  }

  let emailsSent = 0;
  for (const [email, { dueToday, newlyOverdue }] of Object.entries(byUser)) {
    if (dueToday.length === 0 && newlyOverdue.length === 0) continue;

    const dueTodayLines = dueToday.map(t => `  • [${t.priority?.toUpperCase()}] ${t.title}`).join('\n');
    const overdueLines = newlyOverdue.map(t => `  • [${t.priority?.toUpperCase()}] ${t.title} (was due ${new Date(t.due_date).toDateString()})`).join('\n');

    const body = [
      `Good morning! Here is your task summary for today (${now.toDateString()}):`,
      '',
      dueToday.length > 0 ? `📅 DUE TODAY (${dueToday.length}):\n${dueTodayLines}` : null,
      newlyOverdue.length > 0 ? `⚠️  NEWLY OVERDUE (${newlyOverdue.length}):\n${overdueLines}` : null,
      '',
      'Log in to Task Management Hub to take action.',
    ].filter(l => l !== null).join('\n');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: `📋 Daily Task Summary — ${dueToday.length} due today, ${newlyOverdue.length} newly overdue`,
      body,
    });
    emailsSent++;
  }

  return Response.json({ emailsSent, usersChecked: Object.keys(byUser).length });
});