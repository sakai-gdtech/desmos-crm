"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch } from "lucide-react";
import { useSession } from "@/components/providers";

export function WorkNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const items = [
    {
      href: "/sales/agenda",
      label: "Agenda",
      allowed: session?.permissions.some((p) =>
        ["tasks.view", "activities.view"].includes(p),
      ),
    },
    {
      href: "/sales/tasks",
      label: "Tarefas",
      allowed: session?.permissions.includes("tasks.view"),
    },
    {
      href: "/sales/activities",
      label: "Atividades",
      allowed: session?.permissions.includes("activities.view"),
    },
  ];
  return (
    <nav className="work-navigation" aria-label="Planejamento comercial">
      {items
        .filter((item) => item.allowed)
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "page"
                : undefined
            }
          >
            {item.label}
          </Link>
        ))}
    </nav>
  );
}

export function SalesNavigation({
  pipelineId,
  canManage,
}: {
  pipelineId?: string;
  canManage?: boolean;
}) {
  const pathname = usePathname();
  const query = pipelineId
    ? `?pipelineId=${encodeURIComponent(pipelineId)}`
    : "";
  return (
    <div className="sales-view-navigation">
      <nav className="work-navigation" aria-label="Visualização de negócios">
        <Link
          href={`/sales/board${query}`}
          aria-current={pathname === "/sales/board" ? "page" : undefined}
        >
          Kanban
        </Link>
        <Link
          href={`/sales/deals${query}`}
          aria-current={pathname === "/sales/deals" ? "page" : undefined}
        >
          Lista
        </Link>
      </nav>
      {canManage && (
        <Link className="btn btn-ghost" href="/sales/pipelines">
          <GitBranch size={16} />
          Gerenciar funis
        </Link>
      )}
    </div>
  );
}
