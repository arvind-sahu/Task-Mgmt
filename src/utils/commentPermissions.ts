/** Whether the current user may edit or delete a task comment. */
export function canModifyTaskComment(
  commentAuthorId: string,
  currentUserId: string | undefined,
  options: {
    isProjectOwner?: boolean;
    companyRole?: string | null;
  },
): boolean {
  if (!currentUserId) return false;
  if (commentAuthorId === currentUserId) return true;
  if (options.isProjectOwner) return true;
  const role = options.companyRole;
  return role === "SUPER_ADMIN" || role === "ROOT";
}
