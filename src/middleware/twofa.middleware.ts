import { NextFunction, Request, Response } from "express";
import SpeakEasy from "speakeasy";
import CustomError from "../errors/customError";
import { TWOFASECRET } from "../utils/constants";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";

const TwoFactorMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const twoFACode = req.headers["x-two-fa-code"] as string | undefined;
    const bypass = req.headers["x-two-fa-bypass"] as string | undefined;

    console.log("this is by me", twoFACode, bypass);

    if (!twoFACode) {
      throw new CustomError("Invalid two factor authentication code", 400);
    }

    const secret = await prisma.settings.findFirst({
      where: {
        settingKey: TWOFASECRET,
      },
    });
    console.log("confusion", secret);

    console.log("this is by secret", secret, bypass);

    if (!secret && !bypass) {
      console.log("this is by secret", secret, bypass);

      throw new CustomError("Two factor authentication is not enabled!", 400);
    }

    if (
      secret &&
      !SpeakEasy.totp.verify({
        secret: secret.settingValue,
        encoding: "base32",
        token: twoFACode,
      })
    ) {
      throw new CustomError("Invalid two factor authentication code!", 400);
    }

    next();
  } catch (error) {
    errorHandler(error, res);
  }
};

export default TwoFactorMiddleware;
