"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Rule } from "@/features/sales/automation-model";

type Handoff = { rule: Rule; pipelineId: string };
const AssistantContext = createContext<{
  pendingDraft: Handoff | null;
  queueDraft: (draft: Handoff) => void;
  consumeDraft: () => void;
}>({ pendingDraft: null, queueDraft: () => {}, consumeDraft: () => {} });
export const useAssistantDraft = () => useContext(AssistantContext);
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [pendingDraft, setPendingDraft] = useState<Handoff | null>(null);
  return (
    <AssistantContext.Provider
      value={{
        pendingDraft,
        queueDraft: setPendingDraft,
        consumeDraft: () => setPendingDraft(null),
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
