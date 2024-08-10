import { Request, Response } from "express";
import QRCode from "qrcode";
import SpeakEasy from "speakeasy";
import CustomError from "../errors/customError";
import {
  SYNCTHRESHOLD,
  TWOFASECRET,
  TWOFASECRETTEMP,
} from "../utils/constants";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";

export default class SettingsController {
  /**
   * This function will generate a two-factor auth hash and store it in temp two-factor auth setting in database. After that, it will generate a QR Code from generated hash and will return it to the user to scan.
   */
  static async generateTwoFactorAuthQR(_: Request, res: Response) {
    try {
      const secret = SpeakEasy.generateSecret({
        name: "Lead CRON Manager",
        issuer: "Lead CRON Manager",
      });
      await prisma.settings.upsert({
        create: {
          settingKey: TWOFASECRETTEMP,
          settingValue: secret.base32,
        },
        update: {
          settingValue: secret.base32,
        },
        where: {
          settingKey: TWOFASECRETTEMP,
        },
      });
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
      return res.json({
        qr: qrCode,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will replace two-factor auth hash with temp two-factor auth and will remove temp two-factor auth from database. This function is used to set/change two-factor authentication device.
   */
  static async saveTwoFactorAuthQR(req: Request, res: Response) {
    try {
      const { code } = req.body;
      const tempSecret = await prisma.settings.findFirst({
        where: {
          settingKey: TWOFASECRETTEMP,
        },
      });

      if (!tempSecret) {
        throw new CustomError("There's no qr to save!");
      }

      if (
        !SpeakEasy.totp.verify({
          secret: tempSecret.settingValue,
          token: code,
          encoding: "base32",
        })
      ) {
        throw new CustomError("Invalid code! Try again.");
      }

      await prisma.settings.upsert({
        create: {
          settingKey: TWOFASECRET,
          settingValue: tempSecret.settingValue,
        },
        update: {
          settingValue: tempSecret.settingValue,
        },
        where: {
          settingKey: TWOFASECRET,
        },
      });
      await prisma.settings.delete({
        where: {
          settingKey: TWOFASECRETTEMP,
        },
      });

      return res.json({
        message: "Ok",
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will try to get all the settings if no id is given or will return single setting based on given id.
   */
  static async getSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const response = await prisma.settings.findMany({
        where: id
          ? {
              settingKey: id,
            }
          : {},
        select: {
          settingKey: true,
          settingValue: true,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * Insert or update a setting.
   * This function will update setting value if it exists or create setting with given id and set it's value.
   */
  static async upsertSetting(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { value } = req.body;
      if (id === SYNCTHRESHOLD) {
        const dialerCount = await prisma.branch.count();
        if (parseInt(value) <= dialerCount * dialerCount) {
          throw new CustomError(
            "Threshold must be double of total of available branches or more. For example, if you have 3 branches then threshold must be 9 or greater.",
            400
          );
        }
      }
      const response = await prisma.settings.upsert({
        create: {
          settingKey: id,
          settingValue: value,
        },
        update: {
          settingValue: value,
        },
        where: {
          settingKey: id,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }
}
