import { selectOption } from "../../scripts/select-option.mjs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("cadastro, onboarding, configurações persistidas e novo login", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-${suffix}@example.test`;
  const password = `Desmos!Test-${suffix}`;
  await page.goto("/register");
  await page.getByLabel("Seu nome", { exact: true }).fill("Pessoa de Teste");
  await page.getByLabel("Nome da empresa", { exact: true }).fill("Empresa E2E");
  await page.getByLabel("Email de trabalho").fill(email);
  await page.getByLabel("Crie uma senha").fill(password);
  await page.getByRole("button", { name: "Criar conta e empresa" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await selectOption(
    page.getByLabel("Em qual segmento vocês atuam?"),
    "Tecnologia",
  );
  await page.getByLabel("Pessoas na empresa").fill("12");
  await page.getByLabel("Pessoas no time de vendas").fill("4");
  await selectOption(
    page.getByLabel("Como funciona a venda de vocês?"),
    "Consultiva",
  );
  await page
    .getByLabel("Qual é o principal objetivo com o CRM?")
    .fill("Organizar clientes e acompanhar cada negociação.");
  await page.getByRole("button", { name: "Concluir configuração" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("link", { name: "Empresa", exact: true }).click();
  await page
    .getByLabel("Nome da empresa", { exact: true })
    .fill("Empresa E2E Atualizada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByText("As informações da empresa foram salvas."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome da empresa", { exact: true })).toHaveValue(
    "Empresa E2E Atualizada",
  );
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("heading", { name: "Visão geral" }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("convite entregue por email, aceite e permissão de visualizador", async ({
  page,
  browser,
  request,
  baseURL,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const invitee = `viewer-${suffix}@example.test`;
  const owner = `owner-${suffix}@example.test`;
  const password = `Desmos!Test-${suffix}`;
  const registered = await page.request.post("/api/auth/register", {
    headers: { Origin: baseURL! },
    data: {
      name: "Gestor do Teste",
      email: owner,
      password,
      companyName: "Empresa de Convites",
    },
  });
  expect(registered.status()).toBe(201);
  await page.goto("/settings/team");
  await page.getByLabel("Email da pessoa").fill(invitee);
  await selectOption(page.getByLabel("Papel de acesso"), "VIEWER");
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(
    page.getByText(
      "Convite criado. A pessoa receberá as instruções por email.",
    ),
  ).toBeVisible();
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const result = await request.get(
          "http://localhost:8026/api/v1/messages",
        );
        const inbox = await result.json();
        messageId = inbox.messages?.find(
          (message: { ID: string; To: { Address: string }[] }) =>
            message.To.some((to) => to.Address === invitee),
        )?.ID;
        return !!messageId;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  const message = await (
    await request.get(`http://localhost:8026/api/v1/message/${messageId}`)
  ).json();
  const url = message.Text.match(
    /https?:\/\/[^\s]+\/accept-invitation\?token=[A-Za-z0-9_-]+/,
  )?.[0];
  expect(url).toBeTruthy();
  const guestContext = await browser.newContext({ baseURL });
  const guest = await guestContext.newPage();
  await guest.goto(url);
  await guest.locator("#name").fill("Pessoa Convidada");
  await guest.locator("#password").fill(password);
  await guest.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(guest).toHaveURL(/\/workspace$/);
  await expect(
    guest.getByRole("link", { name: "Equipe e acessos", exact: true }),
  ).toHaveCount(0);
  await guest.goto("/settings/company");
  await expect(
    guest.getByText("Seu acesso é limitado a outras áreas"),
  ).toBeVisible();
  const forbidden = await guest.request.patch("/api/tenants/current", {
    headers: { Origin: baseURL! },
    data: { name: "Não autorizado" },
  });
  expect(forbidden.status()).toBe(403);
  const createdLead = await page.request.post("/api/crm/leads", {
    headers: { Origin: baseURL! },
    data: { name: "Lead para consulta" },
  });
  expect(createdLead.status()).toBe(201);
  const { item: readableLead } = await createdLead.json();
  await guest.goto("/crm/leads");
  await expect(
    guest.getByRole("link", { name: "Lead para consulta" }),
  ).toBeVisible();
  await expect(guest.getByRole("link", { name: "Novo lead" })).toHaveCount(0);
  await guest.goto(`/crm/leads/${readableLead.id}`);
  await expect(
    guest.getByRole("heading", { name: "Lead para consulta" }),
  ).toBeVisible();
  await expect(
    guest.getByRole("link", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await expect(
    guest.getByRole("button", { name: "Excluir", exact: true }),
  ).toHaveCount(0);
  await expect(
    guest.getByRole("button", { name: "Converter lead", exact: true }),
  ).toHaveCount(0);
  await guest.getByRole("button", { name: "Notas", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "Nova nota", exact: true }),
  ).toHaveCount(0);
  await guest.goto(`/crm/leads/${readableLead.id}/edit`);
  await expect(
    guest.getByText("Seu acesso é limitado a outras áreas"),
  ).toBeVisible();
  await guestContext.close();
});

test("formulário acessível valida entrada e funciona em tela estreita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByRole("button", { name: "Criar conta e empresa" }).click();
  await expect(page.getByText("Informe seu nome.")).toBeVisible();
  await expect(page.getByText("Informe um email válido.")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.goto("/forgot-password");
  await page.getByLabel("Email da sua conta").fill("nao-existe@example.test");
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(
    page.getByText(/Se esse email estiver cadastrado/),
  ).toBeVisible();
});

test("contas de empresas independentes permanecem isoladas e não podem trocar de empresa", async ({
  page,
  browser,
  context,
  baseURL,
}) => {
  const suffix = Date.now();
  const password = `Desmos-Test-${suffix}!`;
  const registered = await page.request.post("/api/auth/register", {
    headers: { Origin: baseURL! },
    data: {
      name: "Responsável A",
      email: `isolated-a-${suffix}@example.test`,
      password,
      companyName: "Empresa Independente A",
    },
  });
  expect(registered.status()).toBe(201);
  const original = await (await page.request.get("/api/me")).json();
  const otherCompany = await browser.newContext({ baseURL });
  try {
    expect(
      (
        await otherCompany.request.post("/api/auth/register", {
          headers: { Origin: baseURL! },
          data: {
            name: "Responsável B",
            email: `isolated-b-${suffix}@example.test`,
            password,
            companyName: "Empresa Independente B",
          },
        })
      ).status(),
    ).toBe(201);
    const second = await (await otherCompany.request.get("/api/me")).json();
    expect(second.tenant.id).not.toBe(original.tenant.id);
    expect(original.memberships).toHaveLength(1);
    expect(second.memberships).toHaveLength(1);
    await page.goto("/settings/company");
    await expect(page).toHaveTitle("Desmos CRM");
    await expect(page.getByLabel("Trocar empresa ativa")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Nova empresa" }),
    ).toHaveCount(0);
    await expect(page.locator(".tenant-context")).toHaveText(
      "Empresa Independente A",
    );
    expect(
      (
        await page.request.post("/api/tenants", {
          headers: { Origin: baseURL! },
          data: { name: "Segunda empresa não permitida" },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await page.request.post("/api/auth/switch-tenant", {
          headers: { Origin: baseURL! },
          data: { tenantId: second.tenant.id },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.patch("/api/tenants/current", {
          headers: {
            Origin: baseURL!,
            "X-Expected-Tenant-Id": second.tenant.id,
          },
          data: { name: "Alteração cruzada indevida" },
        })
      ).status(),
    ).toBe(409);
    await page
      .getByLabel("Nome da empresa", { exact: true })
      .fill("Empresa A Atualizada");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(
      page.getByText("As informações da empresa foram salvas."),
    ).toBeVisible();
    expect(
      (await (await otherCompany.request.get("/api/me")).json()).tenant.name,
    ).toBe("Empresa Independente B");
    const otherTab = await context.newPage();
    await otherTab.goto("/workspace");
    await page.goto("/settings/sessions");
    await page.getByRole("button", { name: "Sair deste dispositivo" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(otherTab).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/me")).status()).toBe(401);
    expect((await otherCompany.request.get("/api/me")).status()).toBe(200);
  } finally {
    await otherCompany.close();
  }
});

test("perfil fecha navegação móvel e mudanças no próprio acesso exigem confirmação", async ({
  page,
  baseURL,
}) => {
  const suffix = Date.now();
  const registered = await page.request.post("/api/auth/register", {
    headers: { Origin: baseURL! },
    data: {
      name: "Pessoa Responsável",
      email: `owner-safety-${suffix}@example.test`,
      password: `Desmos-Safety-${suffix}!`,
      companyName: "Empresa de Segurança",
    },
  });
  expect(registered.status()).toBe(201);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page.locator(".profile-link").click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(page.locator(".main-shell")).not.toHaveAttribute("inert", "");
  await expect(
    page.getByRole("button", { name: "Abrir navegação" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({
    path: ".impeccable/review/mobile-profile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/settings/team");
  await selectOption(page.getByLabel("Papel de Pessoa Responsável"), "SALES");
  const confirmation = page.getByRole("dialog", {
    name: "Alterar seu próprio acesso?",
  });
  await expect(confirmation).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/self-access-confirmation.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (await (await page.request.get("/api/me")).json()).membership.role,
  ).toBe("OWNER");
  await page.getByRole("button", { name: "Manter meu acesso" }).click();
  await expect(confirmation).not.toBeVisible();
  await expect(page.getByLabel("Papel de Pessoa Responsável")).toHaveAttribute(
    "data-value",
    "OWNER",
  );
  await page.getByRole("button", { name: "Suspender", exact: true }).click();
  await expect(confirmation).toBeVisible();
  await expect(
    page.getByText("Você será desconectado desta empresa.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manter meu acesso" }).click();
  expect(
    (await (await page.request.get("/api/me")).json()).membership.status,
  ).toBe("ACTIVE");
});
