import { test, expect, type Page } from "@playwright/test";

async function account(page: Page, origin: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Vendedora de teste",
      email: `nav-${suffix}@example.test`,
      password: `Desmos-Test-${suffix}!`,
      companyName: "Empresa de navegação",
    },
  });
  expect(response.status()).toBe(201);
}

test("tema claro padrão, navegação por tarefa e preferência explícita persistida", async ({
  page,
  baseURL,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await account(page, baseURL!);
  await page.goto("/sales/board");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const nav = page.getByRole("navigation", { name: "Trabalho comercial" });
  await expect(nav.getByRole("link").first()).toHaveText("Visão geral");
  await expect(
    page.getByRole("link", { name: "Empresa", exact: true }),
  ).toBeHidden();
  await nav.getByRole("button", { name: "Clientes", exact: true }).click();
  await nav.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page).toHaveURL(/\/crm\/leads$/);
  await page.reload();
  await expect(
    nav.getByRole("button", { name: "Clientes", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    nav.getByRole("link", { name: "Leads", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.setViewportSize({ width: 1280, height: 650 });
  await expect(page.locator(".profile-link")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Sair da conta" }),
  ).toBeInViewport();
  await page.getByRole("link", { name: "Funis e etapas", exact: true }).click();
  await expect(page).toHaveURL(/\/sales\/pipelines$/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Configurações", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const [route, label] of [
    ["/sales/activities", "Atividades"],
    ["/sales/deals", "Oportunidades"],
  ]) {
    await page.goto(route!);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Configurações", exact: true }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("link", { name: label!, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("menu móvel fecha com Escape, devolve foco e fecha ao navegar", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await account(page, baseURL!);
  await page.goto("/sales/board");
  const trigger = page.getByRole("button", { name: "Abrir navegação" });
  await trigger.click();
  await expect(
    page.getByRole("link", { name: "Desmos CRM — início" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page
    .getByRole("navigation", { name: "Trabalho comercial" })
    .getByRole("link", { name: "Tarefas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sales\/tasks$/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
