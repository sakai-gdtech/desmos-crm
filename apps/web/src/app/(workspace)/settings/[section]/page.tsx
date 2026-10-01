import { notFound } from "next/navigation";
import { CompanySettings } from "@/features/settings/company";
import { ProfileSettings } from "@/features/settings/profile";
import { TeamSettings } from "@/features/settings/team";
import { SessionsSettings } from "@/features/settings/sessions";
import { AuditSettings } from "@/features/settings/audit";
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const Page = (
    {
      company: CompanySettings,
      profile: ProfileSettings,
      team: TeamSettings,
      sessions: SessionsSettings,
      audit: AuditSettings,
    } as const
  )[section as "company"];
  if (!Page) notFound();
  return <Page />;
}
