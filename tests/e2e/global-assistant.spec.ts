import { test, expect } from "@playwright/test";
import { editorStep, library } from "./automation-flow-helpers";

for (const mobile of [false, true])
  test(`assistente global, revisão e movimento: ${mobile ? "mobile" : "desktop"}`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(60000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const headers = { Origin: baseURL! };
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
    const reg = await page.request.post("/api/auth/register", {
      headers,
      data: {
        name: "Criadora Global",
        companyName: "Empresa Global",
        email: `global-${suffix}@example.test`,
        password: `Desmos-Test-${suffix}!`,
      },
    });
    expect(reg.status()).toBe(201);
    const me = await (await page.request.get("/api/me")).json();
    const created = await page.request.post("/api/sales/pipelines", {
      headers,
      data: {
        name: "Vendas",
        stages: ["Entrada", "Reunião", "Proposta"].map((name, i) => ({
          name,
          probability: i * 30,
          color: "#173b68",
        })),
      },
    });
    expect(created.status()).toBe(201);
    const pipeline = (await created.json()).item;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/sales/agenda");
    const entry = page.getByRole("button", { name: "Assistente", exact: true });
    const panel = page.getByRole("complementary", {
      name: "Assistente Desmos",
    });
    await entry.click();
    await expect(panel).toContainText("Contexto: Agenda");
    await page.getByRole("button", { name: "Como usar esta tela?" }).click();
    await page
      .getByRole("button", { name: "Enviar pedido", exact: true })
      .click();
    await expect(panel.getByRole("log")).toContainText(
      "O fuso exibido é o da empresa",
    );
    await page.keyboard.press("Escape");
    await expect(entry).toBeFocused();
    await entry.click();
    await expect(panel.getByRole("log")).toContainText(
      "O fuso exibido é o da empresa",
    );
    await page.getByRole("button", { name: "Fechar assistente" }).click();
    if (mobile)
      await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("navigation", { name: "Trabalho comercial" })
      .getByRole("link", { name: "Tarefas", exact: true })
      .click();
    await entry.click();
    await expect(panel).toContainText("Contexto: Tarefas");
    await expect(panel.getByRole("log")).toContainText(
      "O fuso exibido é o da empresa",
    );
    let mutations = 0;
    page.on("request", (r) => {
      if (["POST", "PATCH", "PUT", "DELETE"].includes(r.method())) mutations++;
    });
    await page.getByRole("button", { name: "Preparar aviso por email" }).click();
    await page
      .getByRole("button", { name: "Enviar pedido", exact: true })
      .click();
    await expect(page.getByLabel("Escolher etapa")).toHaveValue(
      pipeline.stages[1].id,
    );
    await expect(page.getByLabel("Escolher modelo de mensagem")).toHaveValue(
      "",
    );
    await expect(page.getByLabel("Destinatário interpretado")).toHaveValue(
      "USER",
    );
    await page
      .getByRole("button", { name: "Gerar rascunho para revisão" })
      .click();
    await expect(page).toHaveURL(/\/sales\/automations\?pipelineId=/);
    await expect(panel).toBeHidden();
    await expect(page.getByLabel("Nome da automação")).toBeVisible();
    await editorStep(page, 2);
    await expect(
      page.getByLabel("Destinatário", { exact: true }),
    ).toContainText(me.user.email);
    await page
      .getByLabel("Mensagem", { exact: true })
      .fill("Aviso ao criador: {negociacao}");
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .dblclick();
    await page
      .getByRole("button", { name: "Simular envio", exact: true })
      .dblclick();
    expect(mutations).toBe(0);
    const saved = await page.evaluate(
      ({ tenantId, pid }) =>
        JSON.parse(
          localStorage.getItem(`desmos-demo-automations:${tenantId}:${pid}`)!,
        ),
      { tenantId: me.tenant.id, pid: pipeline.id },
    );
    expect(
      saved.rules.filter((r: any) => r.recipient.kind === "USER"),
    ).toHaveLength(1);
    expect(saved.history).toHaveLength(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await editorStep(page, 1);
    expect(
      await page
        .locator(".automation-editor-layout")
        .evaluate((el) => el.getAnimations().length),
    ).toBe(0);
    await entry.click();
    expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0);
    await page.getByRole("button", { name: "Fechar assistente" }).click();
    await page.getByLabel("Nome da automação").fill("Rascunho interrompido");
    await page
      .getByRole("button", { name: "Voltar às automações", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continuar editando" }).click();
    await expect(page.getByLabel("Nome da automação")).toHaveValue(
      "Rascunho interrompido",
    );
    await page.getByRole("button", { name: "Cancelar alterações" }).click();
    await page.getByRole("button", { name: "Descartar e continuar" }).click();
    await library(page);
    await page
      .getByRole("button", { name: "Criar modelo", exact: true })
      .click();
    await page.getByLabel("Nome do modelo").fill("Mensagem não salva");
    await page
      .getByRole("button", { name: "Voltar às automações", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continuar editando" }).click();
    // Next.js shell links must ask before discarding a library edit.
    if (mobile)
      await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("navigation", { name: "Trabalho comercial" })
      .getByRole("link", { name: "Agenda", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continuar editando" }).click();
    if (mobile) await page.keyboard.press("Escape");
    await expect(page.getByLabel("Nome do modelo")).toHaveValue(
      "Mensagem não salva",
    );
    await page.getByRole("button", { name: "Cancelar modelo" }).click();
    await page.getByRole("button", { name: "Descartar modelo" }).click();
    await page
      .getByRole("button", { name: "Criar modelo", exact: true })
      .click();
    await page.getByLabel("Nome do modelo").fill("Descartar ao navegar");
    if (mobile)
      await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("navigation", { name: "Trabalho comercial" })
      .getByRole("link", { name: "Agenda", exact: true })
      .click();
    await page.getByRole("button", { name: "Descartar e continuar" }).click();
    await expect(page).toHaveURL(/\/sales\/agenda$/);
    if (mobile)
      await expect(
        page.getByRole("button", { name: "Abrir navegação" }),
      ).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Ativar tema escuro" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
    // Account identity is replaced, while old tenant's Library exists in this browser.
    await page.route("**/api/me", (route) =>
      route.fulfill({
        json: {
          ...me,
          user: {
            ...me.user,
            id: "reader-b",
            name: "Leitor B",
            email: "reader-b@example.test",
          },
          tenant: { ...me.tenant, id: "tenant-b" },
          permissions: [],
        },
      }),
    );
    let pipelineReads = 0;
    await page.route("**/api/sales/pipelines", (route) => {
      pipelineReads++;
      return route.abort();
    });
    await page.goto("/workspace");
    await entry.click();
    await expect(panel.getByRole("log")).toBeEmpty();
    await expect(
      page.getByRole("button", { name: "Preparar aviso por email" }),
    ).toHaveCount(0);
    await page
      .getByLabel("Pergunte ou descreva uma automação")
      .fill("quando entrar na etapa reunião me enviar email");
    await page
      .getByRole("button", { name: "Enviar pedido", exact: true })
      .click();
    await expect(panel.getByRole("log")).toContainText("não tem permissão");
    expect(pipelineReads).toBe(0);
  });
