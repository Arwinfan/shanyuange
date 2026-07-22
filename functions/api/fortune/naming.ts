import { ensureMockUser, ensureUserExists, handleOptions, ok, fail, readBody, genId, mockDb, requireFields, requireLength, requireDatabaseOrMock, getSiteTrial } from "../../_shared";
import { buildNamingReading, isValidDateParts } from "../../_business";

const VALID_STYLES = ["诗意","刚毅","儒雅","清逸","典雅","温润"];

export async function onRequestPost(context: any) {
  const body = await readBody(context.request);
  const { userId, mode, year, month, day, hour, gender, surname, wordCount, styles, beiFenZi, avoidZi, targetName, compareNames } = body || {};

  const missing = requireFields(body || {}, ["userId","mode","year","month","day","hour","gender"]);
  if (missing) return fail(`${missing} 不能为空`);

  if (!["professional", "evaluate"].includes(mode)) return fail("请选择专业起名或姓名测评");
  if (!isValidDateParts(Number(year), Number(month), Number(day))) return fail("出生日期无效");
  if (!["男", "女"].includes(gender)) return fail("gender 必须是 男/女 之一");

  let normalizedCompareNames: string[] = [];
  if (Array.isArray(compareNames)) {
    normalizedCompareNames = compareNames.map((name: string) => String(name || "").trim()).filter(Boolean);
  }

  if (mode === "evaluate") {
    if (!String(targetName || "").trim()) return fail("请输入待测姓名");
    const targetErr = requireLength(String(targetName || "").trim(), 12, "待测姓名");
    if (targetErr) return fail(targetErr);
    if (normalizedCompareNames.length > 5) return fail("备选姓名最多填写 5 个");
    const longName = normalizedCompareNames.find((name) => name.length > 12);
    if (longName) return fail("备选姓名不能超过 12 字符");
  } else {
    if (!surname) return fail("姓氏不能为空");
    if (!wordCount) return fail("姓名总字数不能为空");
    const lenErr = requireLength(surname, 2, "姓氏");
    if (lenErr) return fail(lenErr);
    if (![2, 3].includes(Number(wordCount))) return fail("姓名总字数必须是 2 或 3");
    if (beiFenZi && beiFenZi.length > 5) return fail("辈分字不能超过 5 字");
    if (avoidZi && avoidZi.length > 100) return fail("避讳字不能超过 100 字");
    if (Array.isArray(styles) && !styles.every((s: string) => VALID_STYLES.includes(s))) return fail("风格选择无效");
  }

  const recordId = genId("rec");
  const orderId = genId("ord");
  const now = new Date().toISOString();
  const normalized = {
    ...body,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    targetName: String(targetName || "").trim(),
    compareNames: normalizedCompareNames,
    wordCount: Number(wordCount || 3),
    styles: Array.isArray(styles) ? styles : [],
  };
  const { preview, fullResult } = buildNamingReading(normalized);

  const db = context.env?.DB;
  const dbModeError = requireDatabaseOrMock(context.env);
  if (dbModeError) return dbModeError;

  if (db) {
    await ensureUserExists(db, userId);
    const trial = getSiteTrial(context.env);
    const isTrial = trial.active;
    await db.prepare("INSERT INTO service_records (id, user_id, type, status, paid, preview_data, full_data, request_data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(recordId, userId, "fortune_naming", isTrial ? "completed" : "pending", isTrial ? 1 : 0, JSON.stringify(preview), JSON.stringify(fullResult), JSON.stringify(normalized), now, now).run();
    if (!isTrial) {
      await db.prepare("INSERT INTO orders (id, user_id, record_id, type, amount, status, created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(orderId, userId, recordId, "fortune_naming", 29.9, "pending", now).run();
    }
    return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 29.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
  }

  ensureMockUser(userId);
  const trial = getSiteTrial(context.env);
  const isTrial = trial.active;
  mockDb().records.push({ id: recordId, user_id: userId, type: "fortune_naming", status: isTrial ? "completed" : "pending", paid: isTrial ? 1 : 0, preview_data: JSON.stringify(preview), full_data: JSON.stringify(fullResult), request_data: JSON.stringify(normalized), created_at: now });
  if (!isTrial) mockDb().orders.push({ id: orderId, user_id: userId, record_id: recordId, type: "fortune_naming", amount: 29.9, status: "pending", created_at: now, paid_at: null });
  return ok({ recordId, orderId: isTrial ? null : orderId, needsPayment: !isTrial, amount: isTrial ? 0 : 29.9, preview, fullResult: isTrial ? fullResult : undefined, trial });
}

export async function onRequestOptions() { return handleOptions(); }
