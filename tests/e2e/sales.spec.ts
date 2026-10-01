import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ reducedMotion: "reduce" });
async function account(page: Page, origin: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Gestora de vendas",
      email: `vendas-${suffix}@example.test`,
      password: `Desmos-Test-${suffix}!`,
      companyName: `Vendas ${suffix}`,
    },
  });
  expect(r.status()).toBe(201);
  return (await page.request.get("/api/me")).json();
}
async function fixturePipeline(page: Page, origin: string) {
  const r = await page.request.post("/api/sales/pipelines", {
    headers: { Origin: origin },
    data: {
      name: "Vendas",
      stages: [
        { name: "Entrada", probability: 10, color: "#4F46E5" },
        { name: "Proposta", probability: 70, color: "#16A34A" },
      ],
    },
  });
  expect(r.status()).toBe(201);
  return (await r.json()).item;
}
const localTomorrow = () => {
  const d = new Date(Date.now() + 86400000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

test("pipeline pela interface, oportunidade, Kanban, ganho/perda, tarefas e follow-up", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  await account(page, baseURL!);
  await page.goto("/sales/pipelines");
  await page.getByRole("link", { name: "Novo pipeline", exact: true }).click();
  await page.getByLabel("Nome do pipeline", { exact: true }).fill("Comercial");
  await page
    .getByRole("button", { name: "Salvar pipeline", exact: true })
    .click();
  await expect(page).toHaveURL("/sales/pipelines");
  const p = (await (await page.request.get("/api/sales/pipelines")).json())
    .items[0];
  await page.goto(`/sales/board?pipelineId=${p.id}`);
  await page.getByRole("link", { name: "Novo negócio", exact: true }).click();
  await page
    .getByLabel("Nome do negócio", { exact: true })
    .fill("Projeto Andrade");
  await page.getByLabel("Valor", { exact: true }).fill("12500.50");
  await page
    .getByRole("button", { name: "Salvar negócio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Projeto Andrade", exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.goto(`/sales/board?pipelineId=${p.id}`);
  const card = page
    .locator(".sales-deal-card")
    .filter({ hasText: "Projeto Andrade" });
  await card.dragTo(
    page.getByRole("region", {
      name: `Etapa ${p.stages[1].name}`,
      exact: true,
    }),
  );
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/sales/deals/${id}`)).json()).item
          .stageId,
    )
    .toBe(p.stages[1].id);
  await expect(
    page
      .getByRole("region", { name: `Etapa ${p.stages[1].name}`, exact: true })
      .getByRole("link", { name: "Projeto Andrade", exact: true }),
  ).toBeVisible();
  await page.goto(`/sales/deals/${id}`);
  await page
    .getByRole("button", { name: "Marcar como perdido", exact: true })
    .click();
  await page.getByLabel("Motivo da perda (opcional)").fill("Preço");
  await page
    .getByRole("button", { name: "Confirmar perda", exact: true })
    .click();
  await expect(
    page.getByText("Perdida", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reabrir negócio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Marcar como ganho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar ganho", exact: true })
    .click();
  await expect(page.getByText("Ganha", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Reabrir negócio", exact: true })
    .click();
  await page.getByRole("button", { name: "Tarefas", exact: true }).click();
  await page.getByRole("link", { name: "Criar tarefa", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Preparar proposta");
  await page.getByText("Mais detalhes", { exact: true }).click();
  await page.getByLabel("Prioridade", { exact: true }).selectOption("HIGH");
  await page.getByLabel("Prazo", { exact: true }).fill(localTomorrow());
  await page
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await page
    .getByLabel("Título do item 1", { exact: true })
    .fill("Confirmar valores");
  await page
    .getByRole("button", { name: "Salvar tarefa", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Preparar proposta", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Confirmar valores", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Confirmar valores", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Concluir tarefa", exact: true })
    .click();
  await expect(
    page.getByText("Concluída", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(`/sales/deals/${id}`);
  await page.getByRole("button", { name: "Atividades", exact: true }).click();
  await page.getByRole("link", { name: "Nova atividade", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Ligação com cliente");
  await page.getByLabel("Status", { exact: true }).selectOption("COMPLETED");
  await page
    .getByLabel("Resultado da interação", { exact: true })
    .fill("Apresentação confirmada");
  await page
    .getByLabel("Próximo contato (follow-up)", { exact: true })
    .fill(localTomorrow());
  await page
    .getByRole("button", { name: "Salvar atividade", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ligação com cliente", exact: true }),
  ).toBeVisible();
  const tasks = await (
    await page.request.get(`/api/sales/tasks?dealId=${id}`)
  ).json();
  expect(tasks.total).toBe(2);
  expect(tasks.items.map((w: any) => w.title)).toContain(
    "Follow-up: Ligação com cliente",
  );
  await page.goto(`/sales/deals/${id}`);
  await page.getByRole("button", { name: "Notas", exact: true }).click();
  await page.getByRole("button", { name: "Nova nota", exact: true }).click();
  await page
    .getByLabel("Nova nota", { exact: true })
    .fill("Cliente aprovou a demonstração.");
  await page
    .getByRole("button", { name: "Adicionar nota", exact: true })
    .click();
  await expect(
    page.getByText("Cliente aprovou a demonstração.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  const timeline = await (
    await page.request.get(`/api/sales/deals/${id}/timeline?pageSize=100`)
  ).json();
  expect(timeline.items.map((e: any) => e.type)).toEqual(
    expect.arrayContaining([
      "stage.changed",
      "status.lost",
      "status.won",
      "activity.created",
      "task.created",
      "note.created",
    ]),
  );
});

test("lead convertido gera contato, empresa e oportunidade pelo mesmo diálogo", async ({
  page,
  baseURL,
}) => {
  await account(page, baseURL!);
  const p = await fixturePipeline(page, baseURL!);
  const r = await page.request.post("/api/crm/leads", {
    headers: { Origin: baseURL! },
    data: {
      name: "Carolina Andrade",
      companyName: "Andrade Projetos",
      estimatedValue: "9000.50",
    },
  });
  expect(r.status()).toBe(201);
  const lead = (await r.json()).item;
  await page.goto(`/crm/leads/${lead.id}`);
  await page
    .getByRole("button", { name: "Converter lead", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Converter lead em contato",
  });
  await dialog
    .getByRole("checkbox", { name: "Criar oportunidade no funil" })
    .check();
  await dialog.getByLabel("Pipeline", { exact: true }).selectOption(p.id);
  await dialog
    .getByRole("button", { name: "Confirmar conversão", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .getByRole("link", { name: "Abrir oportunidade", exact: true }),
  ).toBeVisible();
  const converted = (
    await (await page.request.get(`/api/crm/leads/${lead.id}`)).json()
  ).item;
  expect(converted.convertedContactId).toBeTruthy();
  expect(converted.convertedCompanyId).toBeTruthy();
  expect(converted.convertedDealId).toBeTruthy();
  await page
    .getByRole("status")
    .getByRole("link", { name: "Abrir oportunidade", exact: true })
    .click();
  await expect(page).toHaveURL(`/sales/deals/${converted.convertedDealId}`);
  await expect(
    page.getByRole("heading", {
      name: "Negociação com Carolina Andrade",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/sales/deals/${converted.convertedDealId}`)
      ).json()
    ).item.value,
  ).toBe("9000.50");
});

