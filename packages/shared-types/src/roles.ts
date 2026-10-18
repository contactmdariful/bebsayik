/**
 * The 7 Canonical Roles for Bebsayik.com RBAC Engine
 * Sourced from ARCHITECTURE.md Section 15 & AGENT.md Section 8
 */
export const USER_ROLES = [
  'SUPER_ADMIN',
  'STORE_OWNER',
  'STORE_MANAGER',
  'SALESPERSON',
  'CASHIER',
  'TECHNICIAN',
  'ACCOUNTANT'
] as const;

export const ROLES = USER_ROLES;
export type UserRole = (typeof USER_ROLES)[number];
