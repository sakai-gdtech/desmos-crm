"use client";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  ErrorState,
  LoadingPage,
} from "@/components/ui/primitives";
import { api, errorMessage, patch } from "@/lib/api";
import { useSalesInvalidation } from "./shared";
import type { Pipeline } from "./types";
export function DemoFollowup({ pipeline }: { pipeline: Pipeline }) {
  const invalidate = useSalesInvalidation();
  const result = useQuery({
    queryKey: ["sales", "demo-followup", pipeline.id],
    queryFn: () =>
      api<{
        enabled: boolean;
        executions: {
          dealId: string;
          dealTitle: string;
          taskId: string;
          taskTitle: string;
        }[];
      }>(`/sales/pipelines/${pipeline.id}/demo-automation`),
    enabled: !!pipeline.demoFixture,
  });
  const change = useMutation({
    mutationFn: (enabled: boolean) =>
      patch(`/sales/pipelines/${pipeline.id}/demo-automation`, { enabled }),
    onSuccess: () => invalidate(),
  });
  if (!pipeline.demoFixture) return null;
  return (
    <section className="demo-followup-section">
      <div className="section-heading">
        <div>
          <h2>Acompanhamento de proposta</h2>
          <p>Ao entrar em Proposta, criar uma tarefa para o dia seguinte.</p>
        </div>
        <Badge tone="amber">Ambiente de demonstração</Badge>
      </div>
      {result.isPending ? (
        <LoadingPage />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : (
        <>
          <p className="info-note">
            Esta regra cria uma tarefa real apenas neste funil de demonstração.
            Cada negócio gera uma única tarefa, mesmo ao retornar à etapa. Não
            envia email ou WhatsApp.
          </p>
          <div className="crm-detail-actions">
            <Button
              variant="secondary"
              loading={change.isPending}
              onClick={() => change.mutate(!result.data.enabled)}
            >
              {result.data.enabled
                ? "Pausar acompanhamento"
                : "Ativar acompanhamento"}
            </Button>
            <Link
              href={`/sales/board?pipelineId=${pipeline.id}`}
              className="text-link"
            >
              Abrir funil de demonstração
            </Link>
            <span role="status">
              {result.data.enabled ? "Regra ativa" : "Regra pausada"}
            </span>
          </div>
          {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
          <h3>Execuções na demo</h3>
          {result.data.executions.length ? (
            <div className="radar-list">
              {result.data.executions.map((e) => (
                <Link
                  key={e.dealId}
                  className="radar-row"
                  href={`/sales/tasks/${e.taskId}`}
                >
                  <div>
                    <strong>{e.taskTitle}</strong>
                    <p>{e.dealTitle} · tarefa criada no banco</p>
                  </div>
                  <Badge tone="green">Criada</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">
              Nenhuma execução. Mova um negócio para Proposta para ver o
              resultado.
            </p>
          )}
        </>
      )}
    </section>
  );
}
