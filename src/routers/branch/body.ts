import { z } from "zod";

const CreateBranchBody = z.object({
  name: z
    .string({
      required_error: "Branch name is required",
    })
    .min(1, {
      message: "Branch name is required",
    }),
  enabled: z.boolean().default(true),
  distribution: z
    .number({
      invalid_type_error: "Distribution must be a numeric value",
    })
    .default(0),
  ip: z
    .string({
      required_error: "Dialer IP is required",
    })
    .regex(/^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/, {
      message: "A valid ip address is required",
    }),
  username: z
    .string({
      required_error: "Dialer username is required",
    })
    .min(1, {
      message: "Dialer username is required",
    }),
  token: z
    .string({
      required_error: "Dialer auth token is required",
    })
    .min(1, {
      message: "Dialer auth token is required",
    }),
  https: z.boolean().default(true),
  campaignName: z
    .string({
      required_error: "Campaign name is required",
    })
    .min(1, {
      message: "Campaign name is required",
    }),
  queueName: z
    .string({
      required_error: "Queue name is required",
    })
    .min(1, {
      message: "Queue name is required",
    }),
  listName: z
    .string({
      required_error: "List name is required",
    })
    .min(1, {
      message: "List name is required",
    }),
});

const UpdateBranchBody = CreateBranchBody.partial();

export { CreateBranchBody, UpdateBranchBody };
