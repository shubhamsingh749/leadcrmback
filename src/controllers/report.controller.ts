import { randomUUID } from "crypto";
import excelJs from "exceljs";
import { Request, Response } from "express";
import moment from "moment";
import CustomError from "../errors/customError";
import {
  DeleteLeadsQuery,
  DownloadLeadsBody,
  DownloadLeadsQuery,
} from "../routers/report/body";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";
import safeJson from "../utils/safeJson";

export default class ReportController {
  /**
   * This function will check dialer sync logs in given date criteria and find out how many leads were transferred to all the branches. As per finding, it will sum up the totalSent, totalReceived, and totalFailed values and return them in report according to the branches.
   */
  static async generateReport(req: Request, res: Response) {
    const { start, end } = req.query as { [key: string]: any };

    let data: {
      totalSent: number | null;
      totalPassed: number | null;
      totalFailed: number | null;
      branch: string;
      id: string;
    }[] = [];

    const response = await prisma.dialerSyncLog.groupBy({
      by: ["branchId"],
      _sum: {
        totalSent: true,
        totalPassed: true,
        totalFailed: true,
      },
      where: {
        success: true,
        createdAt: {
          gte: moment(start).startOf("day").toDate(),
          lte: moment(end).endOf("day").toDate(),
        },
      },
    });

    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        id: {
          in: response.map((e: any) => e.branchId),
        },
      },
    });

    response.map((e: any) => {
      data.push({
        branch:
          branches.filter((f: any) => f.id === e.branchId)?.shift()?.name ??
          "Unknown",
        totalFailed: e._sum.totalFailed,
        totalPassed: e._sum.totalPassed,
        totalSent: e._sum.totalSent,
        id: e.branchId,
      });
    });

    return res.json(data);
  }

  /**
   * This function will generate report of how many leads of a product were sent to available branches in given date criteria.
   */
  static async generateDashboardReport(req: Request, res: Response) {
    try {
      const { start, end } = req.query as { [key: string]: any };

      // throw new CustomError("An error occurred while trying to generate report! Please try again after some time.")
      const response = await prisma.lead.groupBy({
        by: ["branchId", "product"],
        _count: true,
        where: {
          branchId: {
            not: null,
          },
          dialerStatus: "accepted",

          syncedWithBranchAt: {
            gte: moment(start).startOf("day").toDate(),
            lte: moment(end).endOf("day").toDate(),
          },
        },
      });

      if (!response || response.length === 0) {
        throw new CustomError(
          "Insufficient data to generate report! Try again after some time or try changing your report criteria.",
          422
        );
      }

      const branches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
        },
        where: {
          id: {
            in: [...new Set(response.map((e: any) => e.branchId!))],
          },
        },
      });

      if (!branches || branches.length === 0) {
        throw new CustomError(
          "Something's wrong! Unable to find branches based on sync data.",
          500
        );
      }

      // console.log(response)
      const products = [...new Set(response.map((e: any) => e.product))];

      if (!products || products.length === 0) {
        throw new CustomError(
          "Something's wrong! Unable to find products based on sync data.",
          500
        );
      }

      const calc = products.map((e) => {
        const tmp: { [key: string]: any } = {};
        tmp["product"] = e;
        tmp["id"] = randomUUID();
        branches.forEach((branch: any) => {
          const counts = response.filter(
            (f: any) => f.product === e && f.branchId === branch.id
          );
          if (counts.length > 0) {
            tmp[branch.id] = counts.shift()?._count ?? 0;
          } else {
            tmp[branch.id] = 0;
          }
        });
        return tmp;
      });

      const total: { [key: string]: any } = {
        id: "total",
        product: "Total",
      };

      total[branches[branches.length - 1].id] = 0;

      const subTotal: { [key: string]: any } = {
        id: "subtotal",
        product: "Subtotal",
      };
      branches.forEach((e: any) => {
        subTotal[e.id] = calc.reduce((sum, ca) => sum + ca[e.id], 0);
        total[branches[branches.length - 1].id] += subTotal[e.id];
      });

      res.json({
        branches,
        rows: [...calc, subTotal, total],
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * **Protected with Two-Factor Authentication**
   *
   * This route requires two-factor authentication code to complete it's operation.
   *
   * This function will download an excel file of leads which have been synced with dialers based on given date criteria.
   */
  static async downloadLeads(req: Request, res: Response) {
    try {
      const { start, end } = DownloadLeadsQuery.parse(req.query);
      const { branchId } = DownloadLeadsBody.parse(req.body);

      const operationIds = await prisma.dialerSyncLog.findMany({
        select: {
          operationId: true,
        },
        where: {
          operationId: {
            not: null,
          },
          createdAt: {
            gte: moment(start).startOf("day").toDate(),
            lte: moment(end).endOf("day").toDate(),
          },
          branchId,
          success: true,
        },
      });

      if (!operationIds || operationIds.length === 0) {
        throw new CustomError("Looks like there's no leads in given criteria");
      }

      const leads: any[] = await prisma.lead.findMany({
        select: {
          formId: true,
          fullname: true,
          mobileOne: true,
          address: true,
          language: true,
          product: true,
          inquiryTimestamp: true,
          website: {
            select: {
              name: true,
            },
          },
          branch: {
            select: {
              name: true,
            },
          },
          syncedWithBranchAt: true,
        },
        where: {
          operationId: {
            in: operationIds.map((e: any) => e.operationId!),
          },
        },
      });

      if (!leads || leads.length === 0) {
        throw new CustomError("Looks like there's no leads in given criteria!");
      }

      leads.map((e) => {
        e.website = e.website.name;
        e.branch = e.branch.name;
        e.mobileOne = Number(e.mobileOne);
        e.inquiryTimestamp = moment(e.inquiryTimestamp).format(
          "YYYY-MM-DD hh:mm:ss"
        );
        e.syncedWithBranchAt = moment(e.syncedWithBranchAt).format(
          "YYYY-MM-DD hh:mm:ss"
        );
        return e;
      });

      const workbook = new excelJs.Workbook();
      workbook.creator = "Lead Cron Manager";
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet("Synced Data");
      worksheet.columns = [
        ...Object.keys(leads[0]).map((e) => ({ header: e, key: e, width: 10 })),
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          pattern: "solid",
          type: "pattern",
          fgColor: { argb: "6e9dc6cc" },
        };
      });

      worksheet.addRows(safeJson(leads));

      const fileName = randomUUID();
      await workbook.xlsx.writeFile(
        `${__dirname}${process.env.REPORT_EXPORT_PATH}${fileName}.xlsx`
      );
      return res.json({
        path: `${process.env.SERVER_URL}exports/${fileName}.xlsx`,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * **Protected with Two-Factor Authentication**
   *
   * This route requires two-factor authentication code to complete it's operation.
   *
   * This function will delete all the dialer sync logs as well as all the leads which has same operation Id as dialerSyncLog entry.
   */
  static async deleteLeads(req: Request, res: Response) {
    try {
      const { start, end, branchId } = DeleteLeadsQuery.parse(req.query);

      const operationIds = await prisma.dialerSyncLog.findMany({
        select: {
          operationId: true,
        },
        where: {
          operationId: {
            not: null,
          },
          branchId: branchId,
          success: true,
          createdAt: {
            gte: moment(start).startOf("day").toDate(),
            lte: moment(end).endOf("day").toDate(),
          },
        },
      });

      await prisma.lead.deleteMany({
        where: {
          operationId: {
            in: operationIds.map((e: any) => e.operationId!),
          },
        },
      });

      await prisma.dialerSyncLog.deleteMany({
        where: {
          operationId: {
            in: operationIds.map((e: any) => e.operationId!),
          },
        },
      });

      return res.json({
        message: `Leads and Sync log between given criteria has been deleted successfully.`,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }
}
