import {
  ensureMockUser,
  ensureUserExists,
  fail,
  genId,
  handleOptions,
  mockDb,
  ok,
  readBody,
  requireDatabaseOrMock,
  getSiteTrial, requireLength,
} from "../../_shared";

const BURNING_MINUTES = 30;
const INCENSE_PRICE = 2.99;
const MAX_ACTIVE_INCENSE = 3;

function buildResult(input: { dedication: string; wish: string; startedAt: string | null; endsAt: string | null }) {
  return {
    dedication: input.dedication || "自己",
    wish: input.wish || "",
    burningMinutes: BURNING_MINUTES,
    startedAt: input.startedAt,
    endsAt: input.endsAt,
    note: "一炷清香，愿心中所念安稳明朗。",
  };
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const dedication = typeof body?.dedication === "string" ? body.dedication.trim() : "";
  const wish = typeof body?.wish === "string" ? body.wish.trim() : "";

  if (!userId) return fail("用户信息不能为空");
  if (requireLength(dedication, 20, "敬香对象")) return fail("敬香对象不能超过 20 个字");
  if (requireLength(wish, 80, "心愿")) return fail("心愿不能超过 80 个字");

  const now = new Date().toISOString();
  const recordId = genId("rec");
  const incenseId = genId("incense");
  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  let isFree = false;
  let isFirstFree = false;
  let trial: any;
  if (db) {
    await ensureUserExists(db, userId);
    trial = getSiteTrial(context.env);
    await db.prepare("UPDATE incense_offerings SET status = 'completed', updated_at = ? WHERE user_id = ? AND status = 'burning' AND ends_at IS NOT NULL AND ends_at <= ?")
      .bind(now, userId, now)
      .run();
    const activeResult = await db.prepare("SELECT COUNT(*) AS total FROM incense_offerings WHERE user_id = ? AND status = 'burning' AND ends_at > ?")
      .bind(userId, now)
      .first();
    if (Number((activeResult as any)?.total || 0) >= MAX_ACTIVE_INCENSE) {
      return fail("香炉中已有三炷清香，请待其中一炷燃尽后再供香。", 409);
    }
    const freeResult = await db.prepare("SELECT COUNT(*) AS total FROM incense_offerings WHERE user_id = ? AND is_free = 1").bind(userId).first();
    isFirstFree = Number((freeResult as any)?.total || 0) === 0;
    isFree = trial.active || isFirstFree;
  } else {
    ensureMockUser(userId);
    trial = getSiteTrial(context.env);
    const mock = mockDb();
    mock.incenses.forEach((item) => {
      if (item.user_id === userId && item.status === "burning" && item.ends_at && item.ends_at <= now) {
        item.status = "completed";
        item.updated_at = now;
      }
    });
    if (mock.incenses.filter((item) => item.user_id === userId && item.status === "burning" && !!item.ends_at && item.ends_at > now).length >= MAX_ACTIVE_INCENSE) {
      return fail("香炉中已有三炷清香，请待其中一炷燃尽后再供香。", 409);
    }
    isFirstFree = !mock.incenses.some((item) => item.user_id === userId && item.is_free === 1);
    isFree = trial.active || isFirstFree;
  }

  const amount = isFree ? 0 : INCENSE_PRICE;
  const status = isFree ? "burning" : "pending_payment";
  const startedAt = isFree ? now : null;
  const endsAt = isFree ? new Date(Date.parse(now) + BURNING_MINUTES * 60 * 1000).toISOString() : null;
  const preview = { dedication: dedication || "自己", wish, burningMinutes: BURNING_MINUTES };
  const fullResult = buildResult({ dedication, wish, startedAt, endsAt });
  const orderId = isFree ? null : genId("ord");

  if (db) {
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "temple_incense", isFree ? "completed" : "pending", isFree ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify({ dedication, wish }), now, now)
      .run();
    await db.prepare("INSERT INTO incense_offerings (id, record_id, user_id, dedication, wish, amount, is_free, status, started_at, ends_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(incenseId, recordId, userId, dedication || null, wish || null, amount, isFirstFree ? 1 : 0, status, startedAt, endsAt, now, now)
      .run();
    if (orderId) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "temple_incense", amount, "pending", now)
        .run();
    }
  } else {
    const mock = mockDb();
    mock.records.push({ id: recordId, user_id: userId, type: "temple_incense", status: isFree ? "completed" : "pending", paid: isFree ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify({ dedication, wish }), created_at: now });
    mock.incenses.push({ id: incenseId, record_id: recordId, user_id: userId, dedication: dedication || null, wish: wish || null, amount, is_free: isFirstFree ? 1 : 0, status, started_at: startedAt, ends_at: endsAt, created_at: now, updated_at: now });
    if (orderId) mock.orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "temple_incense", amount, status: "pending", created_at: now, paid_at: null });
  }

  return ok({ recordId, orderId, needsPayment: !isFree, amount, burningMinutes: BURNING_MINUTES, startedAt, endsAt, trial });
}

export async function onRequestOptions() {
  return handleOptions();
}
