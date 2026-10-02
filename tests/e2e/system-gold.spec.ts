import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

const before = process.env.GOLD_VISUAL_PHASE === "before";
const out = process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/system-gold";
for (const mobile of [false, true])
  for (const dark of [false, true]) {
    test.describe(`identidade ${mobile ? "mobile" : "desktop"} ${dark ? "escuro" : "claro"}`, () => {
      test.use({ hasTouch: mobile });
      test("ouro orienta sem alterar ações ou estados", async ({
        page,
        baseURL,
      }) => {
        test.setTimeout(150000);
        const variant = `${mobile ? "mobile" : "desktop"}-${dark ? "dark" : "light"}`;
        await mkdir(out, { recursive: true });
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
        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const headers = { Origin: baseURL! };
        const post = async (path: string, data: unknown) => {
          const r = await page.request.post(`/api${path}`, { headers, data });
          expect(r.ok()).toBeTruthy();
          return r.json();
        };
        await post("/auth/register", {
          name: "Ana Identidade",
          email: `gold-${suffix}@example.test`,
          password: `Desmos-Gold-${suffix}!`,
          companyName: "Desmos · ensaio fictício",
        });
        const me = await (await page.request.get("/api/me")).json();
        const pipeline = (
          await post("/sales/pipelines", {
            name: "Comercial B2B",
            stages: ["Entrada", "Em conversa", "Proposta"].map((name, i) => ({
              name,
              probability: i * 30,
              color: "#173b68",
              staleDays: 7,
            })),
          })
        ).item;
        for (const [i, title] of [
          "Projeto Aurora",
          "Expansão Horizonte",
          "Consultoria Norte",
        ].entries()) {
          const deal = (
            await post("/sales/deals", {
              title,
              pipelineId: pipeline.id,
              stageId: pipeline.stages[i].id,
              value: `${(i + 1) * 7500}.00`,
              currency: "BRL",
              assignedTo: me.user.id,
            })
          ).item;
          if (i === 1)
            await post("/sales/tasks", {
              title: "Revisar proposta",
              dealId: deal.id,
              assignedTo: me.user.id,
              dueAt: new Date(Date.now() + 3600000).toISOString(),
            });
          if (i === 2)
            await post("/sales/tasks", {
              title: "Retomar contato",
              dealId: deal.id,
              assignedTo: me.user.id,
              dueAt: new Date(Date.now() - 86400000).toISOString(),
            });
        }
        const routes = [
          ["dashboard", "/workspace", "Visão geral"],
          ["board", `/sales/board?pipelineId=${pipeline.id}`, "Negócios"],
          ["agenda", "/sales/agenda", "Agenda"],
          [
            "automations",
            `/sales/automations?pipelineId=${pipeline.id}`,
            "Automações de vendas",
          ],
          ["form", "/sales/deals/new", "Novo negócio"],
          ["pipeline", `/sales/pipelines/${pipeline.id}/edit`, "Editar funil"],
        ];
        const checks: unknown[] = [];
        for (const [name, path, heading] of routes) {
          await page.goto(path);
          await expect(
            page.getByRole("heading", { name: heading, exact: true }).first(),
          ).toBeVisible();
          await expect(page.locator(".skeleton").first()).not.toBeVisible();
          await page.screenshot({
            path: `${out}/${before ? "before" : "after"}-${variant}-${name}.png`,
            fullPage: true,
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          ).toBeLessThanOrEqual(1);
          if (!before) {
            const axe = await new AxeBuilder({ page }).analyze();
            expect(axe.violations).toEqual([]);
            checks.push({ route: path, axeViolations: axe.violations.length });
          }
          if (name === "dashboard") {
            const select = page.getByLabel("Funil", { exact: true });
            await select.focus();
            await select.press("Enter");
            await expect(page.getByRole("listbox")).toBeVisible();
            await expect(
              page.getByRole("option", { selected: true }),
            ).toBeVisible();
            await page.screenshot({
              path: `${out}/${before ? "before" : "after"}-${variant}-select.png`,
            });
            await page.keyboard.press("Escape");
            await expect(select).toBeFocused();
          }
          if (name === "automations") {
            await page
              .getByRole("button", { name: "Criar automação", exact: true })
              .click();
            await expect(
              page.getByRole("heading", {
                name: "Configurar automação",
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              page.locator('.automation-progress [aria-current="step"]'),
            ).toBeVisible();
            await page.screenshot({
              path: `${out}/${before ? "before" : "after"}-${variant}-automation-editor.png`,
              fullPage: true,
            });
            if (!before) {
              expect(
                (await new AxeBuilder({ page }).analyze()).violations,
              ).toEqual([]);
              checks.push({ route: "automation-editor", axeViolations: 0 });
            }
          }
          if (name === "agenda" && !mobile) {
            await page
              .getByRole("button", { name: "Lista", exact: true })
              .click();
            await expect(
              page.getByRole("button", { name: "Lista", exact: true }),
            ).toHaveAttribute("aria-pressed", "true");
          }
        }
        if (mobile)
          await page.getByRole("button", { name: "Abrir navegação" }).click();
        await expect(page.locator(".nav-active").first()).toBeVisible();
        await page.screenshot({
          path: `${out}/${before ? "before" : "after"}-${variant}-navigation.png`,
        });
        if (mobile) await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Assistente", exact: true })
          .click();
        const assistant = page.getByRole("complementary", {
          name: "Assistente Desmos",
        });
        await expect(assistant).toBeVisible();
        await expect(
          assistant.getByRole("heading", { name: "Como posso ajudar?" }),
        ).toBeVisible();
        await page.screenshot({
          path: `${out}/${before ? "before" : "after"}-${variant}-assistant.png`,
        });
        if (!before) {
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          );
          checks.push({ route: "assistant", axeViolations: 0 });
        }
        const tokens = await page.evaluate(() => {
          const s = getComputedStyle(document.documentElement);
          return Object.fromEntries(
            [
              "background",
              "surface",
              "primary",
              "primary-soft",
              "primary-text",
              "focus",
              "brand-gold",
              "brand-gold-soft",
              "brand-gold-text",
              "brand-gold-border",
              "success",
              "success-soft",
              "warning",
              "warning-soft",
              "danger",
              "danger-soft",
            ].map((k) => [k, s.getPropertyValue(`--${k}`).trim()]),
          );
        });
        expect(errors).toEqual([]);
        await writeFile(
          `${out}/${before ? "before" : "after"}-${variant}-checks.json`,
          JSON.stringify({ checks, tokens, pageErrors: errors }, null, 2),
        );
      });
    });
  }
