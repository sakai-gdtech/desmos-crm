/** Exercise the visible Desmos combobox, including its real change event.
 * @param {import('@playwright/test').Locator} control
 * @param {string | {label?: string, index?: number, value?: string}} choice
 */
export async function selectOption(control, choice) {
  await control.click();
  const popupId = await control.getAttribute("aria-controls");
  if (!popupId) throw new Error("Select did not open its options.");
  const menu = control.page().locator(`[id=${JSON.stringify(popupId)}]`);
  const options = menu.getByRole("option");
  const target =
    typeof choice === "string"
      ? menu.locator(`[data-value=${JSON.stringify(choice)}]`)
      : choice.label !== undefined
        ? menu.getByRole("option", { name: choice.label, exact: true })
        : choice.index !== undefined
          ? options.nth(choice.index)
          : menu.locator(`[data-value=${JSON.stringify(choice.value)}]`);
  if ((await target.getAttribute("aria-disabled")) === "true")
    throw new Error("Cannot select a disabled option.");
  await target.click();
}
