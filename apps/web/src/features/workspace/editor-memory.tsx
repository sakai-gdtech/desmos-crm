"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";

const Context = createContext<Map<string, unknown> | null>(null);
/** Scoped by the authenticated layout's tenant/user key; never persisted. */
export function EditorMemoryProvider({ children }: { children: ReactNode }) {
  const drafts = useRef(new Map<string, unknown>());
  return <Context.Provider value={drafts.current}>{children}</Context.Provider>;
}
export function useEditorMemory<T>(key: string) {
  const drafts = useContext(Context);
  return {
    read: () => drafts?.get(key) as T | undefined,
    write: (value: T) => drafts?.set(key, value),
    clear: () => drafts?.delete(key),
  };
}
