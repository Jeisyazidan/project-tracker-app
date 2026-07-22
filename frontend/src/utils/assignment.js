export function isProjectAssignedToUser(project, userId) {
  if (!userId) return false;
  return project.project_admin_id === userId
    || project.project_manager_id === userId
    || project.operation_manager_id === userId;
}

export function isRequestAssignedToUser(request, userId) {
  if (!userId) return false;
  return [
    ...(request.pic_utama_users || []),
    ...(request.pic_support_users || []),
  ].some(u => u.id === userId);
}
