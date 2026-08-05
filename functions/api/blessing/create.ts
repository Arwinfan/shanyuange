import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, maskName, requireFields, requireEnum, requireLength, requireDatabaseOrMock, getSiteTrial } from "../../_shared";
import { buildBlessingFullResult } from "../../_business";

const VALID_LAMPS = ["清心灯","智慧灯","长寿灯","平安灯","姻缘灯","财福灯"];
const VALID_DURATIONS = ["7days","month","100days","year"];
const VALID_RELATIONS = ["父亲","母亲","爱人","孩子","孙辈","朋友","自己"];
const FREE_SEVEN_DAY_DURATION = "7days";
const FREE_SEVEN_DAY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PRICES: Record<string, number> = { "7days": 0, month: 2.9, "100days": 6.9, year: 9.9 };

function getExpiresAt(now: Date, duration: string) {
  const expiresAt = new Date(now);
  if (duration === "7days") expiresAt.setDate(expiresAt.getDate() + 7);
  if (duration === "month") expiresAt.setMonth(expiresAt.getMonth() + 1);
  if (duration === "100days") expiresAt.setDate(expiresAt.getDate() + 100);
  if (duration === "year") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return expiresAt.toISOString();
}

function sevenDayFreeMessage(createdAt: string) {
  const nextAt = new Date(Date.parse(createdAt) + FREE_SEVEN_DAY_COOLDOWN_MS);
  return `七日免费供灯每 7 天仅可使用一次，请于 ${nextAt.toLocaleString("zh-CN", { hour12: false })} 后再来`;
}

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, name, relation, lampType, duration, wish, donorName } = body || {};

  const missing = requireFields(body || {}, ["userId","name","relation","lampType","duration"]);
  if (missing) return fail(`${missing} 不能为空`);

  let err: string | null;
  if ((err = requireEnum(relation, VALID_RELATIONS, "关系"))) return fail(err);
  if ((err = requireEnum(lampType, VALID_LAMPS, "灯型"))) return fail(err);
  if ((err = requireEnum(duration, VALID_DURATIONS, "供奉时长"))) return fail(err);
  if ((err = requireLength(name, 20, "姓名"))) return fail(err);
  if (wish && (err = requireLength(wish, 80, "心愿"))) return fail(err);
  if (donorName && (err = requireLength(donorName, 10, "称呼"))) return fail(err);

  const amount = PRICES[duration] ?? 2.9;
  const recordId = genId("rec");
  const orderId = genId("ord");
  const lampId = genId("lamp");
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const expiresAt = getExpiresAt(nowDate, duration);

  const maskedName = maskName(name);
  const maskedDonor = maskName(donorName || "善信");

  const preview = { lampType, duration, maskedName, maskedDonor };
  const fullResult = buildBlessingFullResult({ name, relation, lampType, duration, wish, donorName, maskedName, maskedDonor });

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    if (duration === FREE_SEVEN_DAY_DURATION) {
      const cutoff = new Date(nowDate.getTime() - FREE_SEVEN_DAY_COOLDOWN_MS).toISOString();
      const recentFreeLamp: { created_at: string } | null = await db.prepare(
        "SELECT created_at FROM blessing_lamps WHERE user_id = ? AND duration = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1",
      ).bind(userId, FREE_SEVEN_DAY_DURATION, cutoff).first();
      if (recentFreeLamp?.created_at) return fail(sevenDayFreeMessage(recentFreeLamp.created_at));
    }

    const trial = getSiteTrial(context.env);
    const isFree = duration === FREE_SEVEN_DAY_DURATION || duration === "month";
    const chargedAmount = isFree ? 0 : amount;
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "blessing_lamp", isFree ? "completed" : "pending", isFree ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(body), now, now).run();
    await db.prepare("INSERT INTO blessing_lamps (id, record_id, user_id, name_raw, name_masked, donor_name_raw, donor_name_masked, relation, lamp_type, duration, wish, amount, paid, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(lampId, recordId, userId, name, maskedName, donorName || null, maskedDonor, relation, lampType, duration, wish || null, chargedAmount, isFree ? 1 : 0, now, expiresAt).run();
    if (!isFree) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "blessing_lamp", amount, "pending", now).run();
    }
    return ok({ recordId, orderId: isFree ? null : orderId, needsPayment: !isFree, amount: chargedAmount, preview, trial, expiresAt });
  }

  ensureMockUser(userId);
  if (duration === FREE_SEVEN_DAY_DURATION) {
    const recentFreeLamp = mockDb().lamps
      .filter((lamp) => lamp.user_id === userId && lamp.duration === FREE_SEVEN_DAY_DURATION)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (recentFreeLamp && Date.parse(recentFreeLamp.created_at) > nowDate.getTime() - FREE_SEVEN_DAY_COOLDOWN_MS) {
      return fail(sevenDayFreeMessage(recentFreeLamp.created_at));
    }
  }

  const trial = getSiteTrial(context.env);
  const isFree = duration === FREE_SEVEN_DAY_DURATION || duration === "month";
  const chargedAmount = isFree ? 0 : amount;
  mockDb().records.push({ id: recordId, user_id: userId, type: "blessing_lamp", status: isFree ? "completed" : "pending", paid: isFree ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(body), created_at: now });
  mockDb().lamps.push({ id: lampId, record_id: recordId, user_id: userId, name_raw: name, name_masked: maskedName, donor_name_raw: donorName || null, donor_name_masked: maskedDonor, relation, lamp_type: lampType, duration, wish: wish || null, amount: chargedAmount, paid: isFree ? 1 : 0, created_at: now, expires_at: expiresAt });
  if (!isFree) mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "blessing_lamp", amount, status: "pending", created_at: now, paid_at: null });
  return ok({ recordId, orderId: isFree ? null : orderId, needsPayment: !isFree, amount: chargedAmount, preview, trial, expiresAt });
}

export async function onRequestOptions() { return handleOptions(); }
