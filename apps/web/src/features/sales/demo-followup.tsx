"use client";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  ErrorState,
  Field,
  LoadingPage,
  Select,
} from "@/components/ui/primitives";
import { api, errorMessage, patch } from "@/lib/api";
import { useSalesInvalidation } from "./shared";
import type { Pipeline } from "./types";
type Config = {
  enabled: boolean;
  stageId: string | null;
  version: number;
  executions: {
    dealId: string;
    dealTitle: string;
    taskId: string;
    taskTitle: string;
    createdAt: string;
  }[];
};
export function DemoFollowup({
  pipeline,
  expanded = false,
}: {
  pipeline: Pipeline;
  expanded?: boolean;
}) {
  const invalidate = useSalesInvalidation();
  const result = useQuery({
    queryKey: ["sales", "demo-followup", pipeline.id],
    queryFn: () =>
      api<Config>(`/sales/pipelines/${pipeline.id}/demo-automation`),
    enabled: !!pipeline.demoFixture,
  });
  const [stageId, setStageId] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const change = useMutation({
    mutationFn: ({
      enabled,
      stageId,
      version,
    }: {
      enabled: boolean;
      stageId: string;
      version: number;
    }) =>
      patch(`/sales/pipelines/${pipeline.id}/demo-automation`, {
        enabled,
        stageId,
        version,
      }),
    onSuccess: async () => {
      setStageId("");
      setNotice("Regra atualizada. Próximas transições usarão esta etapa.");
      await invalidate();
    },
    onSettled: () => {
      locked.current = false;
    },
  });
  if (!pipeline.demoFixture) return null;
  const selected = stageId || result.data?.stageId || "";
  const stageName =
    pipeline.stages.find((s) => s.id === result.data?.stageId)?.name ??
    "Etapa não configurada";
  const save = (enabled: boolean) => {
    if (locked.current || !result.data || !selected) return;
    locked.current = true;
    setNotice("");
    change.mutate({ enabled, stageId: selected, version: result.data.version });
  };
  return (
    <details
      open={expanded || undefined}
      className="demo-followup-section demo-followup-details"
    >
      <summary>
        <span>Acompanhamento de proposta · {stageName}</span>
        <Badge tone="green">Funciona nesta demo</Badge>
      </summary>
      <div className="demo-followup-body">
        <h2>Acompanhamento de proposta</h2>
        {result.isPending ? (
          <LoadingPage />
        ) : result.isError ? (
          <ErrorState error={result.error} retry={() => result.refetch()} />
        ) : (
          <>
            <p className="info-note">
              Quando um negócio aberto entrar em {stageName}, criar uma tarefa
              para o dia seguinte. Uma execução por negócio neste funil
              fictício, fora de produção. Não envia email ou WhatsApp.
            </p>
            <Field
              id="demo-followup-stage"
              label="Etapa do acompanhamento real"
            >
              <Select
                id="demo-followup-stage"
                value={selected}
                onChange={(e) => {
                  setStageId(e.target.value);
                  setNotice("");
                }}
                disabled={change.isPending}
              >
                <option value="" disabled>
                  Escolher etapa
                </option>
                {pipeline.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {selected !== result.data.stageId && (
              <p className="field-hint">
                Salve a nova etapa antes de ativar ou pausar a regra.
              </p>
            )}
            <div className="crm-detail-actions">
              <Button
                variant="secondary"
                loading={change.isPending}
                disabled={!selected || selected === result.data.stageId}
                onClick={() => save(result.data.enabled)}
              >
                Salvar etapa da regra
              </Button>
              <Button
                variant="secondary"
                disabled={selected !== result.data.stageId || change.isPending}
                onClick={() => save(!result.data.enabled)}
              >
                {result.data.enabled
                  ? "Pausar acompanhamento"
                  : "Ativar acompanhamento"}
              </Button>
              <Button
                variant="ghost"
                disabled={selected === result.data.stageId || change.isPending}
                onClick={() => setStageId("")}
              >
                Cancelar etapa
              </Button>
              <Button
                variant="ghost"
                disabled={change.isPending}
                onClick={() =>
                  setNotice(
                    `Prévia${result.data.enabled ? "" : " (regra pausada; ative para executar)"}: ao entrar em ${pipeline.stages.find((s) => s.id === selected)?.name}, será criada uma tarefa para o dia seguinte. Testar esta prévia não altera registros; negócios já executados não serão repetidos.`,
                  )
                }
              >
                Testar regra real com prévia
              </Button>
            </div>
            <p role="status">
              {notice ||
                (result.data.enabled ? "Regra ativa" : "Regra pausada")}
            </p>
            {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
            <Link
              href={`/sales/board?pipelineId=${pipeline.id}`}
              className="text-link"
            >
              Abrir funil de demonstração
            </Link>
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
                Nenhuma execução. Mova um negócio para {stageName} para ver o
                resultado.
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}
