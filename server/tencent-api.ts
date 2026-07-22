import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import { closeTencentRuntime, createTencentRuntimeEnv } from "./tencent-runtime";

import * as health from "../functions/api/health";
import * as aiHealth from "../functions/api/ai/health";
import * as almanac from "../functions/api/almanac/index";
import * as almanacToday from "../functions/api/almanac/today";
import * as userAnonymous from "../functions/api/user/anonymous";
import * as userMe from "../functions/api/user/me";
import * as bindPhone from "../functions/api/auth/phone/bind";
import * as smsSend from "../functions/api/auth/sms/send";
import * as smsLogin from "../functions/api/auth/sms/login";
import * as feedback from "../functions/api/feedback/index";
import * as adminFeedback from "../functions/api/admin/feedback";
import * as blessingWall from "../functions/api/blessing/wall";
import * as blessingCreate from "../functions/api/blessing/create";
import * as incenseOffer from "../functions/api/incense/offer";
import * as incenseStatus from "../functions/api/incense/status";
import * as quotaToday from "../functions/api/quota/today";
import * as bazi from "../functions/api/fortune/bazi";
import * as naming from "../functions/api/fortune/naming";
import * as dream from "../functions/api/fortune/dream";
import * as draw from "../functions/api/fortune/draw";
import * as divination from "../functions/api/fortune/divination";
import * as palmistry from "../functions/api/fortune/palmistry";
import * as palmistryDelete from "../functions/api/fortune/palmistry-delete";
import * as records from "../functions/api/records/index";
import * as recordById from "../functions/api/records/[id]";
import * as recordsRecover from "../functions/api/records/recover";
import * as orderCreate from "../functions/api/order/create";
import * as orderById from "../functions/api/order/[id]";
import * as orderComplete from "../functions/api/order/complete";
import * as orderMockPaid from "../functions/api/order/mock-paid";
import * as orderCallback from "../functions/api/order/callback";

type Handler = (context: { request: Request; env: Record<string, unknown> }) => Promise<Response>;
type HandlerModule = {
  onRequestGet?: Handler;
  onRequestPost?: Handler;
  onRequestOptions?: () => Promise<Response>;
};

type Route = {
  pattern: string | RegExp;
  module: HandlerModule;
};

const routes: Route[] = [
  { pattern: "/api/health", module: health },
  { pattern: "/api/ai/health", module: aiHealth },
  { pattern: "/api/almanac", module: almanac },
  { pattern: "/api/almanac/today", module: almanacToday },
  { pattern: "/api/user/anonymous", module: userAnonymous },
  { pattern: "/api/user/me", module: userMe },
  { pattern: "/api/auth/phone/bind", module: bindPhone },
  { pattern: "/api/auth/sms/send", module: smsSend },
  { pattern: "/api/auth/sms/login", module: smsLogin },
  { pattern: "/api/feedback", module: feedback },
  { pattern: "/api/admin/feedback", module: adminFeedback },
  { pattern: "/api/blessing/wall", module: blessingWall },
  { pattern: "/api/blessing/create", module: blessingCreate },
  { pattern: "/api/incense/offer", module: incenseOffer },
  { pattern: "/api/incense/status", module: incenseStatus },
  { pattern: "/api/quota/today", module: quotaToday },
  { pattern: "/api/fortune/bazi", module: bazi },
  { pattern: "/api/fortune/naming", module: naming },
  { pattern: "/api/fortune/dream", module: dream },
  { pattern: "/api/fortune/draw", module: draw },
  { pattern: "/api/fortune/divination", module: divination },
  { pattern: "/api/fortune/palmistry", module: palmistry },
  { pattern: "/api/fortune/palmistry-delete", module: palmistryDelete },
  { pattern: "/api/records/recover", module: recordsRecover },
  { pattern: "/api/records", module: records },
  { pattern: /^\/api\/records\/[^/]+$/, module: recordById },
  { pattern: "/api/order/create", module: orderCreate },
  { pattern: "/api/order/complete", module: orderComplete },
  { pattern: "/api/order/mock-paid", module: orderMockPaid },
  { pattern: "/api/order/callback", module: orderCallback },
  { pattern: /^\/api\/order\/[^/]+$/, module: orderById },
];

function matches(pattern: Route["pattern"], pathname: string) {
  return typeof pattern === "string" ? pattern === pathname : pattern.test(pathname);
}

function findRoute(pathname: string) {
  return routes.find((route) => matches(route.pattern, pathname));
}

function requestHeaders(headers: IncomingHttpHeaders) {
  const next = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    next.set(key, Array.isArray(value) ? value.join(",") : value);
  }
  return next;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function originFor(request: IncomingMessage) {
  const protocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = request.headers.host || "127.0.0.1";
  return `${protocol}://${host}`;
}

async function toWebRequest(request: IncomingMessage) {
  const method = request.method || "GET";
  const body = ["GET", "HEAD"].includes(method) ? undefined : await readRequestBody(request);
  return new Request(`${originFor(request)}${request.url || "/"}`, {
    method,
    headers: requestHeaders(request.headers),
    body: body as unknown as BodyInit | undefined,
  });
}

function writeResponse(response: ServerResponse, source: Response, body: Buffer) {
  const headers: Record<string, string> = {};
  source.headers.forEach((value, key) => { headers[key] = value; });
  response.writeHead(source.status, headers);
  response.end(body);
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ success: false, data: null, message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}

async function dispatch(request: IncomingMessage) {
  const webRequest = await toWebRequest(request);
  const pathname = new URL(webRequest.url).pathname;
  const route = findRoute(pathname);
  if (!route) return errorResponse(404, "接口不存在");

  const method = webRequest.method.toUpperCase();
  if (method === "OPTIONS") {
    return route.module.onRequestOptions?.() || new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key" },
    });
  }

  const handler = method === "GET" ? route.module.onRequestGet : method === "POST" ? route.module.onRequestPost : undefined;
  if (!handler) return errorResponse(405, "请求方式不支持");
  return handler({ request: webRequest, env: createTencentRuntimeEnv() });
}

const port = Number.parseInt(process.env.API_PORT || process.env.PORT || "8789", 10);
const host = process.env.API_HOST || "0.0.0.0";

const server = createServer(async (request, response) => {
  try {
    const result = await dispatch(request);
    const body = result.body ? Buffer.from(await result.arrayBuffer()) : Buffer.alloc(0);
    writeResponse(response, result, body);
  } catch (error) {
    console.error("[tencent-api] request failed", error);
    const result = errorResponse(500, "服务暂时不可用，请稍后重试");
    writeResponse(response, result, Buffer.from(await result.arrayBuffer()));
  }
});

server.listen(port, host, () => {
  console.log(`[tencent-api] listening on http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await closeTencentRuntime();
}

process.once("SIGINT", () => { shutdown().finally(() => process.exit(0)); });
process.once("SIGTERM", () => { shutdown().finally(() => process.exit(0)); });