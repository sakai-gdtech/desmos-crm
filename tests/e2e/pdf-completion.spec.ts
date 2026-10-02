import { selectOption } from "../../scripts/select-option.mjs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const evidence = process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/pdf-completion";
async function account(page: Page, origin: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Gestora PDF",
      email: `pdf-${suffix}@example.test`,
      password: `Desmos-Test-${suffix}!`,
      companyName: `Ensaio PDF · fictício ${suffix}`,
    },
  });
  expect(response.status()).toBe(201);
  return (await page.request.get("/api/me")).json();
}
async function createPipeline(page: Page, origin: string) {
  const response = await page.request.post("/api/sales/pipelines", {
    headers: { Origin: origin },
    data: {
      name: "Jornada PDF",
      stages: [
        { name: "Entrada", color: "#405670", probability: 10 },
        { name: "Proposta", color: "#86734F", probability: 70 },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).item;
}
async function shot(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
}

test("PDF jornada conectada: CSV, campos, captura, conversão, proposta, perda, métricas e retorno", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const session = await account(page, baseURL!);
  const pipeline = await createPipeline(page, baseURL!);
  await page.goto("/crm/import?kind=leads");
  await page.getByLabel("Planilha CSV").setInputFiles({
    name: "leads.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "nome,email,telefone,origem\nLead Planilha,planilha@example.test,5511999991111,Planilha",
    ),
  });
  await page.getByRole("button", { name: "Validar e ver prévia" }).click();
  await expect(
    page.getByRole("heading", { name: "Revise a importação" }),
  ).toBeVisible();
  await shot(page, "01-import-preview-desktop");
  let releaseImport!: () => void;
  const importGate = new Promise<void>((resolve) => {
    releaseImport = resolve;
  });
  await page.route("**/api/crm/import", async (route) => {
    if (route.request().postDataJSON()?.mode === "import") await importGate;
    await route.continue();
  });
  await page.getByRole("button", { name: "Importar 1 cadastros" }).click();
  await expect(
    page.getByLabel("Possíveis duplicados por email ou telefone"),
  ).toBeDisabled();
  await expect(page.getByLabel("Planilha CSV")).toBeDisabled();
  releaseImport();
  await expect(page.getByText(/1 cadastros criados/)).toBeVisible();
  await page.goto("/crm/fields?kind=leads");
  await page.getByRole("button", { name: "Novo campo", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Área de interesse");
  await page
    .getByRole("checkbox", {
      name: "Compartilhar este campo com contatos após conversão",
    })
    .check();
  await page.getByRole("button", { name: "Criar campo", exact: true }).click();
  await expect(
    page.getByText("Área de interesse", { exact: true }),
  ).toBeVisible();
  await page.goto("/crm/intake");
  await page.getByRole("button", { name: "Novo formulário" }).click();
  await page.getByLabel("Nome do formulário").fill("Contato · demonstração");
  await page.getByLabel("Origem dos leads").fill("Evento PDF");
  await page.getByRole("button", { name: "Criar formulário" }).click();
  const path = await page
    .getByRole("link", { name: "Abrir formulário de captura" })
    .getAttribute("href");
  expect(path).toBeTruthy();
  await page.goto(path!);
  await page.getByLabel("Nome", { exact: true }).fill("Cliente Captura");
  await page
    .getByLabel("Email", { exact: true })
    .fill("captura-pdf@example.test");
  await page.getByLabel("Telefone", { exact: true }).fill("5511999992222");
  await page.getByRole("button", { name: "Enviar cadastro" }).click();
  await expect(
    page.getByRole("heading", { name: "Cadastro recebido" }),
  ).toBeVisible();
  await page.goto("/crm/leads");
  await page
    .getByRole("textbox", { name: "Buscar leads" })
    .fill("Cliente Captura");
  await page
    .getByRole("link", { name: "Cliente Captura", exact: true })
    .click();
  await page.getByRole("button", { name: "Editar campos" }).click();
  await page.getByLabel("Área de interesse").fill("Serviços B2B");
  await page.getByRole("button", { name: "Salvar campos" }).click();
  await expect(
    page
      .locator(".custom-fields-section")
      .getByText("Serviços B2B", { exact: true }),
  ).toBeVisible();
  const leadId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("link", { name: "Leads", exact: true }).last().click();
  await expect(page.getByRole("textbox", { name: "Buscar leads" })).toHaveValue(
    "Cliente Captura",
  );
  await page
    .getByRole("link", { name: "Cliente Captura", exact: true })
    .click();
  await expect(page).toHaveURL(`/crm/leads/${leadId}`);
  await page.reload();
  await expect(
    page
      .locator(".custom-fields-section")
      .getByText("Serviços B2B", { exact: true }),
  ).toBeVisible();
  const conversion = await page.request.post(
    `/api/sales/leads/${leadId}/convert`,
    {
      headers: { Origin: baseURL! },
      data: {
        opportunity: {
          title: "Projeto PDF",
          pipelineId: pipeline.id,
          stageId: pipeline.stages[0].id,
          value: "200.19",
          currency: "BRL",
        },
      },
    },
  );
  expect(conversion.status()).toBe(200);
  const converted = await conversion.json();
  const contact = converted.contact;
  const deal = converted.opportunity ?? converted.deal;
  expect(deal?.id).toBeTruthy();
  await page.goto(`/crm/contacts/${contact.id}`);
  await expect(
    page
      .locator(".custom-fields-section")
      .getByText("Serviços B2B", { exact: true }),
  ).toBeVisible();
  const update = await page.request.patch(`/api/crm/contacts/${contact.id}`, {
    headers: { Origin: baseURL! },
    data: { whatsapp: "5511999992222", version: contact.version },
  });
  expect(update.status()).toBe(200);
  await page.reload();
  await expect(
    page.locator('a[href="https://wa.me/5511999992222"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href="mailto:captura-pdf@example.test"]'),
  ).toBeVisible();
  const proposal = await page.request.put(
    `/api/sales/deals/${deal.id}/proposal`,
    {
      headers: { Origin: baseURL! },
      data: {
        items: [{ name: "Consultoria", quantity: 2, unitPrice: "100.10" }],
        discount: "0.01",
        version: 0,
      },
    },
  );
  expect(proposal.status()).toBe(200);
  const rule = await page.request.post("/api/sales/rules", {
    headers: { Origin: baseURL! },
    data: {
      pipelineId: pipeline.id,
      stageId: pipeline.stages[1].id,
      name: "Acompanhamento da jornada",
      trigger: "STAGE",
      days: 1,
      taskTitle: "Retomar Projeto PDF",
      enabled: true,
    },
  });
  expect(rule.status()).toBe(201);
  const current = (
    await (await page.request.get(`/api/sales/deals/${deal.id}`)).json()
  ).item;
  const stage = await page.request.patch(`/api/sales/deals/${deal.id}`, {
    headers: { Origin: baseURL! },
    data: { stageId: pipeline.stages[1].id, version: current.version },
  });
  expect(stage.status()).toBe(200);
  const alerts = await (await page.request.get("/api/notifications")).json();
  expect(
    alerts.items.some(
      (item: { title: string }) => item.title === "Retomar Projeto PDF",
    ),
  ).toBeTruthy();
  const wonResponse = await page.request.post("/api/sales/deals", {
    headers: { Origin: baseURL! },
    data: {
      title: "Segundo projeto PDF",
      assignedTo: session.user.id,
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
      contactId: contact.id,
      source: "Evento PDF",
      currency: "BRL",
      value: "300.00",
    },
  });
  expect(wonResponse.status()).toBe(201);
  const won = (await wonResponse.json()).item;
  expect(
    (
      await page.request.patch(`/api/sales/deals/${won.id}`, {
        headers: { Origin: baseURL! },
        data: { status: "WON", version: won.version },
      })
    ).status(),
  ).toBe(200);
  const exported = await (
    await page.request.get("/api/crm/export?kind=contacts&source=Evento%20PDF")
  ).json();
  expect(exported.total).toBe(1);
  expect(exported.csv).toContain("Cliente Captura");
  await page.reload();
  await expect(page.getByText(/salvou a proposta/)).toBeVisible();
  await shot(page, "02-client-timeline-desktop");
  await page.goto(`/sales/deals/${deal.id}`);
  await page.getByRole("button", { name: "Marcar como perdido" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar perda" }),
  ).toBeDisabled();
  await page
    .getByLabel("Motivo da perda", { exact: true })
    .fill("Sem orçamento");
  await page.getByRole("button", { name: "Confirmar perda" }).click();
  await expect(
    page.getByText("Perdida", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/workspace");
  await selectOption(page.getByLabel("Funil", { exact: true }), pipeline.id);
  await page.getByLabel("Origem", { exact: true }).fill("Evento PDF");
  await expect(page.getByText("Sem orçamento", { exact: true })).toBeVisible();
  await shot(page, "03-dashboard-desktop");
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  const totals = await (
    await page.request.get(
      `/api/sales/dashboard?pipelineId=${pipeline.id}&source=Evento%20PDF`,
    )
  ).json();
  expect(totals.lossReasons).toEqual([{ reason: "Sem orçamento", total: 1 }]);
  expect(totals.conversion).toBe(50);
  await page
    .getByRole("link", { name: "Negócios", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Lista", exact: true }).click();
  await selectOption(page.getByLabel("Filtrar pipeline"), pipeline.id);
  await page.getByLabel("Origem", { exact: true }).fill("Outra origem");
  await expect(
    page.getByRole("heading", { name: "Nenhuma oportunidade encontrada" }),
  ).toBeVisible();
  await page.getByLabel("Origem", { exact: true }).fill("Evento PDF");
  await selectOption(
    page.getByLabel("Responsável", { exact: true }),
    session.user.id,
  );
  await expect(
    page.getByRole("link", { name: "Segundo projeto PDF", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Criados a partir de").fill("2099-01-01");
  await expect(
    page.getByRole("heading", { name: "Nenhuma oportunidade encontrada" }),
  ).toBeVisible();
  await page.getByLabel("Criados a partir de").fill("2000-01-01");
  await expect(
    page.getByRole("link", { name: "Projeto PDF", exact: true }),
  ).toBeVisible();
  expect(session.tenant.id).toBeTruthy();
});

test("PDF regra real: criar, revisar, executar, editar/pausar, reabrir e avisos", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  await account(page, baseURL!);
  const pipeline = await createPipeline(page, baseURL!);
  await page.goto(`/sales/automations/internal?pipelineId=${pipeline.id}`);
  await page.getByRole("button", { name: "Criar regra interna" }).click();
  await page.getByLabel("Nome da regra").fill("Tarefa ao entrar em Proposta");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Descartar alterações?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continuar editando", exact: true })
    .click();
  await page.getByRole("link", { name: "Agenda", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Automações", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Tarefas e avisos automáticos" })
    .click();
  await expect(page.getByLabel("Nome da regra")).toHaveValue(
    "Tarefa ao entrar em Proposta",
  );
  await selectOption(
    page.getByLabel("Etapa", { exact: true }),
    pipeline.stages[1].id,
  );
  await page.getByLabel("Título da tarefa").fill("Retomar proposta");
  await page.getByRole("button", { name: "Revisar regra" }).click();
  await page
    .getByRole("checkbox", { name: "Ativar para próximos eventos" })
    .check();
  await shot(page, "04-rule-review-desktop");
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/sales/rules", async (route) => {
    if (route.request().method() === "POST") await saveGate;
    await route.continue();
  });
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/sales/rules") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Salvar regra" }).click();
  await page.getByRole("link", { name: "Agenda", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Automações", exact: true })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Tarefas e avisos automáticos" })
    .click();
  await expect(
    page.getByRole("button", { name: "Salvar regra", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Ativar para próximos eventos" }),
  ).toBeDisabled();
  releaseSave();
  expect((await saved).status()).toBe(201);
  await expect(page.getByLabel("Nome da regra")).toHaveCount(0);
  expect(
    (
      await (
        await page.request.get(`/api/sales/rules?pipelineId=${pipeline.id}`)
      ).json()
    ).items,
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: /Tarefa ao entrar em Proposta/ }),
  ).toBeVisible();
  const response = await page.request.post("/api/sales/deals", {
    headers: { Origin: baseURL! },
    data: {
      title: "Negócio automatizado",
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
      currency: "BRL",
    },
  });
  expect(response.status()).toBe(201);
  const deal = (await response.json()).item;
  const move = await page.request.patch(`/api/sales/deals/${deal.id}`, {
    headers: { Origin: baseURL! },
    data: { stageId: pipeline.stages[1].id, version: deal.version },
  });
  expect(move.status()).toBe(200);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Retomar proposta", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Tarefa ao entrar em Proposta/ })
    .click();
  await page.getByLabel("Nome da regra").fill("Proposta revisada");
  await page.getByRole("button", { name: "Revisar regra" }).click();
  await page
    .getByRole("checkbox", { name: "Ativar para próximos eventos" })
    .uncheck();
  await page.getByRole("button", { name: "Salvar regra" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Proposta revisada/ }),
  ).toContainText("Pausada");
  await page.getByRole("button", { name: /Avisos internos/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Avisos internos" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Retomar proposta", { exact: true }),
  ).toBeVisible();
  await shot(page, "05-internal-notifications-desktop");
  await page.getByRole("button", { name: "Marcar lido" }).first().click();
  await page.getByRole("button", { name: "Fechar janela" }).click();
  await page.goto("/sales/agenda");
  await expect(
    page.getByRole("heading", { name: "Agenda", exact: true }),
  ).toBeVisible();
});

test("PDF mobile escuro/reduced motion: importação, regra e painel sem overflow", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await account(page, baseURL!);
  const pipeline = await createPipeline(page, baseURL!);
  await page.goto("/workspace");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("orbit-theme", "dark");
  });
  await page.goto("/crm/import");
  await page.getByLabel("Planilha CSV").setInputFiles({
    name: "demo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("nome,email\nNome,wrong"),
  });
  await page.getByRole("button", { name: "Validar e ver prévia" }).click();
  await expect(
    page.getByRole("button", { name: "Importar 1 cadastros" }),
  ).toBeDisabled();
  await shot(page, "06-import-mobile-dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.goto(`/sales/automations/internal?pipelineId=${pipeline.id}`);
  await page.getByRole("button", { name: "Criar regra interna" }).click();
  await page.getByLabel("Nome da regra").fill("Atrasos");
  await selectOption(page.getByLabel("Quando", { exact: true }), "OVERDUE");
  await page.getByRole("button", { name: "Revisar regra" }).click();
  await shot(page, "07-rule-mobile-dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await page.getByRole("button", { name: "Salvar regra" }).click();
  await page.goto("/workspace");
  await expect(page.locator(".commercial-indicators")).toBeVisible();
  await shot(page, "08-dashboard-mobile-dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
