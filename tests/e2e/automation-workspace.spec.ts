import { test, expect } from "@playwright/test";
import {
  companyDay,
  companyInstant,
  companyInput,
  shiftDay,
} from "../../apps/web/src/lib/company-time";
import { readRule } from "../../apps/web/src/features/sales/automation-model";
import { interpretRequest } from "../../apps/web/src/features/sales/automation-assistant";

test("company dates and controlled interpretation preserve boundaries and explicit identities", () => {
  expect(companyInstant("2026-10-05T00:00", "America/Campo_Grande")).toBe(
    "2026-10-05T04:00:00.000Z",
  );
  expect(companyDay("2026-10-05T03:59:59Z", "America/Campo_Grande")).toBe(
    "2026-10-04",
  );
  expect(companyDay("2026-10-05T04:00:00Z", "America/Campo_Grande")).toBe(
    "2026-10-05",
  );
  expect(companyDay("2026-10-05", "America/Campo_Grande")).toBe("2026-10-05");
  expect(companyInput("2026-10-05T04:00:00Z", "Asia/Tokyo")).toBe(
    "2026-10-05T13:00",
  );
  expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  expect(() => companyInstant("2026-03-08T02:30", "America/New_York")).toThrow(
    /não existe/,
  );
  expect(interpretRequest("apagar tudo", [])).toBeNull();
  const raw = {
    id: "rule",
    name: "Aviso",
    stageId: "stage",
    channel: "EMAIL",
    enabled: false,
    delay: "0",
    minimum: "",
    subject: "Aviso",
    message: "Olá",
    recipient: {
      kind: "USER",
      id: "creator-a",
      name: "Ana",
      email: "ana@example.test",
    },
  };
  const reopenedByB = readRule(JSON.parse(JSON.stringify(raw)));
  expect(reopenedByB?.recipient).toEqual(raw.recipient);
  expect(
    readRule({
      ...raw,
      recipient: { kind: "USER", id: "b", name: "B", email: "invalid" },
    }),
  ).toBeNull();
});
for (const mobile of [false, true])
  test(`workspace templates assistant agenda: ${mobile ? "mobile" : "desktop"}`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
    const headers = { Origin: baseURL! };
    expect(
      (
        await page.request.post("/api/auth/register", {
          headers,
          data: {
            name: "Criadora Ana",
            companyName: "Workspace demo",
            email: `workspace-${suffix}@example.test`,
            password: `Desmos-Test-${suffix}!`,
          },
        })
      ).status(),
    ).toBe(201);
    const me = await (await page.request.get("/api/me")).json();
    const create = await page.request.post("/api/sales/pipelines", {
      headers,
      data: {
        name: "Vendas",
        stages: ["Entrada", "Contato", "Reunião", "Proposta", "Fechamento"].map(
          (name, i) => ({ name, probability: i * 20, color: "#173b68" }),
        ),
      },
    });
    expect(create.status()).toBe(201);
    const pipeline = (await create.json()).item;
    await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
    await page
      .getByLabel("Posição da nova etapa")
      .selectOption(pipeline.stages[2].id);
    await page
      .getByRole("button", { name: "Adicionar etapa", exact: true })
      .click();
    await page
      .getByLabel("Nome da etapa", { exact: true })
      .nth(2)
      .fill("Validação");
    await page
      .getByRole("button", { name: "Salvar pipeline", exact: true })
      .click();
    await expect(page).toHaveURL(/\/sales\/pipelines$/);
    await page.goto(`/sales/automations?pipelineId=${pipeline.id}`);
    await expect(page.getByLabel("Nome da automação")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Modelos de mensagem", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Criar modelo", exact: true })
      .click();
    await page.getByLabel("Nome do modelo").fill("Aviso de reunião");
    await page.getByLabel("Assunto do modelo").fill("Reunião de {negociacao}");
    await page
      .getByLabel("Corpo do modelo")
      .fill("Olá {contato}, vamos conversar sobre {negociacao}?");
    await page
      .getByRole("button", { name: "Salvar modelo", exact: true })
      .dblclick();
    await page.getByRole("button", { name: "Assistente", exact: true }).click();
    await page.getByRole("button", { name: "Usar exemplo de reunião" }).click();
    await page
      .getByRole("button", { name: "Interpretar pedido", exact: true })
      .click();
    await expect(page.getByLabel("Escolher etapa")).toHaveValue(
      pipeline.stages[2].id,
    );
    await expect(page.getByLabel("Destinatário interpretado")).toHaveValue(
      "USER",
    );
    await page
      .getByRole("button", { name: "Gerar rascunho para revisão" })
      .click();
    await expect(page.getByLabel("Nome da automação")).toBeVisible();
    await expect(
      page.getByText(`${me.user.name} · ${me.user.email} (criador fixo)`, {
        exact: true,
      }),
    ).toBeVisible();
    let mutations = 0;
    page.on("request", (r) => {
      if (["POST", "PATCH", "PUT"].includes(r.method())) mutations++;
    });
    await page
      .getByRole("button", { name: "Simular envio", exact: true })
      .dblclick();
    await expect(page.getByText("Resultados dos testes (1)")).toBeVisible();
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .dblclick();
    expect(mutations).toBe(0);
    const saved = await page.evaluate(
      ({ tenantId, pid }) =>
        JSON.parse(
          localStorage.getItem(`desmos-demo-automations:${tenantId}:${pid}`)!,
        ),
      { tenantId: me.tenant.id, pid: pipeline.id },
    );
    const rule = saved.rules.find((r: any) => r.recipient.kind === "USER");
    expect(rule.recipient.id).toBe(me.user.id);
    expect(rule.messageTemplate.revision).toBe(1);
    await page.reload();
    await page
      .getByRole("button", { name: /Email ao entrar em Reunião/ })
      .click();
    await expect(page.getByLabel("Etapa de entrada")).toHaveValue(
      pipeline.stages[2].id,
    );
    await page
      .getByRole("button", { name: "Modelos de mensagem", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Editar modelo Aviso de reunião",
        exact: true,
      })
      .click();
    await page.getByLabel("Corpo do modelo").fill("Versão nova {contato}");
    await page
      .getByRole("button", { name: "Salvar modelo", exact: true })
      .click();
    await page.getByRole("button", { name: "Automações", exact: true }).click();
    await page
      .getByRole("button", { name: /Email ao entrar em Reunião/ })
      .click();
    await expect(page.getByLabel("Mensagem", { exact: true })).toHaveValue(
      "Olá {contato}, vamos conversar sobre {negociacao}?",
    );
    await expect(
      page.getByRole("button", { name: "Atualizar versão do modelo" }),
    ).toBeVisible();
    // Opening as another authenticated identity must not rebind a stored creator recipient.
    await page.route("**/api/me", async (route) =>
      route.fulfill({
        json: {
          ...me,
          user: {
            ...me.user,
            id: "different-reader",
            name: "Leitor B",
            email: "reader-b@example.test",
          },
        },
      }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: /Email ao entrar em Reunião/ })
      .click();
    await expect(page.getByLabel("Destinatário", { exact: true })).toHaveValue(
      "USER",
    );
    await expect(
      page.getByLabel("Destinatário", { exact: true }),
    ).toContainText(me.user.email);
    await page.unroute("**/api/me");
    await page
      .getByRole("button", { name: "Atualizar versão do modelo" })
      .click();
    await expect(page.getByLabel("Mensagem", { exact: true })).toHaveValue(
      "Versão nova {contato}",
    );
    await page.getByLabel("Nome da automação").fill("Não substituir");
    await page.getByRole("button", { name: "Assistente", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Continuar editando" }).click();
    await expect(page.getByLabel("Nome da automação")).toHaveValue(
      "Não substituir",
    );
    await page.getByRole("button", { name: "Cancelar alterações" }).click();
    if (!mobile) {
      const savedTemplates = await page.evaluate(
        (tenantId) =>
          localStorage.getItem(`desmos-message-templates:${tenantId}:v1`),
        me.tenant.id,
      );
      await page.evaluate(
        (tenantId) =>
          localStorage.setItem(
            `desmos-message-templates:${tenantId}:v1`,
            JSON.stringify({ version: 1, items: [] }),
          ),
        me.tenant.id,
      );
      await page.reload();
      await page
        .getByRole("button", { name: /Email ao entrar em Reunião/ })
        .click();
      await expect(
        page.locator(".automation-builder").getByRole("alert"),
      ).toContainText("Modelo removido");
      await page
        .getByRole("button", { name: "Salvar rascunho", exact: true })
        .click();
      await expect(
        page.locator(".automation-builder").getByRole("alert"),
      ).toContainText("Modelo removido");
      await page
        .getByRole("button", { name: "Personalizar só nesta regra" })
        .click();
      await expect(
        page.getByLabel("Mensagem", { exact: true }),
      ).not.toHaveAttribute("readonly", "");
      await page.getByRole("button", { name: "Cancelar alterações" }).click();
      await page.evaluate(
        ({ tenantId, raw }) =>
          localStorage.setItem(`desmos-message-templates:${tenantId}:v1`, raw!),
        { tenantId: me.tenant.id, raw: savedTemplates },
      );
      await page.reload();
    }
    await page.getByRole("button", { name: "Assistente", exact: true }).click();
    await page
      .getByLabel("Descreva sua automação")
      .fill(
        "na pipeline inexistente quando chegar na etapa da reunião me enviar um email",
      );
    await page
      .getByRole("button", { name: "Interpretar pedido", exact: true })
      .click();
    await expect(page.getByLabel("Escolher funil")).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Gerar rascunho para revisão" }),
    ).toBeDisabled();
    await page.getByLabel("Escolher funil").selectOption(pipeline.id);
    await page.getByLabel("Escolher etapa").selectOption(pipeline.stages[2].id);
    await expect(
      page.getByRole("button", { name: "Gerar rascunho para revisão" }),
    ).toBeEnabled();
    await page
      .getByLabel("Descreva sua automação")
      .fill("apagar todos os contatos");
    await page
      .getByRole("button", { name: "Interpretar pedido", exact: true })
      .click();
    await expect(page.getByRole("log")).toContainText("Não executo comandos");
    await page.reload();
    const day = companyDay(new Date(), me.tenant.timezone);
    const dueAt = companyInstant(`${day}T09:00`, me.tenant.timezone);
    const taskResponse = await page.request.post("/api/sales/tasks", {
      headers,
      data: {
        title: "Confirmar reunião na Agenda",
        assignedTo: me.user.id,
        dueAt,
      },
    });
    expect(taskResponse.status()).toBe(201);
    const task = (await taskResponse.json()).item;
    await page.goto("/sales/agenda");
    await expect(
      page.getByRole("button", { name: /Confirmar reunião na Agenda/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Confirmar reunião na Agenda/ })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Reagendar ou editar" }).click();
    await expect(dialog.getByLabel("Prazo", { exact: true })).toHaveValue(
      `${day}T09:00`,
    );
    await dialog.getByLabel("Prazo", { exact: true }).fill(`${day}T11:00`);
    await dialog
      .getByRole("button", { name: "Salvar tarefa", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    expect(
      new Date(
        (await (await page.request.get(`/api/sales/tasks/${task.id}`)).json())
          .item.dueAt,
      ).toISOString(),
    ).toBe(companyInstant(`${day}T11:00`, me.tenant.timezone));
    await page
      .getByRole("button", { name: /Confirmar reunião na Agenda/ })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Concluir", exact: true })
      .dblclick();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(
      (await (await page.request.get(`/api/sales/tasks/${task.id}`)).json())
        .item.status,
    ).toBe("DONE");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    if (!mobile) {
      for (let offset = 0; offset < 101; offset += 10) {
        const batch = await Promise.all(
          Array.from({ length: Math.min(10, 101 - offset) }, (_, i) =>
            page.request.post("/api/sales/tasks", {
              headers,
              data: {
                title: `Pagina ${offset + i}`,
                assignedTo: me.user.id,
                dueAt,
              },
            }),
          ),
        );
        for (const r of batch) expect(r.status()).toBe(201);
      }
      await page.reload();
      await expect(
        page.getByText(
          "100 de 102 registros · carregue mais para ver o restante",
        ),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Carregar mais registros", exact: true })
        .click();
      await expect(
        page.getByText("102 de 102 registros · período completo"),
      ).toBeVisible();
      expect(await page.locator(".agenda-item").count()).toBe(102);
    }
  });
