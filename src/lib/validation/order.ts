import { z } from "zod";

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant: z.string().trim().min(1).max(60).nullable().optional().transform((value) => value ?? null),
  quantity: z.number().int().min(1).max(20),
});

export const customerSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name.").max(140),
  customer_email: z
    .string()
    .trim()
    .max(254)
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  customer_phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach you on.")
    .max(24)
    .regex(/^[+0-9()\s-]+$/, "Please use digits, spaces, +, - or brackets only."),
  delivery_address: z.string().trim().min(5, "Please enter a delivery address.").max(600),
  customer_notes: z.string().trim().max(1000).optional().or(z.literal("").transform(() => undefined)),
});

export const orderRequestSchema = z
  .object({
    channel: z.enum(["whatsapp", "email"]),
    idempotency_key: z.string().trim().min(8).max(120),
    items: z.array(orderItemSchema).min(1, "Your cart is empty.").max(30),
  })
  .and(customerSchema)
  .superRefine((value, ctx) => {
    if (value.channel === "email" && !value.customer_email) {
      ctx.addIssue({
        code: "custom",
        path: ["customer_email"],
        message: "An email address is required for email ordering.",
      });
    }
  });

export type OrderRequest = z.infer<typeof orderRequestSchema>;
