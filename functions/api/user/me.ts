import { FREE_LIMITS, ensureMockUser, ensureUserExists, getFreeUsageCount, getMockFreeUsageCount, handleOptions, ok, fail, maskPhone, mockDb, usageDate, requireDatabaseOrMock, getSiteTrial } from "../../_shared";

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return fail("userId 不能为空");

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const recordCount = await db.prepare("SELECT COUNT(*) as total FROM service_records WHERE user_id = ?").bind(userId).first();
    const paidCount = await db.prepare("SELECT COUNT(*) as total FROM service_records WHERE user_id = ? AND paid = 1").bind(userId).first();
    const trial = getSiteTrial(context.env);
    const account = await db.prepare("SELECT phone FROM user_accounts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();
    const quotas = await Promise.all(Object.keys(FREE_LIMITS).map(async (type) => {
      const config = FREE_LIMITS[type];
      const used = await getFreeUsageCount(db, userId, type);
      return { type, label: config.label, total: config.total, used, remaining: Math.max(0, config.total - used), paidAmount: config.paidAmount };
    }));
    return ok({
      userId,
      createdAt: new Date().toISOString(),
      stats: { records: Number((recordCount as any)?.total || 0), paidRecords: Number((paidCount as any)?.total || 0) },
      account: account ? { phoneMasked: maskPhone((account as any).phone) } : null,
      quotas,
      trial,
      date: usageDate(),
    });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  const userRecords = mockDb().records.filter((r) => r.user_id === userId);
  const quotas = Object.keys(FREE_LIMITS).map((type) => {
    const config = FREE_LIMITS[type];
    const used = getMockFreeUsageCount(userId, type);
    return { type, label: config.label, total: config.total, used, remaining: Math.max(0, config.total - used), paidAmount: config.paidAmount };
  });
  return ok({
    userId,
    createdAt: mockDb().users.find((u) => u.id === userId)?.created_at,
    stats: { records: userRecords.length, paidRecords: userRecords.filter((r) => r.paid === 1).length },
    account: mockDb().accounts.find((item) => item.user_id === userId)
      ? { phoneMasked: maskPhone(mockDb().accounts.find((item) => item.user_id === userId)!.phone) }
      : null,
    quotas,
    trial,
    date: usageDate(),
  });
}

export async function onRequestOptions() { return handleOptions(); }
