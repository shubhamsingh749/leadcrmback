import winston, { Logger as WinstonLogger, format } from "winston";

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `[${timestamp}] [${label}] [${level}]: ${message}`;
});

export default class Logger {
  errorLogger: WinstonLogger;
  infoLogger: WinstonLogger;

  constructor(logLabel: string = "Log") {
    this.errorLogger = winston.createLogger({
      level: "error",
      format: combine(label({ label: logLabel }), timestamp(), myFormat),
      transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
      ],
    });

    this.infoLogger = winston.createLogger({
      level: "info",
      format: combine(label({ label: logLabel }), timestamp(), myFormat),
      transports: [
        new winston.transports.File({ filename: "info.log", level: "info" }),
      ],
    });
  }

  error(error: any) {
    try {
      this.errorLogger.log("error", error);
    } catch (e) {
      console.log(
        "An error occurred while trying to log a winston error. ",
        e,
        " || Actual Error: ",
        error
      );
    }
  }

  log(message: any) {
    try {
      this.infoLogger.log("info", message);
    } catch (e) {
      console.log(
        "An error occurred while trying to log a winston info log. ",
        e,
        " || Actual Error: ",
        message
      );
    }
  }
}
