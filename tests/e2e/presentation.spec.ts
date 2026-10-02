import { selectOption } from "../../scripts/select-option.mjs";
import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(`jornada de apresentação ${mobile ? "celular" : "notebook"}: Radar, tarefa, proposta, ganho e filtros`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120000);
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reg = await page.request.post("/api/auth/register", {
      headers: { Origin: baseURL! },
      data: {
        name: "Ana Demo",
        email: `presentation-${suffix}@example.test`,
        password: `Desmos-Presentation-${suffix}!`,
        companyName: "Empresa de apresentação",
      },
    });
    expect(reg.status()).toBe(201);
    const user = (await (await page.request.get("/api/me")).json()).user;
    const pipeline = (
      await (
        await page.request.post("/api/sales/pipelines", {
          headers: { Origin: baseURL! },
          data: {
            name: "Comercial",
            stages: [
              "Entrada",
              "Contato",
              "Reunião",
              "Proposta",
              "Negociação",
              "Fechamento",
            ].map((name, i) => ({
              name,
              probability: i * 15,
              color: "#173b68",
              staleDays: 7,
              requireActivity: false,
            })),
          },
        })
      ).json()
    ).item;
    const dealResponse = await page.request.post("/api/sales/deals", {
      headers: { Origin: baseURL! },
      data: {
        title: "Projeto Aurora",
        pipelineId: pipeline.id,
        stageId: pipeline.stages[2].id,
        value: "25000.00",
        currency: "BRL",
        assignedTo: user.id,
      },
    });
    expect(dealResponse.status()).toBe(201);
    const deal = (await dealResponse.json()).item;
    await page.goto("/workspace");
    await expect(
      page.getByRole("heading", { name: "Radar Comercial", exact: true }),
    ).toBeVisible();
    await page
      .locator(".radar-list")
      .getByRole("link", { name: /Projeto Aurora/ })
      .click();
    const drawer = page.getByRole("dialog", { name: "Detalhes do negócio" });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".deal-essentials")).toContainText("R$");
    await expect(drawer.locator(".deal-essentials")).toContainText("Ana Demo");
    await drawer
      .getByRole("button", { name: "Criar tarefa", exact: true })
      .click();
    await drawer
      .getByLabel("O que precisa ser feito?", { exact: true })
      .fill("Confirmar proposta com Marina");
    await drawer
      .getByRole("button", { name: "Salvar tarefa", exact: true })
      .dblclick();
    await expect(
      drawer.getByText("Próxima ação registrada.", { exact: true }),
    ).toBeVisible();
    const tasks = await (
      await page.request.get(`/api/sales/tasks?dealId=${deal.id}`)
    ).json();
    expect(tasks.total).toBe(1);
    expect(tasks.items[0].dealId).toBe(deal.id);
    await drawer.getByRole("button", { name: "Fechar negócio" }).click();
    await expect(
      page.getByRole("heading", { name: "Tudo em dia por aqui" }),
    ).toBeVisible();
    await page.goto(`/sales/board?pipelineId=${pipeline.id}`);
    await page.getByLabel("Buscar negócios").fill("Projeto");
    await selectOption(
      page.getByLabel("Responsável", { exact: true }),
      user.id,
    );
    const card = page
      .locator(".sales-deal-card")
      .filter({ hasText: "Projeto Aurora" });
    await expect(card).toBeVisible();
    await page.locator(".sales-kanban").evaluate(
      (el, left) => {
        el.scrollLeft = left;
      },
      mobile ? 580 : 220,
    );
    await card
      .getByRole("link", { name: "Projeto Aurora", exact: true })
      .click();
    await expect(drawer).toBeVisible();
    const scroll = await page
      .locator(".sales-kanban")
      .evaluate((el) => el.scrollLeft);
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    expect(
      await page.locator(".sales-kanban").evaluate((el) => el.scrollLeft),
    ).toBe(scroll);
    await expect(page.getByLabel("Buscar negócios")).toHaveValue("Projeto");
    await expect(
      page.getByLabel("Responsável", { exact: true }),
    ).toHaveAttribute("data-value", user.id);
    await expect(
      card.getByRole("link", { name: "Projeto Aurora", exact: true }),
    ).toBeFocused();
    await card
      .getByRole("link", { name: "Projeto Aurora", exact: true })
      .click();
    await drawer
      .getByRole("button", { name: "Criar tarefa", exact: true })
      .click();
    await drawer.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect(
      (
        await (
          await page.request.get(`/api/sales/tasks?dealId=${deal.id}`)
        ).json()
      ).total,
    ).toBe(1);
    await drawer
      .getByRole("button", { name: "Ver proposta", exact: true })
      .click();
    await drawer.getByLabel("Quantidade", { exact: true }).fill("2");
    await drawer.getByLabel("Preço unitário (BRL)").fill("100.10");
    await drawer.getByLabel("Desconto (BRL)").fill("0.01");
    await drawer
      .getByRole("button", { name: "Salvar proposta", exact: true })
      .dblclick();
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(`/api/sales/deals/${deal.id}/proposal`)
            ).json()
          ).item?.total,
      )
      .toBe("200.19");
    await expect(drawer.locator(".deal-essentials")).toContainText("200,19");
    await drawer
      .getByRole("button", { name: "Marcar como ganho", exact: true })
      .click();
    const win = page.getByRole("dialog", { name: "Confirmar negócio ganho" });
    await expect(win).toContainText("200,19");
    await win.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect(
      (await (await page.request.get(`/api/sales/deals/${deal.id}`)).json())
        .item.status,
    ).toBe("OPEN");
    await drawer
      .getByRole("button", { name: "Marcar como ganho", exact: true })
      .click();
    await win
      .getByRole("button", { name: "Confirmar ganho", exact: true })
      .dblclick();
    await expect(
      drawer
        .locator(".sales-value-heading")
        .getByText("Ganha", { exact: true }),
    ).toBeVisible();
    await expect(win).not.toBeVisible();
    await drawer.getByRole("button", { name: "Fechar negócio" }).click();
    await page.goto("/workspace");
    await expect(page.locator(".commercial-indicators")).toContainText(
      "200,19",
    );
    await page.reload();
    await expect(page.locator(".commercial-indicators")).toContainText(
      "200,19",
    );
    await page.goto(`/sales/deals/${deal.id}/proposal`);
    await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue(
      "2",
    );
    await expect(page.getByLabel("Preço unitário (BRL)")).toHaveValue("100.10");
    await expect(page.getByLabel("Desconto (BRL)")).toHaveValue("0.01");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
