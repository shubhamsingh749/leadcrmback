import { Request, Response } from "express";
import CustomError from "../errors/customError";
import { CreateLeadBody } from "../routers/lead/body";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";
import moment from "moment-timezone";
import { Prisma } from "@prisma/client";

export default class LeadController {
  /**
   * This function will return list of leads from database.
   */
  static async listLeads(req: Request, res: Response) {
    try {
      const { formid, count } = req.query as Record<string, string>;
      const fileId = moment().startOf("day").unix();
      const leadId = `${fileId}_${moment().format("YYYY_M_D")}`;
      const processedLeads: any[] = [];

      const allFilters: Prisma.ManualLeadFindManyArgs = {
        take: 1000,
      };
      const whereFilters: Prisma.ManualLeadWhereInput = {};

      if (formid && !isNaN(Number(formid))) {
        whereFilters.id = {
          gt: Number(formid),
        };
      }

      if (count && Boolean(count) === true) {
        delete allFilters.take;
      }

      if (Object.keys(whereFilters).length !== 0) {
        allFilters.where = whereFilters;
      }

      const leads = await prisma.manualLead.findMany(allFilters);

      if (leads.length !== 0) {
        for (const lead of leads) {
          processedLeads.push({
            file_id: fileId,
            lead_id: leadId,
            full_name: lead.fullname,
            mobile_one: parseInt(lead.mobileOne.toString()),
            address: lead.address,
            language: lead.language,
            product: lead.product,
            inquiry_date: moment(lead.createdAt).format("DD-MMM-YYYY"),
            inquiry_timestamp: moment.utc(lead.createdAt).local(),
            form_id: lead.id,
          });
        }
      }

      return res.json(processedLeads);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will add leads in database.
   */
  static async addLeads(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany();
      const { error, value } = CreateLeadBody({
        body: req.body,
        products,
      });

      if (error) {
        throw new CustomError(error.message, 400);
      }

      const result = await prisma.manualLead.createMany({
        data: value.map((lead) => ({
          fullname: lead.full_name,
          address: lead.address,
          language: lead.language,
          product: lead.product,
          mobileOne: lead.mobile_one,
        })),
      });

      return res.json({
        message: `${result.count} lead(s) added successfully!`,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }
}
