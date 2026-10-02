import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { selectOption } from "../../scripts/select-option.mjs";

for (const mobile of [false, true]) {
  test.describe(mobile ? "touch" : "mouse", () => {
    test.use({ hasTouch: mobile });
    test(`select Desmos: ${mobile ? "mobile escuro" : "desktop claro"}, teclado, form e diálogo`, async ({
      page,
      baseURL,
    }) => {
      test.setTimeout(60000);
      const out =
        process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/custom-selects";
      await mkdir(out, { recursive: true });
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      if (mobile)
        await page.addInitScript(() =>
          localStorage.setItem("orbit-theme", "dark"),
        );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      expect(
        (
          await page.request.post("/api/auth/register", {
            headers: { Origin: baseURL! },
            data: {
              name: "Pessoa Select",
              email: `select-${suffix}@example.test`,
              password: `Desmos-Test-${suffix}!`,
              companyName: `Select · fictício ${suffix}`,
            },
          })
        ).status(),
      ).toBe(201);

      await page.goto("/onboarding");
      const segment = page.getByRole("combobox", {
        name: "Em qual segmento vocês atuam?",
      });
      await expect(segment).toHaveAttribute("data-value", "");
      await page.getByRole("button", { name: "Concluir configuração" }).click();
      await expect(segment).toBeFocused();
      await expect(segment).toHaveAttribute("aria-invalid", "true");
      await segment.focus();
      await segment.press("ArrowDown");
      await expect(segment).toHaveAttribute("aria-expanded", "true");
      await segment.press("End");
      await segment.press("Escape");
      await expect(segment).toHaveAttribute("data-value", "");
      await expect(segment).toBeFocused();
      await segment.press("s");
      await segment.press("a");
      await segment.press("u");
      await segment.press("Enter");
      await expect(segment).toHaveAttribute("data-value", "Saúde");
      await segment.press("Home");
      await segment.press("ArrowDown");
      await segment.press("Tab");
      await expect(segment).toHaveAttribute("data-value", "Tecnologia");
      await expect(segment).not.toBeFocused();
      await selectOption(
        page.getByLabel("Como funciona a venda de vocês?"),
        "Consultiva",
      );
      await page.getByLabel("Pessoas na empresa").fill("12");
      await page.getByLabel("Pessoas no time de vendas").fill("4");
      await page
        .getByLabel("Qual é o principal objetivo com o CRM?")
        .fill("Organizar a próxima ação comercial.");
      await page.getByRole("button", { name: "Concluir configuração" }).click();
      await expect(page).toHaveURL(/\/workspace$/);
      const company = await (await page.request.get("/api/me")).json();
      expect(company.tenant.segment).toBe("Tecnologia");
      expect(company.tenant.salesMotion).toBe("Consultiva");

      await page.goto("/settings/company");
      const currency = page.getByLabel("Moeda", { exact: true });
      await expect(currency).toHaveAttribute("data-value", "BRL");
      await selectOption(currency, "USD");
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await expect(
        page.getByText("As informações da empresa foram salvas."),
      ).toBeVisible();
      await page.reload();
      await expect(currency).toHaveAttribute("data-value", "USD");
      if (mobile) await currency.tap();
      else await currency.click();
      const menu = page.getByRole("listbox");
      await expect(menu.getByRole("option", { selected: true })).toHaveText(
        "Dólar americano (USD)",
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      const box = await menu.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
      await page.screenshot({
        path: `${out}/select-${mobile ? "mobile-dark" : "desktop-light"}.png`,
      });
      if (mobile) {
        await menu
          .getByRole("option", { name: "Euro (EUR)", exact: true })
          .tap();
        await expect(currency).toHaveAttribute("data-value", "EUR");
        await expect(menu).toHaveCount(0);
      } else await currency.press("Escape");

      await page.goto("/crm/leads/new");
      const status = page.getByLabel("Status", { exact: true });
      await selectOption(status, "QUALIFIED");
      await page.getByLabel("Nome", { exact: true }).fill("Lead Select");
      await page.getByRole("button", { name: "Salvar cadastro" }).click();
      await expect(
        page.getByRole("heading", { name: "Lead Select", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Converter lead" }).click();
      const dialog = page.getByRole("dialog");
      const contact = dialog.getByLabel("Destino do contato", { exact: true });
      await contact.click();
      await expect(dialog.getByRole("listbox")).toBeVisible();
      await contact.press("ArrowDown");
      await contact.press("Escape");
      await expect(dialog).toBeVisible();
      await expect(contact).toHaveAttribute("data-value", "new");
      await contact.click();
      await expect(dialog.getByRole("listbox")).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: `${out}/select-dialog-${mobile ? "mobile-dark" : "desktop-light"}.png`,
      });
      await contact.press("Escape");
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      expect(errors).toEqual([]);
    });
  });
}
