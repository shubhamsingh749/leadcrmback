import { Request } from "express";

export default function getClientIP(req: Request) {
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;
}
