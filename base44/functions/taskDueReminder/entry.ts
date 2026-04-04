import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Fetch all open tasks with a due date
  const tasks = await base44.asServiceRole.entities.Task.list('-due_date', 1000);

  const dueSoon = tasks.filter(t => {
    if (!t.due_date || !t.assigned_to_email) return false;
    if (['done', 'cancelled'].includes(t.status)) return false;
    const due = new Date(t.due_date);
    return due >= in24h && due <= in25h;
  });

  let sent = 0;
  for (const task of dueSoon) {
    const dueStr = new Date(task.due_date).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: task.assigned_to_email,
      subject: `⏰ Reminder: "${task.title}" is due in 24 hours`,
      body: `
Hi,

This is a reminder that the following task is due in approximately 24 hours:

Task:     ${task.title}
Due Date: ${dueStr}
Priority: ${task.priority || 'medium'}
Status:   ${task.status?.replace('_', ' ')}

Please make sure to complete it on time or update its status.

—Task Management Hub
      `.trim(),
    });
    sent++;
  }

  return Response.json({ checked: tasks.length, remindersSent: sent });
});