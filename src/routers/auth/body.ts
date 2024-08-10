import { z } from "zod";

export const LoginBody = z.object({
  username: z
    .string({
      required_error: "Username is required",
    })
    .min(1, {
      message: "Username is required",
    }),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(1, {
      message: "Password is required",
    }),
});

export const RegisterBody = LoginBody.merge(
  z.object({
    name: z
      .string({
        required_error: "Name is required",
      })
      .min(1, {
        message: "Name is required",
      }),
  })
);
