import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { selectOption } from "../../scripts/select-option.mjs";
const before = process.env.PIPELINE_VISUAL_PHASE === "before";
const out = process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/pipeline-design";
for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test.describe(`${mobile ? "mobile" : "desktop"} ${dark ? "dark" : "light"}`, () => {
      test.use({ hasTouch: mobile });
      test("editor de funil: informações, ordem, estados e retorno", async ({
        page,
        baseURL,
      }) => {
        test.setTimeout(90000);
        await mkdir(out, { recursive: true });
        const variant = `${mobile ? "mobile" : "desktop"}-${dark ? "dark" : "light"}`;
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        );
        await page.emulateMedia({
          reducedMotion: mobile ? "reduce" : "no-preference",
        });
        await page.addInitScript(
          (theme) => localStorage.setItem("orbit-theme", theme),
          dark ? "dark" : "light",
        );
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const headers = { Origin: baseURL! };
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        expect(
          (
            await page.request.post("/api/auth/register", {
              headers,
              data: {
                name: "Gestora Funil",
                email: `funil-${suffix}@example.test`,
                password: `Desmos-Test-${suffix}!`,
                companyName: `Funil fictício ${suffix}`,
              },
            })
          ).status(),
        ).toBe(201);
        const response = await page.request.post("/api/sales/pipelines", {
          headers,
          data: {
            name: "Comercial B2B",
            description: "Serviços para empresas",
            stages: [
              "Entrada",
              "Contato",
              "Reunião",
              "Proposta",
              "Negociação",
              "Fechamento",
            ].map((name, i) => ({
              name,
              color: i === 3 ? "#aa8446" : "#173b68",
              probability: i * 15,
              staleDays: 7,
              requireActivity: false,
            })),
          },
        });
        expect(response.status()).toBe(201);
        const pipeline = (await response.json()).item;
        const path = `/sales/pipelines/${pipeline.id}/edit?from=board`;
        await page.goto(path);
        await expect(page.getByLabel("Nome do funil")).toHaveValue(
          "Comercial B2B",
        );
        await page.screenshot({
          path: `${out}/${before ? "before" : "after"}-${variant}.png`,
          fullPage: true,
        });
        if (before) return;
        const help = page.getByRole("button", {
          name: "Informações: Ordem das etapas",
          exact: true,
        });
        await expect(
          page.getByRole("note", { name: "Ordem das etapas", exact: true }),
        ).not.toBeVisible();
        await help.focus();
        await help.press("Enter");
        const note = page.getByRole("note", {
          name: "Ordem das etapas",
          exact: true,
        });
        await expect(note).toBeVisible();
        const box = await note.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
        await page.keyboard.press("Escape");
        await expect(note).not.toBeVisible();
        await expect(help).toBeFocused();
        if (mobile) await help.tap();
        else await help.click();
        await expect(note).toBeVisible();
        await page.getByLabel("Nome do funil").click();
        await expect(note).not.toBeVisible();
        const rows = page.locator(".sales-stage-editor fieldset");
        await rows
          .nth(3)
          .getByText("Detalhes avançados", { exact: true })
          .click();
        await page.locator("#stage-prob-3").fill("70");
        await page.locator("#stage-days-3").fill("9");
        await rows
          .nth(3)
          .getByLabel("Exigir próxima atividade ao mover para esta etapa")
          .check();
        await page
          .getByRole("button", { name: "Informações: Próxima atividade" })
          .click();
        await expect(
          page.getByRole("note", { name: "Próxima atividade" }),
        ).toContainText("tarefa ou atividade futura");
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: `${out}/after-${variant}-advanced-help.png`,
          fullPage: true,
        });
        await page.keyboard.press("Escape");
        await selectOption(
          page.getByLabel("Posição da nova etapa"),
          pipeline.stages[3].id,
        );
        await page
          .getByRole("button", { name: "Adicionar etapa", exact: true })
          .click();
        await expect(page.locator("#stage-name-3")).toBeFocused();
        await page.locator("#stage-name-3").fill("Validação comercial");
        await page
          .getByRole("button", {
            name: "Mover Validação comercial para cima",
            exact: true,
          })
          .click();
        await expect(page.locator("#stage-name-2")).toHaveValue(
          "Validação comercial",
        );
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        const dialog = page.getByRole("dialog", {
          name: "Descartar alterações do funil?",
        });
        await expect(dialog).toBeVisible();
        await dialog
          .getByRole("button", { name: "Continuar editando" })
          .click();
        await page.route(
          `**/api/sales/pipelines/${pipeline.id}`,
          async (route) => {
            if (route.request().method() === "PATCH")
              await route.fulfill({
                status: 503,
                json: {
                  error: {
                    code: "TEST_FAILURE",
                    message: "Falha fictícia ao salvar. Tente novamente.",
                  },
                },
              });
            else await route.continue();
          },
        );
        await page
          .getByRole("button", { name: "Salvar funil", exact: true })
          .click();
        await expect(
          page
            .getByRole("alert")
            .filter({ hasText: "Falha fictícia ao salvar" }),
        ).toBeVisible();
        await expect(page.locator("#stage-name-2")).toHaveValue(
          "Validação comercial",
        );
        await page.unroute(`**/api/sales/pipelines/${pipeline.id}`);
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let saves = 0;
        await page.route(
          `**/api/sales/pipelines/${pipeline.id}`,
          async (route) => {
            if (route.request().method() === "PATCH") {
              saves++;
              await gate;
            }
            await route.continue();
          },
        );
        await page
          .getByRole("button", { name: "Salvar funil", exact: true })
          .dblclick();
        await expect(page.getByLabel("Nome do funil")).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Cancelar", exact: true }),
        ).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Adicionar etapa", exact: true }),
        ).toBeDisabled();
        release();
        await expect(page).toHaveURL(`/sales/board?pipelineId=${pipeline.id}`);
        expect(saves).toBe(1);
        const saved = (
          await (
            await page.request.get(`/api/sales/pipelines/${pipeline.id}`)
          ).json()
        ).item;
        expect(saved.stages.find((s: any) => s.name === "Proposta").id).toBe(
          pipeline.stages[3].id,
        );
        expect(
          saved.stages.find((s: any) => s.name === "Proposta").requireActivity,
        ).toBe(true);
        expect(
          saved.stages.find((s: any) => s.name === "Proposta").probability,
        ).toBe(70);
        expect(
          saved.stages.find((s: any) => s.name === "Proposta").staleDays,
        ).toBe(9);
        await page.goto(path);
        await expect(page.locator("#stage-name-2")).toHaveValue(
          "Validação comercial",
        );
        await page.getByLabel("Nome do funil").fill("Não salvar");
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Descartar alterações", exact: true })
          .click();
        await expect(page).toHaveURL(`/sales/board?pipelineId=${pipeline.id}`);
        const long = "Etapa com identificação extensa ".repeat(3).slice(0, 96);
        const largeResponse = await page.request.post("/api/sales/pipelines", {
          headers,
          data: {
            name: "Funil limite fictício",
            stages: Array.from({ length: 20 }, (_, i) => ({
              name: `${i + 1} ${long}`,
              color: "#173b68",
              probability: i * 5,
            })),
          },
        });
        expect(largeResponse.status()).toBe(201);
        const large = (await largeResponse.json()).item;
        await page.goto(`/sales/pipelines/${large.id}/edit`);
        await expect(
          page.getByRole("button", { name: "Adicionar etapa", exact: true }),
        ).toBeDisabled();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
        await page
          .getByRole("button", {
            name: `Remover etapa 20 ${long}`,
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", { name: "Adicionar etapa", exact: true }),
        ).toBeEnabled();
        await page
          .getByRole("button", { name: "Adicionar etapa", exact: true })
          .click();
        await expect(page.locator("#stage-name-19")).toBeFocused();
        await page.locator("#stage-name-19").fill("Nova etapa de teste");
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Descartar alterações", exact: true })
          .click();
        await expect(page).toHaveURL("/sales/pipelines");
        expect(errors).toEqual([]);
        await writeFile(
          `${out}/${variant}-checks.json`,
          JSON.stringify(
            {
              pageErrors: errors,
              saves,
              preservedStageId: pipeline.stages[3].id,
            },
            null,
            2,
          ),
        );
      });
    });
  }
