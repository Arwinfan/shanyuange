import {
  FREE_LIMITS,
  ensureMockUser,
  ensureUserExists,
  getFreeUsageCount,
  getMockFreeUsageCount,
  handleOptions,
  ok,
  fail,
  mockDb,
  usageDate,
  getSiteTrial, requireDatabaseOrMock,
} from "../../_shared";

async function buildQuota(db: any, userId: string, type: string) {
  const config = FREE_LIMITS[type];
  if (!config) return null;
  const used = await getFreeUsageCount(db, userId, type);
  return {
    type,
    label: config.label,
    total: config.total,
    used,
    remaining: Math.max(0, config.total - used),
    paidAmount: config.paidAmount,
    date: usageDate(),
  };
}

function buildMockQuota(userId: string, type: string) {
  const config = FREE_LIMITS[type];
  if (!config) return null;
  const used = getMockFreeUsageCount(userId, type);
  return {
    type,
    label: config.label,
    total: config.total,
    used,
    remaining: Math.max(0, config.total - used),
    paidAmount: config.paidAmount,
    date: usageDate(),
  };
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId");
  const type = url.searchParams.get("type");

  if (!userId) return fail("userId 不能为空");
  if (type && !FREE_LIMITS[type]) return fail("暂不支持该服务的免费额度");

  const types = type ? [type] : Object.keys(FREE_LIMITS);
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const quotas = await Promise.all(types.map((item) => buildQuota(db, userId, item)));
    return ok({ items: quotas.filter(Boolean), date: usageDate(), trial });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  return ok({ items: types.map((item) => buildMockQuota(userId, item)).filter(Boolean), date: usageDate(), trial });
}

export async function onRequestOptions() { return handleOptions(); }
