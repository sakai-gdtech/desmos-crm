"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch,
  Handshake,
  CalendarClock,
  ListTodo,
  Building2,
  ContactRound,
  Tags,
  Trash2,
  UserRoundSearch,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ScrollText,
  Settings2,
  Workflow,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useSession, useTheme } from "@/components/providers";
import { BrandSymbol } from "@/components/brand";
import { Alert, ErrorState, LoadingPage, cn } from "@/components/ui/primitives";
import {
  errorMessage,
  notifySessionChange,
  post,
  setExpectedTenant,
} from "@/lib/api";
import { initials, roleLabels, type SessionContext } from "@/lib/types";

const nav = [
  {
    label: "Automações",
    href: "/sales/automations",
    icon: Workflow,
    group: "CONFIGURAÇÕES",
    permission: "pipelines.manage",
  },
  { label: "Visão geral", href: "/workspace", icon: Home, group: "WORKSPACE" },
  {
    label: "Leads",
    href: "/crm/leads",
    icon: UserRoundSearch,
    group: "CLIENTES",
    permission: "leads.view",
  },
  {
    label: "Contatos",
    href: "/crm/contacts",
    icon: ContactRound,
    group: "CLIENTES",
    permission: "contacts.view",
  },
  {
    label: "Empresas clientes",
    href: "/crm/companies",
    icon: Building2,
    group: "CLIENTES",
    permission: "companies.view",
  },
  {
    label: "Tags",
    href: "/crm/tags",
    icon: Tags,
    group: "CONFIGURAÇÕES",
    permission: "tags.manage",
  },
  {
    label: "Lixeira",
    href: "/crm/trash",
    icon: Trash2,
    group: "CONFIGURAÇÕES",
    permission: "crm.trash",
  },
  {
    label: "Funil de vendas",
    href: "/sales/board",
    icon: GitBranch,
    group: "VENDAS",
    permission: "deals.view",
  },
  {
    label: "Oportunidades",
    href: "/sales/deals",
    icon: Handshake,
    group: "VENDAS",
    permission: "deals.view",
  },
  {
    label: "Atividades",
    href: "/sales/activities",
    icon: CalendarClock,
    group: "VENDAS",
    permission: "activities.view",
  },
  {
    label: "Tarefas",
    href: "/sales/tasks",
    icon: ListTodo,
    group: "VENDAS",
    permission: "tasks.view",
  },
  {
    label: "Funis e etapas",
    href: "/sales/pipelines",
    icon: GitBranch,
    group: "CONFIGURAÇÕES",
    permission: "pipelines.manage",
  },
  {
    label: "Empresa",
    href: "/settings/company",
    icon: Building2,
    group: "CONFIGURAÇÕES",
    permission: "settings.manage",
  },
  {
    label: "Equipe e acessos",
    href: "/settings/team",
    icon: UsersRound,
    group: "CONFIGURAÇÕES",
    permission: "users.manage",
  },
  {
    label: "Auditoria",
    href: "/settings/audit",
    icon: ScrollText,
    group: "CONFIGURAÇÕES",
    permission: "audit.view",
  },
  {
    label: "Meu perfil",
    href: "/settings/profile",
    icon: UserRound,
    group: "MINHA CONTA",
  },
  {
    label: "Dispositivos e sessões",
    href: "/settings/sessions",
    icon: Monitor,
    group: "MINHA CONTA",
  },
];

