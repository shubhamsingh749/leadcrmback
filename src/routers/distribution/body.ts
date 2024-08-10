import { z } from "zod";

export const CreateDistributionBody = z.object({
  productId: z
    .string({
      required_error: "Product Id is required!",
    })
    .min(1, {
      message: "Product Id is required!",
    }),
  branchId: z
    .string({
      required_error: "Branch Id is required!",
    })
    .min(1, {
      message: "Branch Id is required!",
    }),
  distribution: z
    .number({
      required_error: "Distribution must be a positive number!",
    })
    .refine((args) => args >= 0, {
      message: "Distribution must be a positive number!",
    }),
});
