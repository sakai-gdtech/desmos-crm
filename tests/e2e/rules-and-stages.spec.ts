import { selectOption } from "../../scripts/select-option.mjs";
import { editorStep, library, stageRules } from "./automation-flow-helpers";
import { test, expect } from "@playwright/test";
for (const mobile of [false, true]) {
  test(`automações e etapas: ${mobile ? "celular" : "notebook"}`, async ({
    page,
    baseURL,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
    const headers = { Origin: baseURL! };
    expect(
      (
        await page.request.post("/api/auth/register", {
          headers,
          data: {
            name: "Gestora",
            companyName: "Empresa de fluxo",
            email: `flow-${suffix}@example.test`,
            password: `Desmos-Test-${suffix}!`,
          },
        })
      ).status(),
    ).toBe(201);
    const created = await page.request.post("/api/sales/pipelines", {
      headers,
      data: {
        name: "Vendas",
        stages: [
          "Entrada",
          "Reunião",
          "Proposta",
          "Negociação",
          "Fechamento",
        ].map((name, i) => ({ name, probability: i * 20, color: "#173b68" })),
      },
    });
    expect(created.status()).toBe(201);
    const pipeline = (await created.json()).item;
    const dealResponse = await page.request.post("/api/sales/deals", {
      headers,
      data: {
        title: "Negócio preservado",
        pipelineId: pipeline.id,
        stageId: pipeline.stages[2].id,
        value: "25000.00",
        currency: "BRL",
      },
    });
    expect(dealResponse.status()).toBe(201);
    const deal = (await dealResponse.json()).item;
    await page.goto(`/sales/automations?pipelineId=${pipeline.id}`);
    await page
      .getByText("Começar com uma receita de automação", { exact: true })
      .click();
    await selectOption(page.getByLabel("Receita de automação"), "TASK");
    await page
      .getByRole("button", { name: "Usar receita", exact: true })
      .click();
    await expect(page.getByLabel("O que acontece")).toHaveAttribute(
      "data-value",
      "DEAL_CREATED",
    );
    await editorStep(page, 1);
    await page.getByLabel("Nome da automação").fill("Acompanhar cadastro");
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .dblclick();
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Testar com prévia", exact: true })
      .dblclick();
    await expect(
      page.getByText(/Simulação: nenhum registro foi alterado/).first(),
    ).toBeVisible();
    await expect(page.getByText("Resultados dos testes (1)")).toBeVisible();
    const tasks = await page.request.get(`/api/sales/tasks?dealId=${deal.id}`);
    expect((await tasks.json()).total).toBe(0);
    await editorStep(page, 1);
    await page.getByLabel("Nome da automação").fill("Não salvar");
    await page.getByRole("button", { name: "Cancelar alterações" }).click();
    if (await page.getByRole("dialog").isVisible())
      await page.getByRole("button", { name: "Descartar e continuar" }).click();
    await page.getByRole("button", { name: /Acompanhar cadastro/ }).click();
    await expect(page.getByLabel("Nome da automação")).toHaveValue(
      "Acompanhar cadastro",
    );
    // Select a saved rule and bind to an ID that must survive insertion, drag and rename.
    await editorStep(page, 1);
    await selectOption(page.getByLabel("O que acontece"), "STAGE_CHANGED");
    await editorStep(page, 1);
    await selectOption(
      page.getByLabel("Etapa de entrada"),
      pipeline.stages[2].id,
    );
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await page.reload();
    // First rule remains the incumbent email; select the saved task explicitly.
    await page.getByRole("button", { name: /Acompanhar cadastro/ }).click();
    await expect(page.getByLabel("Etapa de entrada")).toHaveAttribute(
      "data-value",
      pipeline.stages[2].id,
    );
    await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
    await selectOption(
      page.getByLabel("Posição da nova etapa"),
      pipeline.stages[2].id,
    );
    await page
      .getByRole("button", { name: "Adicionar etapa", exact: true })
      .click();
    await page
      .getByLabel("Nome da etapa", { exact: true })
      .nth(2)
      .fill("Validação");
    await page
      .getByRole("button", { name: "Mover Validação para cima", exact: true })
      .click();
    await expect(
      page.getByLabel("Nome da etapa", { exact: true }).nth(1),
    ).toHaveValue("Validação");
    await page
      .getByRole("button", { name: "Mover Validação para baixo", exact: true })
      .click();
    if (!mobile) {
      const handles = page.getByRole("button", { name: /Arrastar etapa/ });
      await handles.nth(4).scrollIntoViewIfNeeded();
      const source = await handles.nth(4).boundingBox();
      await page.mouse.move(
        source!.x + source!.width / 2,
        source!.y + source!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        source!.x + source!.width / 2 + 12,
        source!.y + source!.height / 2 + 8,
        { steps: 5 },
      );
      await handles.nth(0).scrollIntoViewIfNeeded();
      const target = await handles.nth(0).boundingBox();
      await page.mouse.move(
        target!.x + target!.width / 2,
        target!.y + target!.height / 2,
        { steps: 15 },
      );
      await page.mouse.move(
        target!.x + target!.width / 2 + 2,
        target!.y + target!.height / 2 + 2,
      );
      await page.mouse.up();
      await expect(
        page.getByLabel("Nome da etapa", { exact: true }).first(),
      ).toHaveValue("Negociação");
    }
    const names = await page
      .getByLabel("Nome da etapa", { exact: true })
      .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    const proposalIndex = names.indexOf("Proposta");
    await page
      .getByLabel("Nome da etapa", { exact: true })
      .nth(proposalIndex)
      .fill("Proposta revisada");
    let saves = 0;
    page.on("request", (r) => {
      if (
        r.method() === "PATCH" &&
        r.url().endsWith(`/sales/pipelines/${pipeline.id}`)
      )
        saves++;
    });
    await page
      .getByRole("button", { name: "Salvar funil", exact: true })
      .dblclick();
    await expect(page).toHaveURL(/\/sales\/pipelines$/);
    expect(saves).toBe(1);
    const saved = (
      await (
        await page.request.get(`/api/sales/pipelines/${pipeline.id}`)
      ).json()
    ).item;
    expect(saved.stages).toHaveLength(6);
    expect(saved.stages.map((s: any) => s.position)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(
      saved.stages.find((s: any) => s.name === "Proposta revisada").id,
    ).toBe(pipeline.stages[2].id);
    const persisted = (
      await (await page.request.get(`/api/sales/deals/${deal.id}`)).json()
    ).item;
    expect(persisted.stageId).toBe(pipeline.stages[2].id);
    await page.goto(`/sales/board?pipelineId=${pipeline.id}`);
    await expect(page.locator(".sales-column h2")).toHaveText(
      saved.stages.map((s: any) => s.name),
    );
    await page.goto(`/sales/automations?pipelineId=${pipeline.id}`);
    await page.getByRole("button", { name: /Acompanhar cadastro/ }).click();
    await expect(page.getByLabel("Etapa de entrada")).toHaveAttribute(
      "data-value",
      pipeline.stages[2].id,
    );
    await editorStep(page, 3);
    await expect(
      page
        .getByRole("complementary", { name: "Prévia da automação" })
        .getByText("Negócio entrar em Proposta revisada"),
    ).toBeVisible();
    await editorStep(page, 2);
    await selectOption(page.getByLabel("Ação da automação"), "MOVE");
    await editorStep(page, 2);
    await selectOption(
      page.getByLabel("Etapa de destino"),
      pipeline.stages[2].id,
    );
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Testar com prévia", exact: true })
      .click();
    await expect(
      page.locator(".automation-builder").getByRole("alert"),
    ).toContainText("evitar um ciclo");
    await editorStep(page, 2);
    await selectOption(
      page.getByLabel("Etapa de destino"),
      pipeline.stages[0].id,
    );
    await editorStep(page, 1);
    await page.getByText("Adicionar condições", { exact: true }).click();
    await editorStep(page, 1);
    await page.getByLabel("Valor mínimo (R$)").fill("30000");
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Testar com prévia", exact: true })
      .click();
    await expect(
      page.getByText(/Condição não atendida: o exemplo/).first(),
    ).toBeVisible();
    await editorStep(page, 1);
    await page.getByLabel("Valor mínimo (R$)").fill("");
    await editorStep(page, 2);
    await selectOption(page.getByLabel("Ação da automação"), "ASSIGN");
    await editorStep(page, 2);
    await selectOption(page.getByLabel("Atribuir a"), { index: 1 });
    await editorStep(page, 1);
    await selectOption(page.getByLabel("O que acontece"), "LEAD_CREATED");
    await editorStep(page, 3);
    await page
      .getByRole("button", { name: "Testar com prévia", exact: true })
      .click();
    await expect(
      page.getByText(/troca de responsável preparada/).first(),
    ).toBeVisible();
    await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
    await page
      .getByLabel("Nome da etapa", { exact: true })
      .first()
      .fill("Cancelada");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page
      .getByRole("button", { name: "Descartar alterações", exact: true })
      .click();
    await page.goto(`/sales/pipelines/${pipeline.id}/edit`);
    await expect(
      page.getByLabel("Nome da etapa", { exact: true }).first(),
    ).not.toHaveValue("Cancelada");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}