function WorkspaceShell({
  session,
  children,
}: {
  session: SessionContext;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(
    nav.some(
      (item) => item.group === "CLIENTES" && pathname.startsWith(item.href),
    ),
  );
  const [settingsOpen, setSettingsOpen] = useState(
    nav.some(
      (item) =>
        ["CONFIGURAÇÕES", "MINHA CONTA"].includes(item.group) &&
        pathname.startsWith(item.href),
    ),
  );
  useEffect(() => {
    const item = nav.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (item?.group === "CLIENTES") setClientsOpen(true);
    if (item && ["CONFIGURAÇÕES", "MINHA CONTA"].includes(item.group))
      setSettingsOpen(true);
  }, [pathname]);
  useEffect(() => {
    setExpectedTenant(session.tenant.id);
  }, [session.tenant.id]);
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = document.getElementById("workspace-nav");
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled)",
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
      }
      if (event.key === "Tab") {
        const controls = focusable();
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const resized = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    document.addEventListener("keydown", keydown);
    desktop.addEventListener("change", resized);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      desktop.removeEventListener("change", resized);
      previous?.focus();
    };
  }, [mobileOpen]);
  const logout = useMutation({
    mutationFn: () => post("/auth/logout"),
    onSuccess: () => {
      setExpectedTenant(undefined);
      notifySessionChange("logout");
      queryClient.clear();
      router.replace("/login");
    },
  });
  const allowed = nav.filter(
    (n) =>
      !n.permission ||
      session.permissions.includes(n.permission) ||
      (n.permission === "crm.trash" &&
        [
          "leads.delete",
          "contacts.delete",
          "companies.delete",
          "crm.purge",
        ].some((permission) => session.permissions.includes(permission))),
  );
  const current =
    nav.find((n) => n.href === pathname || pathname.startsWith(`${n.href}/`))
      ?.label ?? "Configuração inicial";
  const renderLink = ({ href, icon: Icon, label }: (typeof nav)[number]) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={cn("nav-link", active && "nav-active")}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
        {active && <span className="nav-current-dot" aria-hidden="true" />}
      </Link>
    );
  };
  const clients = allowed.filter((item) => item.group === "CLIENTES");
  const settings = [
    "/settings/company",
    "/settings/team",
    "/sales/pipelines",
    "/sales/automations",
    "/crm/tags",
    "/settings/audit",
    "/crm/trash",
  ].flatMap((href) => allowed.filter((item) => item.href === href));
  const account = allowed.filter((item) => item.group === "MINHA CONTA");
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="workspace-nav"
        className={cn("sidebar", mobileOpen && "sidebar-open")}
        aria-label="Navegação principal"
      >
        <div className="sidebar-brand-row">
          <Link
            className="brand"
            href={
              session.permissions.includes("deals.view")
                ? "/sales/board"
                : "/workspace"
            }
            aria-label="Desmos CRM — início"
            onClick={() => setMobileOpen(false)}
          >
            <BrandSymbol size={40} />
            <span>
              desmos<span className="brand-suffix">crm</span>
            </span>
          </Link>
          <button
            type="button"
            className="icon-button mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar navegação"
          >
            <X size={21} />
          </button>
        </div>
        <div className="tenant-context" aria-label="Empresa">
          <span className="tenant-icon" aria-hidden="true">
            <Building2 size={20} />
          </span>
          <div>
            <strong title={session.tenant.name}>{session.tenant.name}</strong>
          </div>
        </div>
        <nav className="sidebar-navigation" aria-label="Trabalho comercial">
          <div className="nav-group nav-primary">
            {[
              "/sales/board",
              "/sales/deals",
              "/sales/tasks",
              "/sales/activities",
            ]
              .flatMap((href) => allowed.filter((item) => item.href === href))
              .map(renderLink)}
          </div>
          <div className="nav-group nav-secondary">
            {clients.length > 0 && (
              <>
                <button
                  type="button"
                  className={cn(
                    "nav-link nav-disclosure",
                    clients.some((item) => pathname.startsWith(item.href)) &&
                      "nav-section-current",
                  )}
                  aria-expanded={clientsOpen}
                  aria-controls="nav-clients"
                  onClick={() => setClientsOpen(!clientsOpen)}
                >
                  <ContactRound size={18} aria-hidden="true" />
                  <span>Clientes</span>
                  <ChevronDown
                    size={15}
                    className="nav-chevron"
                    aria-hidden="true"
                  />
                </button>
                <div
                  id="nav-clients"
                  className="nav-children"
                  hidden={!clientsOpen}
                >
                  {clients.map(renderLink)}
                </div>
              </>
            )}
            {allowed
              .filter((item) => item.group === "WORKSPACE")
              .map(renderLink)}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <nav aria-label="Configurações e conta" className="sidebar-settings">
            <button
              type="button"
              className={cn(
                "nav-link nav-disclosure",
                settings
                  .concat(account)
                  .some((item) => pathname.startsWith(item.href)) &&
                  "nav-section-current",
              )}
              aria-expanded={settingsOpen}
              aria-controls="nav-settings"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <Settings2 size={18} aria-hidden="true" />
              <span>Configurações</span>
              <ChevronDown
                size={15}
                className="nav-chevron"
                aria-hidden="true"
              />
            </button>
            <div
              id="nav-settings"
              className="nav-children"
              hidden={!settingsOpen}
            >
              {settings.map(renderLink)}
              {settings.length > 0 && <div className="nav-separator" />}
              {account.map(renderLink)}
            </div>
          </nav>
          <div className="sidebar-profile">
            <Link
              href="/settings/profile"
              className="profile-link"
              onClick={() => setMobileOpen(false)}
            >
              <span className="avatar">{initials(session.user.name)}</span>
              <span>
                <strong>{session.user.name}</strong>
                <small>{roleLabels[session.membership.role]}</small>
              </span>
            </Link>
            <button
              type="button"
              className="icon-button logout-button"
              aria-label="Sair da conta"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogOut size={17} />
            </button>
          </div>
          {logout.isError && <Alert>{errorMessage(logout.error)}</Alert>}
        </div>
      </aside>
      <div className="main-shell" inert={mobileOpen}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir navegação"
              aria-expanded={mobileOpen}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-company">{session.tenant.name}</span>
            <ChevronRight size={13} />
            <span>{current}</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggle}
              aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
              title={dark ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              className="header-avatar"
              href="/settings/profile"
              aria-label="Meu perfil"
            >
              {initials(session.user.name)}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>Desmos CRM</span>
          <span>
            <Check size={12} /> Conta conectada
          </span>
        </footer>
      </div>
    </div>
  );
}
export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = useSession();
  if (isPending) return <LoadingPage />;
  if (error || !data)
    return (
      <div className="standalone-error">
        <ErrorState error={error} retry={() => refetch()} />
        <Link href="/login" className="back-link">
          Voltar para o login
        </Link>
      </div>
    );
  return <WorkspaceShell session={data}>{children}</WorkspaceShell>;
}
