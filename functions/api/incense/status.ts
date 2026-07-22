import { fail, handleOptions, mockDb, ok, requireDatabaseOrMock, getSiteTrial } from "../../_shared";

function toOffering(row: any) {
  return {
    incenseId: row.id,
    recordId: row.record_id,
    dedication: row.dedication || "自己",
    wish: row.wish || "",
    amount: Number(row.amount || 0),
    isFree: row.is_free === 1 || row.is_free === true,
    status: row.status,
    startedAt: row.started_at || null,
    endsAt: row.ends_at || null,
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const userId = url.searchParams.get("userId") || "";
  if (!userId) return fail("用户信息不能为空");

  const now = new Date().toISOString();
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    const trial = getSiteTrial(context.env);
    await db.prepare("UPDATE incense_offerings SET status = 'completed', updated_at = ? WHERE user_id = ? AND status = 'burning' AND ends_at IS NOT NULL AND ends_at <= ?")
      .bind(now, userId, now)
      .run();
    const activeRows = await db.prepare("SELECT * FROM incense_offerings WHERE user_id = ? AND status = 'burning' AND ends_at > ? ORDER BY started_at ASC LIMIT 3")
      .bind(userId, now)
      .all();
    const historyRows = await db.prepare("SELECT * FROM incense_offerings WHERE user_id = ? ORDER BY created_at DESC LIMIT 4")
      .bind(userId)
      .all();
    const totalRow = await db.prepare("SELECT COUNT(*) AS total FROM incense_offerings WHERE user_id = ? AND status != 'pending_payment'")
      .bind(userId)
      .first();
    const freeRow = await db.prepare("SELECT COUNT(*) AS total FROM incense_offerings WHERE user_id = ? AND is_free = 1")
      .bind(userId)
      .first();
    return ok({
      burningMinutes: 30,
      hasFreeOffering: Number((freeRow as any)?.total || 0) > 0,
      total: Number((totalRow as any)?.total || 0),
      active: (activeRows.results || []).map(toOffering),
      history: (historyRows.results || []).map(toOffering),
      trial,
    });
  }

  const trial = getSiteTrial(context.env);
  const mock = mockDb();
  mock.incenses.forEach((item) => {
    if (item.user_id === userId && item.status === "burning" && item.ends_at && item.ends_at <= now) {
      item.status = "completed";
      item.updated_at = now;
    }
  });
  const userItems = mock.incenses.filter((item) => item.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const active = userItems
    .filter((item) => item.status === "burning" && !!item.ends_at && item.ends_at > now)
    .sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)))
    .slice(0, 3);
  return ok({
    burningMinutes: 30,
    hasFreeOffering: userItems.some((item) => item.is_free === 1),
    total: userItems.filter((item) => item.status !== "pending_payment").length,
    active: active.map(toOffering),
    history: userItems.slice(0, 4).map(toOffering),
    trial,
  });
}

export async function onRequestOptions() {
  return handleOptions();
}
