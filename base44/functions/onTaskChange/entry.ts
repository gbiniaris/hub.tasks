import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Tracked fields that generate TaskHistory records
const TRACKED_FIELDS = {
  status: 'status_change',
  priority: 'priority_change',
  assigned_to_email: 'reassigned',
  due_date: 'due_date_change',
  description: 'updated',
  project_id: 'updated',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data, changed_fields } = body;
    const { type, entity_id } = event;

    const changedBy = data?.created_by || 'system';

    // --- TASK CREATED ---
    if (type === 'create') {
      await base44.asServiceRole.entities.TaskHistory.create({
        task_id: entity_id,
        changed_by_email: changedBy,
        field_name: 'task',
        old_value: '',
        new_value: data.title || 'New Task',
        change_type: 'created',
      });

      if (data.assigned_to_email && data.assigned_to_email !== changedBy) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: data.assigned_to_email,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to task: "${data.title}"`,
          entity_type: 'Task',
          entity_id: entity_id,
          triggered_by_email: changedBy,
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: data.assigned_to_email,
          subject: `📋 New Task Assigned: "${data.title}"`,
          body: `Hi,\n\nYou have been assigned to a new task by ${changedBy}:\n\nTask:     ${data.title}\nPriority: ${data.priority || 'medium'}\nStatus:   ${data.status?.replace('_', ' ')}\n${data.due_date ? `Due Date: ${new Date(data.due_date).toDateString()}` : ''}\n\nLog in to Task Management Hub to view the task.\n\n—Task Management Hub`,
        });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        action: 'create',
        entity_type: 'Task',
        entity_id: entity_id,
        performed_by_email: changedBy,
        description: `Created task: "${data.title}"`,
        changes: JSON.stringify(data),
      });

      if (data.due_date && new Date(data.due_date) < new Date() && data.status !== 'done' && data.status !== 'cancelled') {
        await base44.asServiceRole.entities.Task.update(entity_id, { is_overdue: true });
      }

      return Response.json({ success: true, action: 'task_created' });
    }

    // --- TASK UPDATED ---
    if (type === 'update' && old_data) {
      const historyRecords = [];
      const notifications = [];

      for (const [field, changeType] of Object.entries(TRACKED_FIELDS)) {
        const oldVal = old_data[field];
        const newVal = data[field];
        if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
          historyRecords.push({
            task_id: entity_id,
            changed_by_email: changedBy,
            field_name: field,
            old_value: String(oldVal ?? ''),
            new_value: String(newVal ?? ''),
            change_type: changeType,
          });
        }
      }

      if (historyRecords.length > 0) {
        await base44.asServiceRole.entities.TaskHistory.bulkCreate(historyRecords);
      }

      // Notification + email: task reassigned
      if (old_data.assigned_to_email !== data.assigned_to_email && data.assigned_to_email) {
        if (data.assigned_to_email !== changedBy) {
          notifications.push({
            recipient_email: data.assigned_to_email,
            type: 'task_assigned',
            title: 'Task Assigned to You',
            message: `You have been assigned to task: "${data.title}"`,
            entity_type: 'Task',
            entity_id: entity_id,
            triggered_by_email: changedBy,
          });
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: data.assigned_to_email,
            subject: `📋 Task Assigned: "${data.title}"`,
            body: `Hi,\n\nYou have been assigned to the following task by ${changedBy}:\n\nTask:     ${data.title}\nPriority: ${data.priority || 'medium'}\nStatus:   ${data.status?.replace('_', ' ')}\n${data.due_date ? `Due Date: ${new Date(data.due_date).toDateString()}` : ''}\n\nLog in to Task Management Hub to view the task.\n\n—Task Management Hub`,
          });
        }
        if (old_data.assigned_to_email && old_data.assigned_to_email !== changedBy) {
          notifications.push({
            recipient_email: old_data.assigned_to_email,
            type: 'task_reassigned',
            title: 'Task Reassigned',
            message: `Task "${data.title}" has been reassigned to another user.`,
            entity_type: 'Task',
            entity_id: entity_id,
            triggered_by_email: changedBy,
          });
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: old_data.assigned_to_email,
            subject: `🔄 Task Reassigned: "${data.title}"`,
            body: `Hi,\n\nThe following task has been reassigned away from you by ${changedBy}:\n\nTask: ${data.title}\n\nLog in to Task Management Hub for more details.\n\n—Task Management Hub`,
          });
        }
      }

      // Notification + email: status changed
      if (old_data.status !== data.status && data.assigned_to_email && data.assigned_to_email !== changedBy) {
        notifications.push({
          recipient_email: data.assigned_to_email,
          type: 'status_changed',
          title: 'Task Status Updated',
          message: `Task "${data.title}" status changed from "${old_data.status}" to "${data.status}"`,
          entity_type: 'Task',
          entity_id: entity_id,
          triggered_by_email: changedBy,
        });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: data.assigned_to_email,
          subject: `🔔 Task Status Updated: "${data.title}"`,
          body: `Hi,\n\n${changedBy} updated the status of a task assigned to you:\n\nTask:       ${data.title}\nOld Status: ${old_data.status?.replace('_', ' ')}\nNew Status: ${data.status?.replace('_', ' ')}\n\nLog in to Task Management Hub to view the task.\n\n—Task Management Hub`,
        });
      }

      if (notifications.length > 0) {
        await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
      }

      // Update overdue flag
      const isOverdue = data.due_date && new Date(data.due_date) < new Date() && data.status !== 'done' && data.status !== 'cancelled';
      if (data.is_overdue !== isOverdue) {
        await base44.asServiceRole.entities.Task.update(entity_id, { is_overdue: isOverdue });

        if (isOverdue && data.assigned_to_email) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: data.assigned_to_email,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Task "${data.title}" is now overdue.`,
            entity_type: 'Task',
            entity_id: entity_id,
            triggered_by_email: 'system',
          });
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: data.assigned_to_email,
            subject: `⚠️ Task Overdue: "${data.title}"`,
            body: `Hi,\n\nThe following task is now overdue:\n\nTask:     ${data.title}\nDue Date: ${new Date(data.due_date).toDateString()}\nStatus:   ${data.status?.replace('_', ' ')}\n\nPlease update the task or contact your manager.\n\n—Task Management Hub`,
          });
        }
      }

      const changes = {};
      if (changed_fields) {
        for (const field of changed_fields) {
          changes[field] = { from: old_data[field], to: data[field] };
        }
      }
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'update',
        entity_type: 'Task',
        entity_id: entity_id,
        performed_by_email: changedBy,
        description: `Updated task: "${data.title}" — fields: ${changed_fields?.join(', ') || 'unknown'}`,
        changes: JSON.stringify(changes),
      });

      return Response.json({ success: true, action: 'task_updated', history_count: historyRecords.length, notification_count: notifications.length });
    }

    // --- TASK DELETED ---
    if (type === 'delete') {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'delete',
        entity_type: 'Task',
        entity_id: entity_id,
        performed_by_email: changedBy,
        description: `Deleted task: "${data?.title || entity_id}"`,
      });

      return Response.json({ success: true, action: 'task_deleted' });
    }

    return Response.json({ success: true, action: 'no_op' });
  } catch (error) {
    console.error('onTaskChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});