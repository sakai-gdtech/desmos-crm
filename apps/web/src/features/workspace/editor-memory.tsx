"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

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

/** A view's filters survive ordinary navigation, isolated by the shell's tenant/user key. */
export function useRememberedState<T>(
  key: string,
  initial: T,
  preferInitial = false,
) {
  const memory = useContext(Context);
  const [value, setValue] = useState<T>(() =>
    !preferInitial && memory?.has(key) ? (memory.get(key) as T) : initial,
  );
  useEffect(() => {
    if (preferInitial) setValue(initial);
  }, [preferInitial, key, initial]);
  useEffect(() => {
    memory?.set(key, value);
  }, [memory, key, value]);
  return [value, setValue] as const;
}
