import { Branch, Lead } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import axios, { AxiosError, AxiosResponse } from "axios";
import { X509Certificate, randomUUID } from "crypto";
import { Request, Response } from "express";
import moment from "moment";
import fetch from "node-fetch";
import CustomError from "../errors/customError";
import { MainPatchBody, MainPostBody } from "../routers/websites/body";
import { SyncWebsiteResponse } from "../routers/websites/types";
import errorHandler from "../utils/errorHandler";
import Logger from "../utils/logger";
import prisma from "../utils/prisma";
import { DailerResponse } from "../utils";
import https from "https";

const logger = new Logger("Website Controller");

/**
 * **Stage 4: Send leads to dialer**
 *
 * This function will do the following things.
 * > 1. Check if ```campaignName```, ```queueName```, and ```listName``` is available for passed branch. If no, function will return and won't move ahead.
 * > 2. Make ```fetch``` call to given branch dialer ip and send data.
 * > 3. Update synchronized leads with operation id and branch id.
 * > 4. Create a ```dialerSyncLog```
 *
 * @param branch - Branch in which you want to sync leads.
 * @param leads - List of leads which you want to sync in given branch.
 */

async function sendDataToDialer(branch: Branch, leads: Lead[]) {
  if (leads.length < 1) {
    const operationId = randomUUID();
    await prisma.dialerSyncLog.create({
      data: {
        success: false,
        branchId: branch.id,
        response: JSON.stringify({
          Response: "Failure",
          total: 0,
          pass: 0,
          fail: 0,
        }),
        responseCode: 404,
        totalSent: 0,
        totalPassed: 0,
        totalFailed: 0,
        message: "Leads Data Empty",
        operationId,
      },
    });
    return;
  }

  let url = `${branch.https ? "https://" : "http://"}${branch.ip
    }/admin/leadpush`;

  if (!branch.campaignName || !branch.queueName || !branch.listName) {
    console.log(new Date(), " campaign name not found! ", branch.id);
    return;
  }
  // console.log(url)
  const body = {
    campname: branch.campaignName,
    qname: branch.queueName,
    listname: branch.listName,
    data: leads.map((e) => {
      return {
        firstname: e.fullname,
        phonenumber: e.mobileOne?.toString(),
        status: "NEW",
        address1: e.address,
        // middlename: e.middlename,
        comments: `Product: ${e.product}, Language: ${e.language}`,
      };
    }),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        authorization: `Basic ${Buffer.from(
          `${branch.username}:${branch.token}`
        ).toString("base64")}`,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      agent: new https.Agent({ rejectUnauthorized: false }),
    });

    const responseJson: DailerResponse = await response.json();

    // if (responseJson['failure_list'] && Array.isArray(responseJson['failure_list'])) {
    //     const failedData = responseJson['failure_list']
    //     for (const failedEntry of failedData) {
    //         if (failedEntry && failedEntry['phonenumber']) {
    //             const id = leads.filter(f => f.mobileOne === failedEntry['phonenumber'])?.shift()
    //             if (id) {
    //                 await prisma.lead.update({
    //                     data: {
    //                         dialerStatus: "rejected",
    //                         dialerComment: failedEntry["failure_cause"]
    //                     },
    //                     where: {
    //                         id: id.id
    //                     }
    //                 })
    //             }
    //         }
    //     }
    // }

    // @TJ => If Failure List Then We are skipping from the main object then send it back to Dailer

    const operationId = randomUUID();
    const filterFailureDailerList = [];
    const filter = [];

    if (
      typeof responseJson["failure_list"] !== "undefined" &&
      responseJson["failure_list"] &&
      Array.isArray(responseJson["failure_list"])
    ) {
      const failureList = responseJson["failure_list"];

      for (let i = 0; i < leads.length; i++) {
        const findData = failureList.find(
          (e) => e.phonenumber == leads[i].mobileOne
        );

        if (typeof findData?.phonenumber === "undefined") {
          filterFailureDailerList.push(leads[i]);
        } else {
          filter.push(leads[i]);
        }
      }

      // sendDataToDialer(branch, filterFailureDailerList);
    }

    if (response.ok) {
      await prisma.lead.updateMany({
        data: {
          branchId: branch.id,
          syncedWithBranchAt: new Date(),
          operationId,
          dialerStatus: "accepted",
        },
        where: {
          id: {
            in: leads.map((e) => e.id),
          },
        },
      });
    } else {
      if (filterFailureDailerList.length > 0) {
        await prisma.lead.updateMany({
          data: {
            branchId: branch.id,
            syncedWithBranchAt: new Date(),
            operationId,
            dialerStatus: "accepted",
          },
          where: {
            id: {
              in: filterFailureDailerList.map((e) => e.id),
            },
          },
        });
      }

      if (filter) {
        await prisma.lead.updateMany({
          data: {
            branchId: branch.id,
            syncedWithBranchAt: new Date(),
            operationId,
            dialerStatus: "rejected",
          },
          where: {
            id: {
              in: filter.map((e) => e.id),
            },
          },
        });
      }
    }

    await prisma.dialerSyncLog.create({
      data: {
        success: true,
        branchId: branch.id,
        response: JSON.stringify(responseJson),
        responseCode: response.status,
        totalSent: responseJson["total"],
        totalPassed: responseJson["pass"],
        totalFailed: responseJson["fail"],
        message: response.statusText,
        operationId,
      },
    });
  } catch (error) {
    const opId = randomUUID();


    console.log("first", error)

    await prisma.dialerSyncLog.create({
      data: {
        success: false,
        branchId: branch.id,
        operationId: opId,
        message: `Something went wrong! You may see the logs with logid ${opId} for more details`,
      },
    });
  }
}

