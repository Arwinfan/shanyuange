import { appEnvironment, handleOptions, isMockDbAllowed, isMockPaymentAllowed, isMockSmsAllowed, ok, fail } from "../_shared";
import { getAiRuntimeStatus } from "../_llm";

async function checkD1(db: any) {
  if (!db) return { status: "missing" };

  try {
    await db.prepare("SELECT 1").first();
    return { status: "ok" };
  } catch (error: any) {
    return { status: "error", message: error?.message || "D1 检查失败" };
  }
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const db = await checkD1(env.DB);
  const mockAllowed = isMockDbAllowed(env);
  const healthy = db.status === "ok" || mockAllowed;

  const payload = {
    status: healthy ? "ok" : "degraded",
    time: new Date().toISOString(),
    environment: appEnvironment(env),
    services: {
      db,
      mockDb: { allowed: mockAllowed },
      localPayment: { allowed: isMockPaymentAllowed(env), provider: env.PAYMENT_PROVIDER || "local" },
      localSms: { allowed: isMockSmsAllowed(env) },
      objectStorage: { provider: env.STORAGE_PROVIDER || "r2", status: env.R2 ? "ok" : "missing" },
      ai: getAiRuntimeStatus(env),
    },
  };

  if (!healthy) return fail("服务数据库未配置", 503);
  return ok(payload);
}

export async function onRequestOptions() {
  return handleOptions();
}
