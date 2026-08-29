/**
 * Every role a user can hold. Adding a role here is enough to make it
 * usable everywhere: the `roles` column and `User.hasRole()` are both
 * typed from this list.
 */
export const ROLES = ['ROLE_USER', 'ROLE_ADMIN'] as const;

export type Role = (typeof ROLES)[number];
