import moment from "moment";
import { z } from "zod";

export const DownloadLeadsBody = z.object({
  branchId: z
    .string({
      required_error: "Branch Id is required!",
    })
    .min(1, {
      message: "Branch Id is required!",
    }),
});

export const DownloadLeadsQuery = z.object({
  start: z
    .string()
    .refine((value) => moment(value).isValid(), {
      message: "Please send valid start date!",
    })
    .optional(),
  end: z
    .string()
    .refine((value) => moment(value).isValid(), {
      message: "Please send valid start date!",
    })
    .optional(),
});

export const DeleteLeadsQuery = z.object({
  start: z
    .string({
      required_error: "Start date is required to perform this operation.",
    })
    .refine((value) => moment(value).isValid(), {
      message: "Please send valid start date!",
    }),
  end: z
    .string({
      required_error: "End date is required to perform this operation.",
    })
    .refine((value) => moment(value).isValid(), {
      message: "Please send valid start date!",
    }),
  branchId: z
    .string({
      required_error: "Branch Id is required to perform this operation.",
    })
    .min(1, {
      message: "Please send a valid branch Id.",
    }),
});
