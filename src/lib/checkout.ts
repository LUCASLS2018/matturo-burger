import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().trim().min(3, "Indique o nome completo.").max(100, "O nome deve ter no máximo 100 caracteres."),
  email: z.string().trim().email("Indique um email válido.").max(255, "O email deve ter no máximo 255 caracteres."),
  phone: z
    .string()
    .trim()
    .max(20, "O telefone deve ter no máximo 20 caracteres.")
    .regex(/^[+0-9()\s.-]+$/, "O telefone contém caracteres inválidos.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 15;
    }, "Indique um telefone válido."),
  address: z.string().trim().min(5, "Indique a morada de entrega.").max(160, "A morada deve ter no máximo 160 caracteres."),
  address2: z.string().trim().max(160, "O complemento deve ter no máximo 160 caracteres.").optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/, "Indique um código postal válido."),
  city: z.string().trim().min(2, "Indique a localidade.").max(100, "A localidade deve ter no máximo 100 caracteres."),
  country: z.string().trim().min(2, "Indique o país.").max(56, "O país deve ter no máximo 56 caracteres."),
  notes: z.string().trim().max(500, "As notas devem ter no máximo 500 caracteres.").optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutFormValues = {
  name: "",
  email: "",
  phone: "",
  address: "",
  address2: "",
  postalCode: "",
  city: "",
  country: "Portugal",
  notes: "",
};
