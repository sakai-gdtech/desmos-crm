import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { selectOption } from "../../scripts/select-option.mjs";

const before = process.env.FIELD_VISUAL_PHASE === "before";
const phase = before ? "before" : "after";
const out = process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/field-visual-fix";
const longName = "Informação".repeat(10);
for (const mobile of [false, true]) {
  for (const dark of [false, true]) {
    test.describe(`${mobile ? "mobile" : "desktop"} ${dark ? "dark" : "light"}`, () => {
      test.use({ hasTouch: mobile });
      test("layout dos campos em quatro entidades, controles e estados", async ({
        page,
        baseURL,
      }) => {
        test.setTimeout(180000);
        await mkdir(out, { recursive: true });
        const variant = `${mobile ? "mobile" : "desktop"}-${dark ? "dark" : "light"}`;
        await page.setViewportSize(
          mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(
          (theme) => localStorage.setItem("orbit-theme", theme),
          dark ? "dark" : "light",
        );
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        async function post(path: string, data: unknown) {
          const res = await page.request.post(`/api${path}`, {
            headers: { Origin: baseURL! },
            data,
          });
          expect(res.status(), path).toBe(201);
          return (await res.json()).item;
        }
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await post("/auth/register", {
          name: "Ana Layout",
          email: `layout-${suffix}@example.test`,
          password: `Desmos-Test-${suffix}!`,
          companyName: `Layout fictício ${suffix}`,
        });
        const pipeline = await post("/sales/pipelines", {
          name: "Treino visual",
          stages: [{ name: "Entrada", color: "#173b68", probability: 10 }],
        });
        const deal = await post("/sales/deals", {
          title: "Consultoria comercial · Atlas Logística",
          pipelineId: pipeline.id,
          stageId: pipeline.stages[0].id,
          value: "1000.00",
          currency: "BRL",
        });
        const records: Record<string, { id: string; path: string }> = {
          deals: { id: deal.id, path: `/sales/deals/${deal.id}` },
        };
        for (const kind of ["leads", "contacts", "companies"]) {
          const item = await post(`/crm/${kind}`, {
            name: `Cadastro fictício ${kind}`,
          });
          records[kind] = { id: item.id, path: `/crm/${kind}/${item.id}` };
        }
        const measurements: unknown[] = [];
        async function inspect(
          section: Locator,
          name: string,
          align?: Locator,
        ) {
          const box = await section.boundingBox();
          expect(box).toBeTruthy();
          const metrics = await section.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const content = el.querySelector("h3, p, .alert");
            const child = content?.getBoundingClientRect();
            return {
              paddingLeft: parseFloat(getComputedStyle(el).paddingLeft),
              x: rect.x,
              contentX: child?.x,
              overflow: el.scrollWidth - el.clientWidth,
            };
          });
          const aligned = align ? await align.boundingBox() : null;
          measurements.push({ name, ...metrics, alignedX: aligned?.x });
          if (!before) {
            expect(metrics.overflow, name).toBeLessThanOrEqual(1);
            if (aligned && metrics.contentX !== undefined)
              expect(
                Math.abs(metrics.contentX - aligned.x),
                name,
              ).toBeLessThanOrEqual(1);
          }
        }
        await page.goto(records.deals.path);
        const section = page.locator(".custom-fields-section");
        await expect(
          section.getByText(
            "Nenhum campo configurado para este tipo de registro.",
          ),
        ).toBeVisible();
        await inspect(
          section,
          "deal-empty",
          page.locator(".crm-tabs > button").first(),
        );
        await page
          .locator(".crm-activity-panel")
          .screenshot({ path: `${out}/${phase}-${variant}-empty.png` });
        for (const [kind, record] of Object.entries(records)) {
          const text = await post("/crm/fields", {
            kind,
            name: longName,
            type: "text",
          });
          const choice = await post("/crm/fields", {
            kind,
            name: "Área de interesse",
            type: "choice",
            options: ["Consultoria comercial", "Operação logística"],
          });
          await post("/crm/fields", {
            kind,
            name: "Autorizado",
            type: "boolean",
          });
          await post("/crm/fields", {
            kind,
            name: "Data de revisão",
            type: "date",
          });
          await post("/crm/fields", {
            kind,
            name: "Quantidade",
            type: "number",
          });
          await page.goto(record.path);
          await expect(
            section.getByRole("button", { name: "Editar campos" }),
          ).toBeVisible();
          await section.getByRole("button", { name: "Editar campos" }).click();
          await page
            .getByLabel(longName, { exact: true })
            .fill("TextoExtensoSemEspaços".repeat(50));
          await selectOption(
            page.getByLabel("Área de interesse", { exact: true }),
            "Consultoria comercial",
          );
          await selectOption(
            page.getByLabel("Autorizado", { exact: true }),
            "true",
          );
          await page
            .getByLabel("Data de revisão", { exact: true })
            .fill("2026-10-05");
          await page.getByLabel("Quantidade", { exact: true }).fill("12");
          await inspect(section, `${kind}-editing`);
          if (kind === "deals") {
            await section.getByLabel("Área de interesse").focus();
            await section.getByLabel("Área de interesse").press("ArrowDown");
            await expect(page.getByRole("listbox")).toBeVisible();
            if (!before)
              expect(
                (await new AxeBuilder({ page }).analyze()).violations,
              ).toEqual([]);
            await page.screenshot({
              path: `${out}/${phase}-${variant}-editing.png`,
              fullPage: true,
            });
            await section.getByLabel("Área de interesse").press("Escape");
          }
          await section.getByRole("button", { name: "Salvar campos" }).click();
          await expect(
            section.locator("dd").filter({ hasText: "TextoExtensoSemEspaços" }),
          ).toBeVisible();
          await inspect(
            section,
            `${kind}-saved`,
            kind === "deals"
              ? page.locator(".crm-tabs > button").first()
              : undefined,
          );
          if (kind === "deals" || kind === "leads")
            await page.screenshot({
              path: `${out}/${phase}-${variant}-${kind}-saved.png`,
              fullPage: true,
            });
          await page.reload();
          await expect(
            section.locator("dd").filter({ hasText: "TextoExtensoSemEspaços" }),
          ).toBeVisible();
          await section.getByRole("button", { name: "Editar campos" }).click();
          await page.getByLabel(longName).fill("Não salvar");
          await section
            .getByRole("button", { name: "Cancelar", exact: true })
            .click();
          await expect(
            section.locator("dd").filter({ hasText: "TextoExtensoSemEspaços" }),
          ).toBeVisible();
          expect(text.id).toBeTruthy();
          expect(choice.id).toBeTruthy();
        }
        for (const route of [
          "/crm/fields?kind=deals",
          "/crm/leads/new",
          "/sales/deals/new",
          "/sales/tasks/new",
          "/sales/activities/new",
          "/settings/company",
          "/sales/automations",
          "/crm/import",
          "/crm/intake",
        ]) {
          await page.goto(route);
          await expect(page.locator(".page-heading")).toBeVisible();
          const horizontal = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          measurements.push({ route, horizontal });
          if (!before) expect(horizontal, route).toBeLessThanOrEqual(1);
          if (route.startsWith("/crm/fields"))
            await page.screenshot({
              path: `${out}/${phase}-${variant}-manager.png`,
              fullPage: true,
            });
        }
        const session = await (await page.request.get("/api/me")).json();
        const intakeResponse = await page.request.post("/api/crm/intake", {
          headers: { Origin: baseURL! },
          data: {
            name: "Formulário fictício",
            source: "Teste visual",
            ownerIds: [session.user.id],
          },
        });
        expect(intakeResponse.status()).toBe(201);
        const intake = await intakeResponse.json();
        await page.goto(intake.path);
        await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
        const capturePadding = await page
          .locator(".capture-page > .card")
          .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
        measurements.push({ name: "capture", paddingLeft: capturePadding });
        if (!before) expect(capturePadding).toBeGreaterThanOrEqual(16);
        await page.screenshot({
          path: `${out}/${phase}-${variant}-capture.png`,
          fullPage: true,
        });
        if (!before) {
          await page.goto("/sales/board");
          await page
            .getByRole("link", {
              name: "Consultoria comercial · Atlas Logística",
              exact: true,
            })
            .click();
          const drawer = page.getByRole("dialog");
          await expect(drawer.locator(".custom-fields-section")).toBeVisible();
          await inspect(
            drawer.locator(".custom-fields-section"),
            "drawer",
            drawer.locator(".crm-tabs > button").first(),
          );
          await drawer.screenshot({
            path: `${out}/after-${variant}-drawer.png`,
          });
          await page.keyboard.press("Escape");
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route("**/api/crm/fields?kind=deals", async (route) => {
            await gate;
            await route.continue();
          });
          await page.goto(records.deals.path);
          await expect(
            section.getByText("Carregando campos personalizados…"),
          ).toBeVisible();
          await inspect(section, "loading");
          release();
          await expect(
            section.getByRole("button", { name: "Editar campos" }),
          ).toBeVisible();
          await page.unroute("**/api/crm/fields?kind=deals");
          await page.route("**/api/crm/fields?kind=deals", (route) =>
            route.fulfill({
              status: 403,
              json: { message: "Falha fictícia na leitura dos campos." },
            }),
          );
          await page.reload();
          await expect(
            section.getByText(/Não foi possível carregar os campos/),
          ).toBeVisible();
          await inspect(section, "error");
          await section.screenshot({
            path: `${out}/after-${variant}-error.png`,
          });
          await page.unroute("**/api/crm/fields?kind=deals");
          await section
            .getByRole("button", { name: "Tentar novamente" })
            .click();
          await expect(
            section.getByRole("button", { name: "Editar campos" }),
          ).toBeVisible();
        }
        expect(errors).toEqual([]);
        await writeFile(
          `${out}/${phase}-${variant}-measurements.json`,
          JSON.stringify(measurements, null, 2),
        );
      });
    });
  }
}