/**
 * Wrapper function of ```JSON.stringify()```
 */
function objectToString(object: any) {
  try {
    return JSON.stringify(object);
  } catch (error) {
    return undefined;
  }
}

/**
 * This function logs sync error in the database. It is used when an error occur during lead sync.
 */
async function logSyncError(websiteId: string, error?: AxiosError) {
  try {
    await prisma.leadSyncErrorLog.create({
      data: {
        websiteId,
        message:
          typeof error !== "undefined"
            ? error.message
            : "Unknown error occurred! You may want to see apache log for more details.",
        body:
          typeof error !== "undefined" && error.response?.data
            ? objectToString(error.response.data)
            : undefined,
        status: error?.response?.status,
      },
    });
  } catch (error) {
    console.log(websiteId, "Failed to log sync error: ", error);
  }
}

/**
 * This function checks if threshold is set or not, if yes then what is the value of it.
 * @returns Returns an array. Value at index 0 is ```*threshold is valid or not (boolean)*``` and value at index 1 is the ```actual threshold value (Ex. 5)```
 */
async function validThreshold() {
  try {
    const threshold = await prisma.settings.findFirst({
      where: {
        settingKey: "sync_threshold",
      },
    });

    if (!threshold) {
      return [false, 0];
    }

    const branches = await prisma.branch.count();

    if (!(branches > 0)) {
      return [false, 0];
    }



    if (!(parseInt(threshold.settingValue) >= branches)) {
      return [false, 0];
    }

    return [true, parseInt(threshold.settingValue)];
  } catch (error) {
    return [false, 0];
  }
}

/**
 * **Stage 3: Getting leads from websites and storing them**
 *
 * This function will do the following things.
 * > 1. Check if there's any product in the database.
 * > 2. Check if sync threshold has been crossed or not by calling ``` validThreshold() ```
 * > 3. Loop through all the available products
 *
 * >> 3.1 Check if product distribution has been set for currently iterating product. If not, then function will return and won't move ahead.
 *
 * >> 3.2 Get leads of currently iterating product available in the database.
 *
 * >> 3.3 Check if number of leads are more than the threshold. If no, function will return and won't move ahead.
 *
 * >> 3.4 Calculate distribution and round it if necessary
 *
 * >> 3.5 Call next function which is ```sendDataToDialer()```
 */
