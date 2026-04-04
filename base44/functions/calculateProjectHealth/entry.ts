import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { project_id } = body;

    // If a specific project_id is given, calculate for that project only
    // Otherwise calculate for all active projects
    let projects;
    if (project_id) {
      const project = await base44.asServiceRole.entities.Project.filter({ id: project_id });
      projects = project;
    } else {
      projects = await base44.asServiceRole.entities.Project.filter({ status: 'active' });
    }

    const results = [];

    for (const project of projects) {
      const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
      
      if (tasks.length === 0) {
        await base44.asServiceRole.entities.Project.update(project.id, {
          completion_percentage: 0,
          health: 'on_track',
        });
        results.push({ project_id: project.id, name: project.name, completion: 0, health: 'on_track', task_count: 0 });
        continue;
      }

      // Calculate completion percentage
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const cancelledTasks = tasks.filter(t => t.status === 'cancelled').length;
      const activeTasks = tasks.length - cancelledTasks;
      const completionPercentage = activeTasks > 0 ? Math.round((completedTasks / activeTasks) * 100) : 0;

      // Calculate health
      const overdueTasks = tasks.filter(t => t.is_overdue).length;
      const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
      const totalActive = activeTasks - completedTasks;

      let health = 'on_track';
      if (completionPercentage === 100) {
        health = 'completed';
      } else if (totalActive > 0) {
        const overdueRatio = overdueTasks / totalActive;
        const blockedRatio = blockedTasks / totalActive;

        if (overdueRatio > 0.3 || blockedRatio > 0.3) {
          health = 'off_track';
        } else if (overdueRatio > 0.1 || blockedRatio > 0.1) {
          health = 'at_risk';
        }

        // Check if project end date is approaching and progress is low
        if (project.end_date) {
          const now = new Date();
          const endDate = new Date(project.end_date);
          const startDate = project.start_date ? new Date(project.start_date) : project.created_date ? new Date(project.created_date) : now;
          const totalDuration = endDate - startDate;
          const elapsed = now - startDate;
          const timeProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

          // If time progress significantly exceeds task progress → at risk or off track
          if (timeProgress > 0 && completionPercentage < timeProgress * 0.5) {
            health = 'off_track';
          } else if (timeProgress > 0 && completionPercentage < timeProgress * 0.75) {
            health = health === 'on_track' ? 'at_risk' : health;
          }
        }
      }

      await base44.asServiceRole.entities.Project.update(project.id, {
        completion_percentage: completionPercentage,
        health: health,
      });

      results.push({
        project_id: project.id,
        name: project.name,
        completion: completionPercentage,
        health,
        task_count: tasks.length,
        overdue: overdueTasks,
        blocked: blockedTasks,
      });
    }

    return Response.json({ success: true, projects: results });
  } catch (error) {
    console.error('calculateProjectHealth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});