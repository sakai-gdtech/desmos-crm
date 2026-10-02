import { selectOption } from "./select-option.mjs";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
const origin = process.env.E2E_BASE_URL ?? "http://localhost:3017";
const output = "docs/evidence/pdf-completion";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const fixtures = [];
const clock = new Date();
const future = new Date(+clock + 86400000).toISOString(),
  past = new Date(+clock - 86400000).toISOString();
try {
  for (const mode of ["withoutRadar", "withRadar"]) {
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
      recordVideo: {
        dir: "/tmp/desmos-radar-video",
        size: { width: 1440, height: 1000 },
      },
    });
    const request = context.request;
    const suffix = `${Date.now()}-${mode}`;
    const password = `Desmos-Compare-${suffix}!`;
    const registered = await request.post("/api/auth/register", {
      headers: { Origin: origin },
      data: {
        name: "Operador de ensaio",
        email: `radar-${suffix}@example.test`,
        password,
        companyName: `Comparação Radar · fictícia ${suffix}`,
      },
    });
    expect(registered.status()).toBe(201);
    const post = async (path, data) => {
      const response = await request.post(`/api${path}`, {
        headers: { Origin: origin },
        data,
      });
      expect(response.ok()).toBeTruthy();
      return response.json();
    };
    const pipeline = (
      await post("/sales/pipelines", {
        name: "Comparação de próxima ação",
        stages: [
          {
            name: "Em conversa",
            color: "#405670",
            probability: 30,
            staleDays: 365,
          },
        ],
      })
    ).item;
    const deals = [];
    for (let i = 1; i <= 4; i++) {
      const deal = (
        await post("/sales/deals", {
          title: `Cliente ${i}`,
          pipelineId: pipeline.id,
          stageId: pipeline.stages[0].id,
          currency: "BRL",
        })
      ).item;
      deals.push(deal);
      if (i === 1 || i === 3)
        await post("/sales/tasks", {
          title: "Compromisso anterior",
          dealId: deal.id,
          dueAt: past,
        });
      if (i === 1 || i === 4)
        await post("/sales/tasks", {
          title: "Próximo compromisso",
          dealId: deal.id,
          dueAt: future,
        });
    }
    fixtures.push({
      mode,
      pipelineId: pipeline.id,
      deals: deals.map((d) => ({ id: d.id, title: d.title })),
      expected: ["Cliente 2", "Cliente 3"],
      past,
      future,
    });
    await mkdir(output, { recursive: true });
    await writeFile(
      `${output}/radar-fixtures.json`,
      JSON.stringify({ clock: clock.toISOString(), fixtures }, null, 2),
    );
    const page = await context.newPage();
    const logs = [];
    let interactions = 0;
    const action = async (label, fn) => {
      interactions++;
      logs.push(label);
      await fn();
    };
    const start = performance.now();
    await action("Navegar à tela inicial", () =>
      page.goto(
        mode === "withoutRadar"
          ? `/sales/board?pipelineId=${pipeline.id}`
          : "/workspace",
      ),
    );
    if (mode === "withRadar")
      await action("Selecionar funil", () =>
        selectOption(page.getByLabel("Funil", { exact: true }), pipeline.id),
      );
    const drawer = page.getByRole("dialog", { name: "Detalhes do negócio" });
    if (mode === "withoutRadar") {
      // The board shows the earliest pending date, including a past commitment.
      // Inspect Client 1's commitments to see that it also has a future action.
      await action("Abrir Cliente 1 (data anterior no cartão)", () =>
        page.getByRole("link", { name: "Cliente 1", exact: true }).click(),
      );
      await action("Inspecionar tarefas do Cliente 1", () =>
        drawer.getByRole("button", { name: "Tarefas", exact: true }).click(),
      );
      await expect(
        drawer.getByRole("link", { name: "Próximo compromisso", exact: true }),
      ).toBeVisible();
      await action("Fechar Cliente 1 com próxima ação válida", () =>
        page.getByRole("button", { name: "Fechar negócio" }).click(),
      );
    } else {
      await expect(
        page.locator(".radar-list").getByRole("link", { name: /Cliente 1/ }),
      ).toHaveCount(0);
      await expect(
        page
          .locator(".radar-list")
          .getByText("Sem próxima ação", { exact: true }),
      ).toHaveCount(2);
    }
    for (const name of ["Cliente 2", "Cliente 3"]) {
      await action(`Abrir ${name}`, () =>
        mode === "withoutRadar"
          ? page.getByRole("link", { name, exact: true }).click()
          : page
              .locator(".radar-list")
              .getByRole("link", { name: new RegExp(`^${name} `) })
              .click(),
      );
      if (mode === "withoutRadar" && name === "Cliente 3")
        await action("Conferir compromisso vencido de Cliente 3", () =>
          drawer.getByRole("button", { name: "Tarefas", exact: true }).click(),
        );
      await action(`Criar próxima tarefa ${name}`, () =>
        drawer
          .getByRole("button", { name: "Criar tarefa", exact: true })
          .click(),
      );
      await action("Preencher próxima ação", () =>
        drawer
          .getByLabel("O que precisa ser feito?")
          .fill("Confirmar próximo contato"),
      );
      await action("Salvar tarefa", () =>
        drawer
          .getByRole("button", { name: "Salvar tarefa", exact: true })
          .click(),
      );
      await expect(drawer.getByText("Próxima ação registrada.")).toBeVisible();
      await action("Fechar negócio", () =>
        page.getByRole("button", { name: "Fechar negócio" }).click(),
      );
    }
    const durationMs = performance.now() - start;
    const state = await (
      await request.get(`/api/sales/dashboard?pipelineId=${pipeline.id}`)
    ).json();
    expect(state.noActionCount).toBe(0);
    const created = (
      await (
        await request.get(
          `/api/sales/tasks?pipelineId=${pipeline.id}&q=Confirmar`,
        )
      ).json()
    ).items;
    expect(created.length).toBe(2);
    expect(new Set(created.map((t) => t.dealId))).toEqual(
      new Set([deals[1].id, deals[2].id]),
    );
    await page.screenshot({
      path: `${output}/radar-${mode}.png`,
      fullPage: true,
    });
    const video = page.video();
    await context.close();
    await video.saveAs(`${output}/radar-${mode}.webm`);
    results.push({
      mode,
      durationMs: Number(durationMs.toFixed(1)),
      interactions,
      omissions: 0,
      falsePositives: 0,
      persistedTasks: created.length,
      logs,
    });
  }
  const report = {
    measuredAt: new Date().toISOString(),
    operator:
      "Playwright script, prepared fixture and routes; no human participant",
    method:
      "One equivalent A/B pair, Chrome headless dev server, reduced motion, no throttling. One interaction is a navigation, select, click, form-value fill or submit. Count includes start navigation and pipeline selection. Baseline inspects the oldest-date ambiguity (Client 1 also has a future task); Radar filters by future pending actions. Task: find records with no valid next action and create one for each. Times include load/network and automated input, not human speed; order A then B, no generalized usability claim.",
    results,
    interactionDifference: results[0].interactions - results[1].interactions,
  };
  await writeFile(
    `${output}/radar-comparison.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