test("Kanban: mover acessível, conflito sem sobrescrita, tema escuro e mobile sem overflow", async ({
  page,
  baseURL,
}) => {
  await account(page, baseURL!);
  const p = await fixturePipeline(page, baseURL!);
  const r = await page.request.post("/api/sales/deals", {
    headers: { Origin: baseURL! },
    data: {
      title: "Oportunidade móvel",
      pipelineId: p.id,
      stageId: p.stages[0].id,
      value: "1200",
      currency: "BRL",
    },
  });
  expect(r.status()).toBe(201);
  const d = (await r.json()).item;
  await page.goto(`/sales/board?pipelineId=${p.id}`);
  const card = page
    .locator(".sales-deal-card")
    .filter({ hasText: "Oportunidade móvel" });
  await expect(card).toBeVisible();
  expect(
    (
      await page.request.patch(`/api/sales/deals/${d.id}`, {
        headers: { Origin: baseURL! },
        data: { version: d.version, title: "Oportunidade atualizada" },
      })
    ).status(),
  ).toBe(200);
  await card.getByRole("button", { name: "Mover", exact: true }).click();
  await card
    .getByLabel("Mover para etapa", { exact: true })
    .selectOption(p.stages[1].id);
  await expect(
    page.getByText(/Este registro foi alterado por outra pessoa/).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Oportunidade atualizada", exact: true }),
  ).toBeVisible();
  const nextCard = page
    .locator(".sales-deal-card")
    .filter({ hasText: "Oportunidade atualizada" });
  await nextCard.getByRole("button", { name: "Mover", exact: true }).click();
  await nextCard
    .getByLabel("Mover para etapa", { exact: true })
    .selectOption(p.stages[1].id);
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`/api/sales/deals/${d.id}`)).json()).item
          .stageId,
    )
    .toBe(p.stages[1].id);
  await page.evaluate(() => localStorage.setItem("orbit-theme", "dark"));
  await page.reload();
  // O tema é controlado pelo mesmo botão utilizado nas demais superfícies.
  if (await page.getByRole("button", { name: "Ativar tema escuro" }).count())
    await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(
    page.getByRole("heading", { name: "Negócios", exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nextCard).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/sales/tasks/new");
  await expect(
    page.getByRole("heading", { name: "Criar tarefa", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
