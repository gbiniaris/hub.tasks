import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { event, data } = body;
  if (!data) return Response.json({ skipped: true });

  const entityType = event?.entity_name; // 'TaskComment' or 'TaskAttachment'

  const taskId = data.task_id;
  if (!taskId) return Response.json({ skipped: 'no task_id' });

  // Fetch the parent task
  const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
  const task = tasks[0];
  if (!task) return Response.json({ skipped: 'task not found' });

  // Determine who triggered the activity and who to notify
  const actorEmail = entityType === 'TaskComment' ? data.author_email : data.uploaded_by_email;
  const ownerEmail = task.assigned_to_email;

  // Don't notify if the owner IS the actor
  if (!ownerEmail || ownerEmail === actorEmail) {
    return Response.json({ skipped: 'owner is actor or no owner' });
  }

  let subject, body_text;
  if (entityType === 'TaskComment') {
    subject = `💬 New comment on "${task.title}"`;
    body_text = `
Hi,

${actorEmail} left a new comment on a task assigned to you:

Task:    ${task.title}
Comment: ${data.content || '(no content)'}

Log in to view the full conversation.

—Task Management Hub
    `.trim();
  } else {
    subject = `📎 New attachment on "${task.title}"`;
    body_text = `
Hi,

${actorEmail} uploaded a file to a task assigned to you:

Task: ${task.title}
File: ${data.file_name || 'attachment'}

Log in to view the attachment.

—Task Management Hub
    `.trim();
  }

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: ownerEmail,
    subject,
    body: body_text,
  });

  return Response.json({ sent: true, to: ownerEmail });
});