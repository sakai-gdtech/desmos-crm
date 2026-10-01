export type Role =
  "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "SUPPORT" | "VIEWER";
export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: string | null;
};
export type Tenant = {
  id: string;
  name: string;
  segment: string | null;
  employeeCount: number | null;
  salesCount: number | null;
  objective: string | null;
  salesMotion: string | null;
  onboardingCompletedAt: string | null;
  timezone: string;
  currency: string;
  locale: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  address?: string | null;
};
export type Membership = {
  id: string;
  tenantId: string;
  tenantName: string;
  role: Role;
  status: string;
};
export type SessionContext = {
  user: User;
  tenant: Tenant;
  membership: Membership;
  permissions: string[];
  memberships: Membership[];
};
export type Member = {
  id: string;
  role: Role;
  status: string;
  user: Pick<User, "id" | "name" | "email">;
};
export type Invitation = {
  id: string;
  email: string;
  role: Role;
  status?: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
};
export type UserSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt?: string;
  isCurrent: boolean;
};
export type AuditEvent = {
  id: string;
  action: string;
  actorName?: string | null;
  actorId?: string | null;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};
export const roleLabels: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  SALES: "Vendedor",
  SUPPORT: "Suporte",
  VIEWER: "Visualizador",
};
export const roles = Object.keys(roleLabels) as Role[];
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
export function formatDate(
  value?: string | null,
  timezone = "America/Sao_Paulo",
) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
