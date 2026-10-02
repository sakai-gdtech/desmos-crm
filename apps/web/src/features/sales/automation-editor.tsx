"use client";
import { useMotionPlayer } from "@/components/ui/motion";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { useCrmReferences } from "@/features/crm/shared";
import { api } from "@/lib/api";
import {
  actions,
  triggers,
  exampleResult,
  ruleProblem,
  type Rule,
} from "./automation-model";
import {
  attachTemplate,
  renderMessage,
  type MessageTemplate,
  variables,
} from "./message-model";
import type { Deal, Page, Pipeline } from "./types";
export type TestResult = {
  id: string;
  name: string;
  result: string;
  at: string;
};
export default function AutomationEditor({
  draft,
  setDraft,
  pipeline,
  templates,
  onSave,
  onCancel,
  history,
  onTest,
}: {
  draft: Rule;
  setDraft: (r: Rule | ((current: Rule) => Rule)) => void;
  pipeline: Pipeline;
  templates: MessageTemplate[];
  onSave: () => void;
  onCancel: () => void;
  history: TestResult[];
  onTest: (test: TestResult) => void;
}) {
  const [step, setStep] = useState(1);
  const flow = useRef<HTMLDivElement>(null);
  const previousStep = useRef(1);
  const play = useMotionPlayer();
  useEffect(() => {
    const element = flow.current;
    if (step === previousStep.current) return;
    const direction = step >= previousStep.current ? 1 : -1;
    const transform = window.matchMedia("(max-width: 760px)").matches
      ? `translateY(${direction * 20}px)`
      : `translateX(${direction * 24}px)`;
    previousStep.current = step;
    const animation = element
      ? play(
          element,
          [{ transform }, { transform: "translate(0, 0)" }],
          { duration: 280 },
          "step",
        )
      : null;
    return () => animation?.cancel();
  }, [step, play]);
  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() =>
      Array.from(
        flow.current?.querySelectorAll<HTMLElement>("[data-step-title]") ?? [],
      )
        .find((el) => el.getClientRects().length > 0)
        ?.focus({ preventScroll: true }),
    );
  }
  const { assignees } = useCrmReferences();
  const owners = assignees.data?.items ?? [];
  const [simulation, setSimulation] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [error, setError] = useState("");
  const tested = useRef("");
  const records = useQuery({
    queryKey: ["sales", "automation-preview", pipeline.id],
    queryFn: () =>
      api<Page<Deal>>(`/sales/deals?pipelineId=${pipeline.id}&pageSize=20`),
  });
  const selected = records.data?.items.find((d) => d.id === previewId);
  const sample = selected
    ? {
        contato: selected.contactName,
        empresa: selected.companyName,
        negociacao: selected.title,
        responsavel: selected.assignedToName,
      }
    : {
        contato: "Marina",
        empresa: "Aurora Digital",
        negociacao: "Implantação comercial",
        responsavel: owners[0]?.name,
      };
  const subject = renderMessage(draft.subject, sample),
    body = renderMessage(draft.message, sample);
  const missing = [...new Set([...subject.missing, ...body.missing])];
  const template = draft.messageTemplate
    ? templates.find((t) => t.id === draft.messageTemplate!.id)
    : null;
  const stageName = (id: string) =>
    pipeline.stages.find((s) => s.id === id)?.name ?? "Etapa indisponível";
  const ownerName = (id: string) =>
    owners.find((o) => o.id === id)?.name ?? "Responsável indisponível";
  const problem =
    ruleProblem(draft, pipeline, owners) ||
    (draft.messageTemplate && !template
      ? "Modelo removido. Selecione outro modelo ou personalize só nesta regra antes de salvar."
      : "");
  function change<K extends keyof Rule>(key: K, value: Rule[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "action" && (value === "EMAIL" || value === "WHATSAPP")
        ? {
            channel: value,
            messageTemplate:
              current.messageTemplate?.snapshot.channel === value
                ? current.messageTemplate
                : null,
          }
        : {}),
    }));
    setSimulation("");
    setError("");
  }
  function test() {
    if (problem) {
      setError(problem);
      return;
    }
    const fingerprint = JSON.stringify({
      draft,
      previewId,
      pipeline: pipeline.version,
    });
    const result = selected
      ? (draft.minimum && Number(selected.value) < Number(draft.minimum)) ||
        (draft.ownerId && selected.assignedTo !== draft.ownerId) ||
        (draft.conditionStageId && selected.stageId !== draft.conditionStageId)
        ? "Condição não atendida neste registro. Nenhuma ação foi executada."
        : "Prévia concluída com o registro selecionado. Nenhuma mensagem real foi enviada; nenhum registro foi alterado."
      : exampleResult(draft, pipeline, owners[0]?.id ?? "");
    setSimulation(result);
    if (tested.current !== fingerprint) {
      tested.current = fingerprint;
      onTest({
        id: crypto.randomUUID(),
        name: draft.name,
        result,
        at: new Date().toISOString(),
      });
    }
  }
  const recipient =
    draft.recipient.kind === "USER"
      ? `${draft.recipient.name} · ${draft.recipient.email} (criador fixo)`
      : selected?.contactName || "Contato vinculado ao negócio";
  return (
    <div className="automation-editor-layout" ref={flow}>
      <nav className="automation-progress" aria-label="Etapas da configuração">
        {["Gatilho e condições", "Ação e mensagem", "Revisar e testar"].map(
          (label, i) => (
            <button
              key={label}
              type="button"
              aria-current={step === i + 1 ? "step" : undefined}
              onClick={() => move(i + 1)}
            >
              <span>{i + 1}</span>
              {label}
            </button>
          ),
        )}
      </nav>
      <form
        className="automation-builder"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) {
            move(step + 1);
            return;
          }
          if (problem) {
            setError(problem);
            return;
          }
          onSave();
        }}
      >
        <p className="field-hint">{pipeline.name} · rascunho de simulação</p>
        <div hidden={step !== 1}>
          <Field id="automation-name" label="Nome da automação">
            <Input
              id="automation-name"
              value={draft.name}
              onChange={(e) => change("name", e.target.value)}
              required
              maxLength={100}
            />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <section className="automation-step" hidden={step !== 1}>
          <div className="automation-step-heading">
            <span>1</span>
            <h2 data-step-title tabIndex={-1}>
              Quando acontecer
            </h2>
          </div>
          <Field id="automation-trigger" label="O que acontece">
            <Select
              id="automation-trigger"
              value={draft.trigger}
              onChange={(e) =>
                change("trigger", e.target.value as Rule["trigger"])
              }
            >
              {Object.entries(triggers).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          {draft.trigger === "STAGE_CHANGED" && (
            <Field id="automation-stage" label="Etapa de entrada">
              <Select
                id="automation-stage"
                value={draft.stageId}
                onChange={(e) => change("stageId", e.target.value)}
                required
              >
                <option value="">Escolher etapa</option>
                {!pipeline.stages.some((s) => s.id === draft.stageId) &&
                  draft.stageId && (
                    <option value={draft.stageId}>
                      Etapa removida — escolha outra
                    </option>
                  )}
                {pipeline.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </section>
        <section className="automation-step" hidden={step !== 1}>
          <div className="automation-step-heading">
            <h2>Condições opcionais</h2>
          </div>
          <p>Funil {pipeline.name}. Outras condições são opcionais.</p>
          <details
            className="crm-more-details"
            open={
              !!(draft.minimum || draft.ownerId || draft.conditionStageId) ||
              undefined
            }
          >
            <summary>Adicionar condições</summary>
            <div className="form-grid">
              <Field id="automation-condition-stage" label="Estar na etapa">
                <Select
                  id="automation-condition-stage"
                  value={draft.conditionStageId}
                  onChange={(e) => change("conditionStageId", e.target.value)}
                >
                  <option value="">Qualquer etapa</option>
                  {pipeline.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="automation-owner" label="Responsável do registro">
                <Select
                  id="automation-owner"
                  value={draft.ownerId}
                  onChange={(e) => change("ownerId", e.target.value)}
                >
                  <option value="">Qualquer responsável</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="automation-minimum" label="Valor mínimo (R$)">
                <Input
                  id="automation-minimum"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.minimum}
                  onChange={(e) => change("minimum", e.target.value)}
                />
              </Field>
            </div>
          </details>
        </section>
        <section className="automation-step" hidden={step !== 2}>
          <div className="automation-step-heading">
            <h2 data-step-title tabIndex={-1}>
              Qual é o próximo passo?
            </h2>
          </div>
          <Field id="automation-action" label="Ação da automação">
            <Select
              id="automation-action"
              value={draft.action}
              onChange={(e) =>
                change("action", e.target.value as Rule["action"])
              }
            >
              {Object.entries(actions).map(([id, name]) => (
                <option
                  key={id}
                  value={id}
                  disabled={id === "MOVE" && draft.trigger === "LEAD_CREATED"}
                >
                  {name} · simulação
                </option>
              ))}
            </Select>
          </Field>
          {draft.action === "TASK" && (
            <Field id="automation-task-title" label="Título da tarefa">
              <Input
                id="automation-task-title"
                value={draft.taskTitle}
                onChange={(e) => change("taskTitle", e.target.value)}
                required
                maxLength={200}
              />
            </Field>
          )}
          {draft.action === "ASSIGN" && (
            <Field id="automation-assignee" label="Atribuir a">
              <Select
                id="automation-assignee"
                value={draft.assigneeId}
                onChange={(e) => change("assigneeId", e.target.value)}
                required
              >
                <option value="">Escolher responsável</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {draft.action === "MOVE" && (
            <Field id="automation-target" label="Etapa de destino">
              <Select
                id="automation-target"
                value={draft.targetStageId}
                onChange={(e) => change("targetStageId", e.target.value)}
                required
              >
                <option value="">Escolher etapa</option>
                {pipeline.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {["EMAIL", "WHATSAPP"].includes(draft.action) && (
            <>
              <Field
                id="automation-message-template"
                label="Modelo de mensagem"
              >
                <Select
                  id="automation-message-template"
                  value={draft.messageTemplate?.id ?? ""}
                  onChange={(e) => {
                    const t = templates.find((t) => t.id === e.target.value);
                    if (t) setDraft(attachTemplate(draft, t));
                    else change("messageTemplate", null);
                  }}
                >
                  <option value="">Personalizar nesta regra</option>
                  {draft.messageTemplate && !template && (
                    <option value={draft.messageTemplate.id}>
                      Modelo indisponível — conteúdo preservado
                    </option>
                  )}
                  {templates
                    .filter((t) => t.channel === draft.action)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · revisão {t.revision}
                      </option>
                    ))}
                </Select>
              </Field>
              <p className="field-hint">
                Selecione conteúdo da biblioteca ou escreva uma mensagem somente
                para esta regra.
              </p>
              {draft.messageTemplate && (
                <div className="info-note">
                  <p>
                    Conteúdo da revisão {draft.messageTemplate.revision}.{" "}
                    {template
                      ? template.revision !== draft.messageTemplate.revision
                        ? "Há uma nova versão disponível."
                        : "Modelo atual."
                      : "Referência ausente. Selecione outro modelo ou personalize para reparar."}
                  </p>
                  <div className="crm-detail-actions">
                    {template &&
                      template.revision !== draft.messageTemplate.revision && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setDraft(attachTemplate(draft, template))
                          }
                        >
                          Atualizar versão do modelo
                        </Button>
                      )}
                    <Button
                      variant="ghost"
                      onClick={() => change("messageTemplate", null)}
                    >
                      Personalizar só nesta regra
                    </Button>
                  </div>
                </div>
              )}
              <Field id="automation-recipient" label="Destinatário">
                <Select
                  id="automation-recipient"
                  value={draft.recipient.kind}
                  onChange={(e) => {
                    if (e.target.value === "CONTACT")
                      change("recipient", { kind: "CONTACT" });
                  }}
                >
                  <option value="CONTACT">Contato vinculado ao negócio</option>
                  {draft.recipient.kind === "USER" && (
                    <option value="USER">
                      {draft.recipient.name} · {draft.recipient.email}
                    </option>
                  )}
                </Select>
              </Field>
              <p className="field-hint">{recipient}</p>
              <div hidden={!!draft.messageTemplate}>
                {draft.action === "EMAIL" && (
                  <Field id="automation-subject" label="Assunto">
                    <Input
                      id="automation-subject"
                      value={draft.subject}
                      readOnly={!!draft.messageTemplate}
                      onChange={(e) => change("subject", e.target.value)}
                      required
                      maxLength={200}
                    />
                  </Field>
                )}
                <Field id="automation-message" label="Mensagem">
                  <textarea
                    id="automation-message"
                    className="input automation-message"
                    rows={4}
                    value={draft.message}
                    readOnly={!!draft.messageTemplate}
                    onChange={(e) => change("message", e.target.value)}
                    required
                    maxLength={4000}
                  />
                </Field>
                {!draft.messageTemplate && (
                  <div className="automation-variables">
                    <span>Inserir:</span>
                    {variables.map((v) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() =>
                          change("message", `${draft.message} {${v}}`)
                        }
                      >{`{${v}}`}</button>
                    ))}
                  </div>
                )}
              </div>
              <details>
                <summary>Prazo de exemplo</summary>
                <Field
                  id="automation-delay"
                  label="Quando executar (simulação)"
                >
                  <Select
                    id="automation-delay"
                    value={draft.delay}
                    onChange={(e) => change("delay", e.target.value)}
                  >
                    <option value="0">Imediatamente</option>
                    <option value="1">Após 1 hora</option>
                    <option value="24">Após 24 horas</option>
                    <option value="48">Após 48 horas</option>
                  </Select>
                </Field>
              </details>
            </>
          )}
          <p className="field-hint">
            Todas as ações deste editor são simuladas. Salvar rascunho não ativa
            uma regra real.
          </p>
        </section>
        {assignees.isError && (
          <ErrorState
            error={assignees.error}
            retry={() => assignees.refetch()}
          />
        )}
      </form>
      <aside
        hidden={step === 1}
        className="automation-preview"
        aria-label="Prévia da automação"
      >
        <h2 data-step-title tabIndex={-1}>
          {step === 2 ? "Prévia da mensagem" : "Revisão e prévia"}
        </h2>
        <div hidden={step !== 3}>
          <Badge tone="amber">Sem efeitos reais</Badge>
          <dl className="automation-readable-summary">
            <dt>Quando</dt>
            <dd>
              {draft.trigger === "STAGE_CHANGED"
                ? `Negócio entrar em ${stageName(draft.stageId)}`
                : triggers[draft.trigger]}
            </dd>
            <dt>Se</dt>
            <dd>
              {[
                pipeline.name,
                draft.conditionStageId ? stageName(draft.conditionStageId) : "",
                draft.ownerId ? ownerName(draft.ownerId) : "",
                draft.minimum ? `Valor mínimo R$ ${draft.minimum}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </dd>
            <dt>Fazer</dt>
            <dd>
              {actions[draft.action]}
              {draft.action === "ASSIGN"
                ? `: ${ownerName(draft.assigneeId)}`
                : draft.action === "MOVE"
                  ? `: ${stageName(draft.targetStageId)}`
                  : ""}
            </dd>
          </dl>
        </div>
        <Field id="automation-preview-record" label="Dados da prévia">
          <Select
            id="automation-preview-record"
            value={previewId}
            onChange={(e) => {
              setPreviewId(e.target.value);
              setSimulation("");
            }}
          >
            <option value="">Exemplo fictício · Marina / Aurora</option>
            {records.data?.items.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        </Field>
        <p className="field-hint">
          Até 20 negócios recentes deste funil para prévia, sem alteração.
        </p>
        {["EMAIL", "WHATSAPP"].includes(draft.action) ? (
          <div className="automation-message-preview">
            <p>Destinatário: {recipient}</p>
            {draft.action === "EMAIL" && <strong>{subject.value}</strong>}
            <p>{body.value}</p>
            {missing.length > 0 && (
              <Alert>
                Variáveis sem dados: {missing.join(", ")}. Complete os dados ou
                personalize a mensagem.
              </Alert>
            )}
          </div>
        ) : (
          <p>{renderMessage(draft.taskTitle, sample).value}</p>
        )}
        <div hidden={step !== 3}>
          {problem && <Alert>{problem}</Alert>}
          <Button
            variant="secondary"
            disabled={assignees.isPending}
            onClick={test}
          >
            {["EMAIL", "WHATSAPP"].includes(draft.action)
              ? "Simular envio"
              : "Testar com prévia"}
          </Button>
          {simulation && (
            <p className="automation-simulation" role="status">
              {simulation}
            </p>
          )}
          <details className="automation-test-history">
            <summary>Resultados dos testes ({history.length})</summary>
            {history.map((h) => (
              <div key={h.id}>
                <strong>{h.name}</strong>
                <p>{h.result}</p>
              </div>
            ))}
          </details>
        </div>
      </aside>
      <div className="automation-editor-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar alterações
        </Button>
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={() => move(step - 1)}>
              Voltar ao passo anterior
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => move(step + 1)}>Continuar</Button>
          ) : (
            <Button
              disabled={assignees.isPending || !!problem}
              onClick={() => {
                if (problem) setError(problem);
                else onSave();
              }}
            >
              Salvar rascunho
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
