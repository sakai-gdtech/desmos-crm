import { expect, type Page } from "@playwright/test";
export async function editorStep(page: Page, step: number) {
  const nav = page.getByRole("navigation", { name: "Etapas da configuração" });
  await nav
    .getByRole("button")
    .nth(step - 1)
    .click();
  await expect(nav.getByRole("button").nth(step - 1)).toHaveAttribute(
    "aria-current",
    "step",
  );
}
export async function library(page: Page) {
  await expect(
    page
      .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
      .or(
        page.getByRole("button", { name: "Voltar às automações", exact: true }),
      )
      .first(),
  ).toBeVisible();
  if (
    !(await page
      .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Voltar às automações", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Biblioteca de mensagens", exact: true })
    .click();
}
export async function stageRules(page: Page) {
  if (!(await page.getByText("Ajustes do funil", { exact: true }).isVisible()))
    await page
      .getByRole("button", { name: "Voltar às automações", exact: true })
      .click();
  await page.getByText("Ajustes do funil", { exact: true }).click();
  await page
    .getByRole("button", { name: "Regras por etapa", exact: true })
    .click();
}
