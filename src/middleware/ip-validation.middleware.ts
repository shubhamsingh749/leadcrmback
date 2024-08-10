import { NextFunction, Request, Response } from "express";
import CustomError from "../errors/customError";
import { ALLOWEDIPSETTING } from "../utils/constants";
import errorHandler from "../utils/errorHandler";
import getClientIP from "../utils/ip";
import prisma from "../utils/prisma";

const IpValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (process.env.NODE_ENV === "production") {
      const clientIp = getClientIP(req);

      console.log("clientIp", clientIp);
      if (!clientIp)
        throw new CustomError(
          "Failed to collect information required to check your authority.",
          500
        );

      const allowedIps = await prisma.settings.findFirst({
        where: {
          settingKey: ALLOWEDIPSETTING,
          settingValue: {
            not: "",
          },
        },
      });

      if (allowedIps) {
        const ipMap = JSON.parse(allowedIps.settingValue);
        if (!ipMap[clientIp as string])
          throw new CustomError(
            "You're not within allowed network range.",
            403
          );
      }
    }

    next();
  } catch (error) {
    console.log("error Start", error);
    errorHandler(error, res);
    console.log("error Complete", error);
  }
};

export default IpValidationMiddleware;
