import { AuthenticatedLayout } from "@/features/workspace/shell";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
