export const roles = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SALES",
  "SUPPORT",
  "VIEWER",
] as const;
export type Role = (typeof roles)[number];
const permissions = [
  "workspace.view",
  "profile.manage",
  "settings.manage",
  "users.manage",
  "audit.view",
  "sessions.manage",
  "contacts.view",
  "contacts.create",
  "contacts.update",
  "contacts.delete",
  "companies.view",
  "companies.create",
  "companies.update",
  "companies.delete",
  "leads.view",
  "leads.create",
  "leads.update",
  "leads.delete",
  "leads.convert",
  "tags.manage",
  "crm.purge",
  "pipelines.view",
  "pipelines.manage",
  "deals.view",
  "deals.create",
  "deals.update",
  "deals.delete",
  "activities.view",
  "activities.create",
  "activities.update",
  "activities.delete",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
] as const;
export type Permission = (typeof permissions)[number];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  OWNER: permissions,
  ADMIN: permissions,
  MANAGER: permissions.filter(
    (p) =>
      !["settings.manage", "users.manage", "audit.view", "crm.purge"].includes(
        p,
      ),
  ),
  SALES: permissions.filter(
    (p) =>
      ![
        "settings.manage",
        "users.manage",
        "audit.view",
        "crm.purge",
        "contacts.delete",
        "companies.delete",
        "leads.delete",
        "deals.delete",
        "activities.delete",
        "tasks.delete",
        "pipelines.manage",
      ].includes(p),
  ),
  SUPPORT: [
    "workspace.view",
    "profile.manage",
    "sessions.manage",
    "contacts.view",
    "contacts.update",
    "companies.view",
    "companies.update",
    "leads.view",
    "pipelines.view",
    "deals.view",
    "activities.view",
    "activities.create",
    "activities.update",
    "tasks.view",
    "tasks.create",
    "tasks.update",
  ],
  VIEWER: [
    "workspace.view",
    "profile.manage",
    "sessions.manage",
    "contacts.view",
    "companies.view",
    "leads.view",
    "pipelines.view",
    "deals.view",
    "activities.view",
    "tasks.view",
  ],
};
export const entitlements = Object.freeze({
  plan: "foundation",
  features: { multiCompany: false, invitations: true, audit: true },
  limits: { membersPerTenant: 100, tenantsPerUser: 1 },
});

export function hasPermission(role: string, permission: Permission): boolean {
  return (
    Object.hasOwn(rolePermissions, role) &&
    rolePermissions[role as Role].includes(permission)
  );
}
