/** Shared user fields returned to clients — never includes password. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  imageKey: true,
} as const;

export type PublicUserSelect = typeof publicUserSelect;
