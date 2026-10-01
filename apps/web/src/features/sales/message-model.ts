import { z } from "zod";
export const templateSchema = z
  .object({
    id: z.string(),
    revision: z.number().int().positive(),
    name: z.string().trim().min(1).max(100),
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    subject: z.string().max(200),
    message: z.string().trim().min(1).max(4000),
  })
  .refine(
    (t) => t.channel !== "EMAIL" || !!t.subject.trim(),
    "Informe o assunto do email.",
  );
export type MessageTemplate = z.infer<typeof templateSchema>;
export const recipientSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CONTACT") }),
  z.object({
    kind: z.literal("USER"),
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.email(),
  }),
]);
export const variables = ["contato", "empresa", "negociacao", "responsavel"];
export function renderMessage(
  text: string,
  data: Record<string, string | null | undefined>,
) {
  const missing: string[] = [];
  const value = text.replace(/\{([^{}]+)\}/g, (raw, key) => {
    if (data[key]) return data[key]!;
    missing.push(key);
    return raw;
  });
  return { value, missing: [...new Set(missing)] };
}
export function attachTemplate<T>(rule: T, template: MessageTemplate) {
  return {
    ...rule,
    channel: template.channel,
    action: template.channel,
    subject: template.subject,
    message: template.message,
    messageTemplate: {
      id: template.id,
      revision: template.revision,
      snapshot: { ...template },
    },
  };
}
