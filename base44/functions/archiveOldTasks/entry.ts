import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const doneTasks = await base44.asServiceRole.entities.Task.filter({ status: 'done' });

  const toArchive = doneTasks.filter(t => {
    if (t.is_archived) return false; // already archived
    const updatedAt = new Date(t.updated_date || t.created_date);
    return updatedAt < cutoff;
  });

  let archived = 0;
  for (const task of toArchive) {
    await base44.asServiceRole.entities.Task.update(task.id, { is_archived: true });
    archived++;
  }

  return Response.json({ checked: doneTasks.length, archived });
});