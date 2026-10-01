/** One company-zone boundary for inputs, day grouping and API windows. No device-zone coercion. */
export function companyInput(value: string | Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function companyDay(value: string | Date, zone: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  return companyInput(value, zone).slice(0, 10);
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function companyInstant(input: string, zone: string) {
  const target = Date.parse(`${input}:00Z`);
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const represented = Date.parse(
      `${companyInput(new Date(instant), zone)}:00Z`,
    );
    const delta = target - represented;
    if (!delta) return new Date(instant).toISOString();
    instant += delta;
  }
  throw new Error(
    "Este horário não existe no fuso da empresa. Escolha outro horário.",
  );
}
export function weekStart(day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return shiftDay(day, -(weekday === 0 ? 6 : weekday - 1));
}
