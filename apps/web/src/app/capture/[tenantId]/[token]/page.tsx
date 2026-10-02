import { notFound } from "next/navigation";
import { LeadCapture } from "@/features/crm/intake";
export default async function CapturePage({
  params,
}: {
  params: Promise<{ tenantId: string; token: string }>;
}) {
  const p = await params;
  if (!/^[a-f0-9-]{36}$/.test(p.tenantId) || !/^[a-f0-9]{48}$/.test(p.token))
    notFound();
  return <LeadCapture tenantId={p.tenantId} token={p.token} />;
}
