import { z } from "zod";

export const MainPostBody = z.object({
  name: z.string(),
  url: z.string(),
  token: z.string(),
  autoSync: z.boolean().default(false),
});

export const MainPatchBody = MainPostBody.partial();
