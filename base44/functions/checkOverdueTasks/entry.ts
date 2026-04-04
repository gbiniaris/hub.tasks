import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled function: checks all tasks for overdue status and sends notifications
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Get all tasks that are not done/cancelled and have a due date
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $nin: ['done', 'cancelled'] },
      is_overdue: false,
    });

    let overdueCount = 0;
    const notifications = [];

    for (const task of tasks) {
      if (task.due_date && new Date(task.due_date) < new Date()) {
        await base44.asServiceRole.entities.Task.update(task.id, { is_overdue: true });
        overdueCount++;

        if (task.assigned_to_email) {
          notifications.push({
            recipient_email: task.assigned_to_email,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Task "${task.title}" is now past its due date.`,
            entity_type: 'Task',
            entity_id: task.id,
            triggered_by_email: 'system',
          });
        }
      }
    }

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      checked: tasks.length,
      newly_overdue: overdueCount,
      notifications_sent: notifications.length,
    });
  } catch (error) {
    console.error('checkOverdueTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});