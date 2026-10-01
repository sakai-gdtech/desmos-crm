import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });

async function companyAccount(page: Page, origin: string, suffix: string) {
  const response = await page.request.post("/api/auth/register", {
    headers: { Origin: origin },
    data: {
      name: "Gestora CRM",
      email: `crm-${suffix}@example.test`,
      password: `Desmos-Test-${suffix}!`,
      companyName: `Empresa CRM ${suffix}`,
    },
  });
  expect(response.status()).toBe(201);
  return (await page.request.get("/api/me")).json();
}

test("lead, nota, conversão em contato e empresa, exclusão e restauração", async ({
  page,
  baseURL,
}) => {
  const suffix = `${Date.now()}-flow`;
  await companyAccount(page, baseURL!, suffix);
  await page.goto("/crm/leads");
  await page.getByRole("link", { name: "Novo lead" }).first().click();
  await page.getByLabel("Nome", { exact: true }).fill("Carolina Andrade");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`carolina-${suffix}@example.test`);
  await page.getByLabel("Telefone", { exact: true }).fill("(67) 99999-3210");
  await page
    .getByLabel("Nome da empresa (ainda sem cadastro)")
    .fill("Andrade Projetos");
  await page.getByLabel("Temperatura", { exact: true }).selectOption("HOT");
  await page.getByLabel("Status", { exact: true }).selectOption("QUALIFIED");
  await page.getByLabel("Valor estimado", { exact: true }).fill("12500.50");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(
    page.getByRole("heading", { name: "Carolina Andrade", exact: true }),
  ).toBeVisible();
  const leadId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await expect(page).toHaveURL(`/crm/leads/${leadId}/edit`);
  await page.getByLabel("Cargo", { exact: true }).fill("Diretora comercial");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page).toHaveURL(`/crm/leads/${leadId}`);
  await expect(
    page
      .locator(".crm-summary-identity")
      .getByText("Diretora comercial", { exact: true }),
  ).toBeVisible();
  const edited = await (
    await page.request.get(`/api/crm/leads/${leadId}`)
  ).json();
  expect(edited.item).toMatchObject({
    jobTitle: "Diretora comercial",
    status: "QUALIFIED",
    temperature: "HOT",
    estimatedValue: "12500.50",
  });
  await page.getByRole("button", { name: "Notas", exact: true }).click();
  await page.getByRole("button", { name: "Nova nota", exact: true }).click();
  await page
    .getByLabel("Nova nota", { exact: true })
    .fill("Cliente pediu uma apresentação para a equipe.");
  await page.getByRole("checkbox", { name: "Fixar nota" }).check();
  await page
    .getByRole("button", { name: "Adicionar nota", exact: true })
    .click();
  await expect(
    page.getByText("Cliente pediu uma apresentação para a equipe.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar nota", exact: true }).click();
  await page
    .getByLabel("Editar nota", { exact: true })
    .fill("Apresentação confirmada com a diretoria.");
  await page.getByRole("button", { name: "Salvar nota", exact: true }).click();
  await expect(
    page.getByText("Apresentação confirmada com a diretoria.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  const timeline = await (
    await page.request.get(`/api/crm/leads/${leadId}/timeline`)
  ).json();
  expect(timeline.items.map((e: { type: string }) => e.type)).toEqual(
    expect.arrayContaining([
      "created",
      "updated",
      "note.created",
      "note.updated",
    ]),
  );
  await page
    .getByRole("button", { name: "Converter lead", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Converter lead em contato",
  });
  await dialog
    .getByLabel("Empresa cliente", { exact: true })
    .selectOption("new");
  await dialog.getByRole("button", { name: "Confirmar conversão" }).click();
  await expect(
    page.getByText("Lead convertido", { exact: true }),
  ).toBeVisible();
  const converted = await (
    await page.request.get(`/api/crm/leads/${leadId}`)
  ).json();
  expect(converted.item.status).toBe("CONVERTED");
  expect(converted.item.convertedContactId).toBeTruthy();
  expect(converted.item.convertedCompanyId).toBeTruthy();
  await page.getByRole("link", { name: "Abrir contato", exact: true }).click();
  await expect(page).toHaveURL(
    `/crm/contacts/${converted.item.convertedContactId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Carolina Andrade", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Carolina Andrade", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page
    .getByRole("button", { name: "Mover para a lixeira", exact: true })
    .click();
  await expect(page).toHaveURL(/\/crm\/contacts$/);
  expect(
    (await (await page.request.get("/api/crm/contacts")).json()).total,
  ).toBe(0);
  await page.goto("/crm/trash");
  await page
    .getByLabel("Tipo de registro", { exact: true })
    .selectOption("contacts");
  const row = page.getByRole("row").filter({ hasText: "Carolina Andrade" });
  await row.getByRole("button", { name: /Restaurar/ }).click();
  await expect(row).toHaveCount(0);
  await page.goto(`/crm/contacts/${converted.item.convertedContactId}`);
  await expect(
    page.getByRole("heading", { name: "Carolina Andrade", exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/crm/contacts")).json()).total,
  ).toBe(1);
});

test("empresa cliente reúne contatos, tags, busca e alerta de duplicidade", async ({
  page,
  baseURL,
}) => {
  const suffix = `${Date.now()}-relations`;
  await companyAccount(page, baseURL!, suffix);
  await page.goto("/crm/tags");
  await page.getByRole("button", { name: "Nova tag", exact: true }).click();
  await page.getByLabel("Nome da tag", { exact: true }).fill("Prioridade");
  await page.getByRole("radio", { name: "Índigo", exact: true }).check();
  await page.getByRole("button", { name: "Criar tag", exact: true }).click();
  await expect(
    page
      .locator(".crm-tags-management")
      .getByText("Prioridade", { exact: true }),
  ).toBeVisible();
  await page.goto("/crm/companies/new");
  await page
    .getByLabel("Nome da empresa cliente", { exact: true })
    .fill("Sol Nascente Consultoria");
  await page
    .getByLabel("Razão social", { exact: true })
    .fill("Sol Nascente Consultoria Ltda.");
  await page
    .getByLabel("Site", { exact: true })
    .fill("https://sol-nascente.example");
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Sol Nascente Consultoria",
      exact: true,
    }),
  ).toBeVisible();
  const companyId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.goto("/crm/contacts/new");
  await page.getByLabel("Nome", { exact: true }).fill("Ricardo");
  await page.getByLabel("Sobrenome", { exact: true }).fill("Matos");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`ricardo-${suffix}@example.test`);
  await page
    .getByLabel("Empresa cliente vinculada", { exact: true })
    .selectOption(companyId);
  await page.getByRole("checkbox", { name: "Prioridade", exact: true }).check();
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(
    page.getByRole("heading", { name: "Ricardo Matos", exact: true }),
  ).toBeVisible();
  await page.goto(`/crm/companies/${companyId}`);
  await page.getByRole("button", { name: "Contatos", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Ricardo Matos", exact: true }),
  ).toBeVisible();
  await page.goto("/crm/contacts");
  await page.getByLabel("Buscar contatos", { exact: true }).fill("Ricardo");
  await expect(
    page.getByRole("link", { name: "Ricardo Matos", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Filtros/ }).click();
  await page
    .getByLabel("Tag", { exact: true })
    .selectOption({ label: "Prioridade" });
  await expect(page.getByText("1–1 de 1", { exact: true })).toBeVisible();
  await page.goto("/crm/contacts/new");
  await page.getByLabel("Nome", { exact: true }).fill("Ricardo duplicado");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`ricardo-${suffix}@example.test`);
  await page.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(
    page.getByText("Existem cadastros com informações semelhantes.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Ricardo duplicado", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