async function syncWithDialer() {
  try {
    const products = await prisma.product.findMany();
    if (!products || products.length === 0) {
      console.log(
        new Date(),
        " No products in the system! Can not sync with dialer."
      );
      return;
    }

    const [isThresholdValid, threshold] = await validThreshold();
    if (!isThresholdValid) {
      console.log(
        new Date(),
        " Sync threshold is not set or invalid! Can not syncronize!"
      );
      return;
    }

    products.forEach(async (e) => {
      const share = await prisma.productDistribution.findMany({
        include: {
          branch: true,
        },
        where: {
          productId: e.id,
          distribution: {
            gt: 0,
          },
          branch: {
            enabled: true,
          },
        },
      });

      if (!share || share.length === 0) {
        console.log(
          new Date(),
          " No distribution present for product or no branch is available for sync ",
          e.name,
          e.id
        );
        return;
      }

      const leads = await prisma.lead.findMany({
        where: {
          product: e.name,
          branchId: null,
          dialerStatus: null,
        },
      });

      if (!(leads.length >= (threshold as number))) {
        console.log(
          new Date(),
          " Threshold not crossed! Not syncronizing leads with dialer for now."
        );
        return;
      }

      const totalDistribution = share.reduce(
        (sum, s) => s.distribution + sum,
        0
      );
      const roundedDistributions = share.map((rfr) => {
        return Math.round((rfr.distribution / totalDistribution) * 100);
      });

      const leadsLength = leads.length;

      const distributedLeads = roundedDistributions.map((sddf) => {
        return leads.splice(0, Math.round((sddf * leadsLength) / 100));
      });

      for (let index = 0; index < share.length; index++) {
        sendDataToDialer(share[index].branch, distributedLeads[index]);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

/**
 * **Stage 2: Getting leads from websites and storing them**
 *
 * This function will send axios request to all the websites which are passed to it as parameter. With these axios requests, we will be basically getting all the leads from websites and storing them in our database.
 */
function syncWebsites(
  websites: {
    id: string;
    url: string;
    token: string;
    LeadSyncLog: {
      formId: number;
    }[];
  }[]
) {
  websites.forEach(async (website, index) => {
    try {
      let url = `${website.url}?token=${website.token}`;
      if (website.LeadSyncLog.length > 0) {
        url += `&formid=${website.LeadSyncLog[0].formId}`;
      }

      // , websiteId: website.id,inquiry_timestamp: moment(item.inquiry_timestamp).toDate()

      const { data } = await axios.get<
        any,
        AxiosResponse<SyncWebsiteResponse[], any>
      >(url);

      const unique = new Map<
        string,
        {
          fullname: string;
          mobileOne: number;
          address: string;
          language: string;
          product: string;
          // middlename: string;
          inquiryTimestamp: Date;
          formId: number;
          websiteId: string;
        }
      >();
      data.forEach((item) => {
        if (!unique.has(String(item.mobile_one))) {
          if (
            item.mobile_one &&
            Number(item.mobile_one).toString().length === 10
          ) {
            unique.set(String(item.mobile_one), {
              fullname: item.full_name,
              mobileOne: item.mobile_one,
              formId: item.form_id,
              address: item.address,
              language: item.language,
              product: item.product,
              // middlename: item.middlename,
              websiteId: website.id,
              inquiryTimestamp: moment(item.inquiry_timestamp).toDate(),
            });
          }
        }
      });
      console.log("procode", unique);
      const uniueArray = Array.from(unique.values());
      console.log("system error", uniueArray);

      if (data.length > 0) {
        // const preProcessedData = [];
        // for (const e of data) {
        //   if (e.mobile_one && Number(e.mobile_one).toString().length === 10) {
        //     preProcessedData.push({
        //       formId: e.form_id,
        //       fullname: e.full_name,
        //       address: e.address,
        //       language: e.language,
        //       product: e.product,
        //       inquiryTimestamp: moment(e.inquiry_timestamp).toDate(),
        //       mobileOne: e.mobile_one,
        //       websiteId: website.id,
        //     });
        //   }
        // }
        await prisma.lead.createMany({
          data: uniueArray,
          skipDuplicates: true,
        });
        const lastInsertId = data[data.length - 1].form_id;
        await prisma.leadSyncLog.create({
          data: {
            formId: lastInsertId,
            websiteId: website.id,
          },
        });
      }
    } catch (e) {
      let error = e;
      if (!(error instanceof AxiosError) || error.response?.status !== 400) {
        console.log(website.id, error);
      }
      if (error instanceof PrismaClientKnownRequestError) {
        error = new AxiosError(error.message);
      }
      logSyncError(website.id, error instanceof AxiosError ? error : undefined);
    } finally {
      if (index === websites.length - 1) {
        syncWithDialer();
      }
    }
  });
}

export default class WebsiteController {
  /**
   * This function will force system to sync leads with dialer. Use this function only when ```cron jobs``` are failing to automatically sync data with dialer.
   */
  async forceSyncDialer(_: Request, res: Response) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        message: "Service unavailable!",
      });
    }

    try {
      await syncWithDialer();
      res.json({
        message: "ok",
      });
    } catch (error) {
      console.log(error);
      res.json({
        error,
      });
    }
  }

  /**
   * This function is used to add a record in ```leadSyncLog```. By creating this log, you will force system to sync leads from a website after the given ```formid```
   */
  static async syncFrom(req: Request, res: Response) {
    try {
      const { formId, websiteId } = req.body;
      const result = await prisma.leadSyncLog.create({
        data: {
          formId,
          websiteId,
        },
      });
      return res.json(result);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will return list of all websites available in the database.
   */
  static async listAllWebsite(_: Request, res: Response) {
    try {
      const result = await prisma.website.findMany({
        select: {
          id: true,
          name: true,
          url: true,
          autoSync: true,
          LeadSyncLog: {
            select: {
              formId: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json(result);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * **Stage 1: Starting point of lead synchronization flow**
   *
   * This function will start the flow of lead synchronization from all leads website available in the database.
   *
   * *Info:*
   * This function will find all the websites available in the database and pass all those websites to next function call which is ``` syncWebsites ```
   */
  async startLeadSync(req: Request, res: Response) {
    try {


      // ------------------//dev comment -----------------------------------------------------------

      // const { authorization } = req.headers;
      // if (authorization !== process.env.CRON_EX_TOKEN) {
      //   throw new CustomError("Unauthorized request!", 403);
      // }

      const result = await prisma.website.findMany({
        select: {
          id: true,
          url: true,
          token: true,
          LeadSyncLog: {
            select: {
              formId: true,
            },
            orderBy: {
              formId: "desc",
            },
            take: 1,
          },
        },
        where: {
          autoSync: true,
        },
      });
      if (result.length > 0) {
        syncWebsites(result);
      } else {
        console.log(
          `${new Date().toISOString()}: No websites to sync in lead cron manager`
        );
      }

      return res.json({
        message: "Sync will start...",
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will find website in database based on given website id. If found, this function will send an axios request to the url of that website and get the number of remaining leads that we can sync.
   */
  static async getAvailableLeadsCount(req: Request, res: Response) {
    try {
      const { webId } = req.params;

      const result = await prisma.website.findFirst({
        select: {
          url: true,
          token: true,
          LeadSyncLog: {
            select: {
              formId: true,
            },
            orderBy: {
              formId: "desc",
            },
            take: 1,
          },
        },
        where: {
          id: webId,
        },
      });

      if (!result) {
        throw new CustomError("Requested website doesn't exist!", 400);
      }

      const requestParams: { [key: string]: any } = {
        token: result.token,
        count: true,
      };

      if (result.LeadSyncLog.length > 0 && result.LeadSyncLog[0].formId) {
        requestParams["formid"] = result.LeadSyncLog[0].formId;
      }

      const response = await axios.get<any[]>(result.url, {
        params: requestParams,
      });

      return res.json({
        count: response.data.length,
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return res.json({
          count: 0,
        });
      } else {
        errorHandler(error, res);
      }
    }
  }

  /**
   * This function will add a new website in the database and return it.
   */
  static async addWebsite(req: Request, res: Response) {
    try {
      const body = MainPostBody.parse(req.body);
      const response = await prisma.website.create({
        data: body,
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will update website information based on given details and return the updated website.
   */
  static async updateWebsite(req: Request, res: Response) {
    const { id: websiteId } = req.params;

    try {
      const body = MainPatchBody.parse(req.body);
      const response = await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: body,
        select: {
          id: true,
          name: true,
          url: true,
          autoSync: true,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }
}
