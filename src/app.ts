import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import IpValidationMiddleware from "./middleware/ip-validation.middleware";
import {
  AuthRouter,
  BranchRouter,
  DistributionRouter,
  LeadRouter,
  ProductRouter,
  ReportRouter,
  SettingRouter,
  WebsiteRouter,
} from "./routers";

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

// app.use(
//   cors({
//     origin:
//       process.env.NODE_ENV === "production"
//         ? process.env.CORS_ALLOWED_IP?.split(",")
//         : "*",
//   })
// );

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));
app.use(IpValidationMiddleware);

const publicPath = path.join(__dirname, "./exports");
app.use("/exports", express.static(publicPath));

app.use("/auth", AuthRouter);
app.use("/website", WebsiteRouter);
app.use("/branch", BranchRouter);
app.use("/setting", SettingRouter);
app.use("/report", ReportRouter);
app.use("/product", ProductRouter);
app.use("/distribution", DistributionRouter);
app.use("/manual-lead", LeadRouter);

app.all("*", (_, res) => {
  return res.status(404).json({
    message: "You're lost! This route is undefined.",
  });
});

app.listen(process.env.PORT || 4000, () => console.log("CRON Server started"));
