import { z } from "zod";
import { roles } from "../domain/permissions.js";
export const email = z.email().max(254).trim().toLowerCase();
export const password = z
  .string()
  .min(12, "A senha deve ter ao menos 12 caracteres.")
  .max(128);
export const name = z.string().trim().min(2).max(120);
export const token = z
  .string()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);
export const role = z.enum(roles);
export const idParams = z.object({ id: z.uuid() }).strict();
export const registerSchema = z
  .object({
    name,
    email,
    password,
    companyName: z.string().trim().min(2).max(160),
  })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const resetSchema = z.object({ token, password }).strict();
export const tokenSchema = z.object({ token }).strict();
export const emailSchema = z.object({ email }).strict();
export const profileSchema = z
  .object({ name, phone: z.string().trim().max(40).nullable().optional() })
  .strict();
export const switchSchema = z.object({ tenantId: z.uuid() }).strict();
export const memberSchema = z
  .object({
    role: role.optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Informe uma alteração.");
export const inviteSchema = z.object({ email, role }).strict();
export const acceptSchema = z
  .object({
    token,
    name: name.optional(),
    password: z.string().min(1).max(128).optional(),
  })
  .strict();
