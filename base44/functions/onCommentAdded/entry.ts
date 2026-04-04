import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entity automation handler: triggered when a TaskComment is created
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event.type !== 'create') {
      return Response.json({ success: true, action: 'no_op' });
    }

    const comment = data;
    const notifications = [];

    // Get the task to find the assigned user
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: comment.task_id });
    const task = tasks[0];

    if (!task) {
      return Response.json({ success: true, action: 'task_not_found' });
    }

    // Notify task assignee (if not the commenter)
    if (task.assigned_to_email && task.assigned_to_email !== comment.author_email) {
      notifications.push({
        recipient_email: task.assigned_to_email,
        type: 'comment_added',
        title: 'New Comment on Your Task',
        message: `${comment.author_email} commented on "${task.title}": "${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}"`,
        entity_type: 'Task',
        entity_id: task.id,
        triggered_by_email: comment.author_email,
      });
    }

    // Notify mentioned users
    if (comment.mentions && comment.mentions.length > 0) {
      for (const mentionedEmail of comment.mentions) {
        if (mentionedEmail !== comment.author_email && mentionedEmail !== task.assigned_to_email) {
          notifications.push({
            recipient_email: mentionedEmail,
            type: 'mention',
            title: 'You Were Mentioned',
            message: `${comment.author_email} mentioned you in a comment on "${task.title}"`,
            entity_type: 'Task',
            entity_id: task.id,
            triggered_by_email: comment.author_email,
          });
        }
      }
    }

    // Notify task collaborators
    const collaborators = await base44.asServiceRole.entities.TaskCollaborator.filter({ task_id: task.id });
    for (const collab of collaborators) {
      const alreadyNotified = notifications.some(n => n.recipient_email === collab.user_email);
      if (collab.user_email !== comment.author_email && !alreadyNotified) {
        notifications.push({
          recipient_email: collab.user_email,
          type: 'comment_added',
          title: 'New Comment on Collaborated Task',
          message: `${comment.author_email} commented on "${task.title}"`,
          entity_type: 'Task',
          entity_id: task.id,
          triggered_by_email: comment.author_email,
        });
      }
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'create',
      entity_type: 'TaskComment',
      entity_id: event.entity_id,
      performed_by_email: comment.author_email || comment.created_by,
      description: `Comment added on task "${task.title}"`,
    });

    return Response.json({ success: true, notifications_sent: notifications.length });
  } catch (error) {
    console.error('onCommentAdded error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});