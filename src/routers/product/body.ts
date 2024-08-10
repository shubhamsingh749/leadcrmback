import { z } from "zod";

export const CreateProductBody = z.object({
  name: z
    .string({
      required_error: "Product name is required!",
    })
    .min(1, {
      message: "Product name is required!",
    }),
  description: z
    .string({
      required_error: "Description is required!",
    })
    .min(1, {
      message: "Description is required!",
    }),
});

export const UpdateProductBody = CreateProductBody.partial();
