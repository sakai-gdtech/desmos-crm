"use client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, sessionTabId, setExpectedTenant } from "@/lib/api";
import type { SessionContext } from "@/lib/types";

const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function useTheme() {
  return useContext(ThemeContext);
}
export function useSession() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<SessionContext>("/me"),
    staleTime: 30_000,
    retry: false,
  });
}
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  const [dark, setDark] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    const unauthorized = () => {
      setExpectedTenant(undefined);
      queryClient.clear();
      router.replace("/login");
    };
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("orbit-session")
        : null;
    if (channel)
      channel.onmessage = (
        event: MessageEvent<{ kind: string; senderId: string }>,
      ) => {
        if (event.data.senderId === sessionTabId()) return;
        queryClient.clear();
        window.location.assign(
          event.data.kind === "logout" ? "/login" : "/workspace",
        );
      };
    window.addEventListener("orbit:unauthorized", unauthorized);
    return () => {
      window.removeEventListener("orbit:unauthorized", unauthorized);
      channel?.close();
    };
  }, [queryClient, router]);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("orbit-theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ dark, toggle }}>
        {children}
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
