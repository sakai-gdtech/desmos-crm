import { notFound } from "next/navigation";
import { SalesBoard } from "@/features/sales/board";
import { Pipelines, PipelineEditor } from "@/features/sales/pipelines";
import { Deals, DealForm, DealDetail } from "@/features/sales/deals";
import { WorkList, WorkForm, WorkDetail } from "@/features/sales/work";
import { SalesAutomations } from "@/features/sales/automations";
export default async function SalesPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const [kind, id, action] = path;
  if (path.length === 1 && kind === "board") return <SalesBoard />;
  if (path.length === 1 && kind === "automations") return <SalesAutomations />;
  if (kind === "pipelines") {
    if (path.length === 1) return <Pipelines />;
    if (path.length === 2 && id === "new") return <PipelineEditor />;
    if (path.length === 3 && action === "edit" && /^[0-9a-f-]{36}$/i.test(id))
      return <PipelineEditor id={id} />;
    notFound();
  }
  if (!["deals", "activities", "tasks"].includes(kind)) notFound();
  if (path.length === 1)
    return kind === "deals" ? (
      <Deals />
    ) : (
      <WorkList key={kind} kind={kind as "tasks" | "activities"} />
    );
  if (id === "new" && path.length === 2)
    return kind === "deals" ? (
      <DealForm />
    ) : (
      <WorkForm key={kind} kind={kind as "tasks" | "activities"} />
    );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  if (path.length === 2)
    return kind === "deals" ? (
      <DealDetail key={id} id={id} />
    ) : (
      <WorkDetail key={id} kind={kind as "tasks" | "activities"} id={id} />
    );
  if (path.length === 3 && action === "edit")
    return kind === "deals" ? (
      <DealForm id={id} key={id} />
    ) : (
      <WorkForm key={id} kind={kind as "tasks" | "activities"} id={id} />
    );
  notFound();
}
