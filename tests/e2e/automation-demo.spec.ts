import { test, expect } from "@playwright/test";

test("demonstração de automações e requisitos preserva configurações por pipeline", async ({
  page,
  baseURL,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const headers = { Origin: baseURL! };
  const r = await page.request.post("/api/auth/register", {
    headers,
    data: {
      name: "Gestora de automações",
      email: `automation-${suffix}@example.test`,
      password: `Desmos-Test-${suffix}!`,
      companyName: "Empresa demonstração",
    },
  });
  expect(r.status()).toBe(201);
  const create = async (name: string) => {
    const response = await page.request.post("/api/sales/pipelines", {
      headers,
      data: {
        name,
        stages: [
          { name: "Entrada", probability: 10, color: "#173B68" },
          { name: "Proposta", probability: 70, color: "#AA8446" },
        ],
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).item;
  };
  const first = await create("Vendas consultivas");
  const second = await create("Renovações");
  await page.goto(`/sales/automations?pipelineId=${first.id}`);
  await expect(
    page.getByText(/Os envios de email e WhatsApp são/),
  ).toBeVisible();
  await page
    .getByLabel("Nome da automação")
    .fill("Enviar proposta personalizada");
  await page
    .getByRole("group", { name: "Canal da mensagem" })
    .getByRole("button", { name: "WhatsApp", exact: true })
    .click();
  await page
    .getByLabel("Mensagem", { exact: true })
    .fill("Olá, {contato}! Segue a proposta da {empresa}.");
  await expect(
    page
      .getByRole("complementary", { name: "Prévia da automação" })
      .getByText("Olá, Marina! Segue a proposta da Aurora Digital."),
  ).toBeVisible();
  let outboundCalls = 0;
  page.on("request", (request) => {
    if (["POST", "PATCH", "PUT"].includes(request.method())) outboundCalls++;
  });
  await page
    .getByRole("button", { name: "Salvar automação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simular envio", exact: true })
    .click();
  await expect(
    page.getByText(/Nenhuma mensagem real foi enviada/).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome da automação")).toHaveValue(
    "Enviar proposta personalizada",
  );
  await page.getByRole("tab", { name: "Regras por etapa" }).click();
  await page.getByLabel("Contato vinculado", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar regras da demonstração" })
    .click();
  await page.getByLabel("Pipeline", { exact: true }).selectOption(second.id);
  await expect(page.getByLabel("Nome da automação")).toHaveValue(
    "Enviar proposta por email",
  );
  await page.getByRole("tab", { name: "Regras por etapa" }).click();
  await expect(
    page.getByLabel("Contato vinculado", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Pipeline", { exact: true }).selectOption(first.id);
  await page.getByRole("tab", { name: "Regras por etapa" }).click();
  await expect(
    page.getByLabel("Contato vinculado", { exact: true }),
  ).toBeChecked();
  expect(outboundCalls).toBe(0);
});
