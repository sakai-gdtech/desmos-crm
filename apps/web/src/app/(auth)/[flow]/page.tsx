import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthScreen, type AuthMode } from "@/features/auth/auth-screen";
import { LoadingPage } from "@/components/ui/primitives";
const modes: AuthMode[] = [
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "accept-invitation",
];
export default async function AuthPage({
  params,
}: {
  params: Promise<{ flow: string }>;
}) {
  const { flow } = await params;
  if (!modes.includes(flow as AuthMode)) notFound();
  return (
    <Suspense fallback={<LoadingPage />}>
      <AuthScreen mode={flow as AuthMode} />
    </Suspense>
  );
}
