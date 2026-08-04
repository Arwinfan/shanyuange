// ============================================================
// 共享工具: CORS / 响应 / 校验 / ID 生成 / 脱敏 / Mock DB
// ============================================================

// ---------- CORS ----------
export function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, X-User-Token",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ---------- JSON 响应 ----------
export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export function ok(data: any) {
  return json({ success: true, data });
}

export function fail(message: string, status = 400) {
  return json({ success: false, message, data: null }, status);
}

// ---------- 环境 / Mock 开关 ----------
export function envValue(env: any, ...keys: string[]) {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function appEnvironment(env: any) {
  return (envValue(env, "APP_ENV", "ENVIRONMENT", "NODE_ENV") || "development").toLowerCase();
}

export function envFlag(env: any, ...keys: string[]) {
  const value = envValue(env, ...keys).toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return null;
}

export function isProductionEnv(env: any) {
  const appEnv = appEnvironment(env);
  if (["production", "prod"].includes(appEnv)) return true;
  const branch = envValue(env, "CF_PAGES_BRANCH").toLowerCase();
  return branch === "main" || branch === "master";
}

export function isMockDbAllowed(env: any) {
  const explicit = envFlag(env, "ALLOW_MOCK_DB");
  if (explicit !== null) return explicit;
  return !isProductionEnv(env);
}

export function requireDatabaseOrMock(env: any) {
  if (env?.DB || isMockDbAllowed(env)) return null;
  return fail("服务数据库未配置，请联系管理员", 503);
}

// ---------- 订单 / 支付状态 ----------
export const ORDER_STATUSES = ["pending", "paid", "failed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

export function isMockPaymentAllowed(env: any) {
  const explicit = envFlag(env, "MOCK_PAYMENT", "ALLOW_MOCK_PAYMENT");
  if (explicit !== null) return explicit;
  return !isProductionEnv(env);
}

export function requireMockPayment(env: any) {
  if (isMockPaymentAllowed(env)) return null;
  return fail("支付通道暂未开放，请稍后再试", 503);
}

// ---------- 手机号 / 短信 ----------
export function isMockSmsAllowed(env: any) {
  const explicit = envFlag(env, "MOCK_SMS", "ALLOW_MOCK_SMS");
  if (explicit !== null) return explicit;
  return !isProductionEnv(env);
}

export function normalizePhone(phone: unknown) {
  return String(phone || "").replace(/\D/g, "");
}

export function isValidChinaMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return "手机号";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

// ---------- ID 生成 ----------
let _counter = 0;
export function genId(prefix: string): string {
  _counter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}${rand}${_counter}`;
}

// ---------- 设备会话 / 接口鉴权 ----------
// userId 仅是数据归属标识，不能单独作为访问凭据。所有私有接口还必须携带
// 服务端保存的设备会话，避免猜到 userId 后读取或篡改他人记录。
const SESSION_TTL_DAYS = 180;
const SESSION_TOKEN_BYTES = 32;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createOpaqueToken() {
  const bytes = new Uint8Array(SESSION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export async function hashSecret(secret: string) {
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hex(new Uint8Array(digest));
}

export function deviceSessionExpiresAt(now = Date.now()) {
  return new Date(now + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export async function createUserSession(env: any, userId: string, expiresAt = deviceSessionExpiresAt()) {
  const token = createOpaqueToken();
  const tokenHash = await hashSecret(token);
  const now = new Date().toISOString();
  const db = env?.DB;

  if (db) {
    await db.prepare(
      "INSERT INTO user_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(genId("session"), userId, tokenHash, expiresAt, now).run();
  } else {
    mockDb().sessions.push({ id: genId("session"), user_id: userId, token: tokenHash, expires_at: expiresAt, created_at: now });
  }

  return { token, expiresAt };
}

export async function isUserSessionValid(env: any, userId: string, token: string) {
  if (!userId || !token) return false;
  const tokenHash = await hashSecret(token);
  const now = new Date().toISOString();
  const db = env?.DB;

  if (db) {
    const row = await db.prepare(
      "SELECT id FROM user_sessions WHERE user_id = ? AND token = ? AND expires_at > ? LIMIT 1",
    ).bind(userId, tokenHash, now).first();
    return Boolean(row);
  }

  return mockDb().sessions.some((session) => (
    session.user_id === userId && session.token === tokenHash && Date.parse(session.expires_at) > Date.now()
  ));
}

async function requestUserId(request: Request) {
  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("userId")?.trim();
  if (queryUserId) return queryUserId;

  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return "";
  try {
    const body = await request.clone().json() as { userId?: unknown };
    return typeof body?.userId === "string" ? body.userId.trim() : "";
  } catch {
    return "";
  }
}

const PUBLIC_API_PATHS = new Set([
  "/api/health",
  "/api/ai/health",
  "/api/almanac",
  "/api/almanac/today",
  "/api/user/anonymous",
  "/api/auth/sms/login",
  "/api/auth/credential/recover",
  "/api/order/callback",
]);

export async function authorizeApiRequest(request: Request, env: any) {
  const pathname = new URL(request.url).pathname;
  if (PUBLIC_API_PATHS.has(pathname) || pathname.startsWith("/api/admin/")) return null;

  const userId = await requestUserId(request);
  const token = request.headers.get("X-User-Token")?.trim() || "";
  if (!userId || !token) {
    return fail("为了保护您的记录，请先建立本设备凭证或通过二维码恢复账号。", 401);
  }

  if (!(await isUserSessionValid(env, userId, token))) {
    return fail("本设备凭证已失效，请重新建立账号凭证或通过二维码恢复账号。", 401);
  }
  return null;
}

// ---------- 脱敏 ----------
export function maskName(name: string): string {
  if (!name || name.length === 0) return "***";
  if (name.length === 1) return name + "*";
  return name[0] + "*".repeat(name.length - 1);
}

// ---------- Mock 内存数据库 ----------
// 仅用于本地开发和测试环境。生产环境必须配置 D1。

interface MockUser { id: string; created_at: string; }
interface MockRecord { id: string; user_id: string; type: string; status: string; paid: number; preview_data: string; full_data: string | null; request_data: string; created_at: string; }
interface MockLamp { id: string; record_id: string; user_id: string; name_raw: string; name_masked: string; donor_name_raw: string | null; donor_name_masked: string | null; relation: string; lamp_type: string; duration: string; wish: string | null; amount: number; paid: number; created_at: string; expires_at: string; }
interface MockIncense { id: string; record_id: string; user_id: string; dedication: string | null; wish: string | null; amount: number; is_free: number; status: string; started_at: string | null; ends_at: string | null; created_at: string; updated_at: string; }
interface MockOrder { id: string; user_id: string; record_id: string; type: string; amount: number; status: string; created_at: string; paid_at: string | null; }
interface MockUsage { id: string; user_id: string; type: string; usage_date: string; record_id: string; free: number; created_at: string; }
interface MockAccount { id: string; user_id: string; phone: string; created_at: string; updated_at: string; }
interface MockSmsCode { id: string; phone: string; code: string; scene: string; expires_at: string; used_at: string | null; attempts: number; created_at: string; }
interface MockSession { id: string; user_id: string; token: string; expires_at: string; created_at: string; }
interface MockRecoveryCredential { id: string; user_id: string; token_hash: string; expires_at: string; used_at: string | null; created_at: string; }
interface MockFeedback { id: string; user_id: string; category: string; page_path: string | null; content: string; contact: string | null; status: string; created_at: string; updated_at: string; }
interface MockWish { id: string; user_id: string; nickname_raw: string; nickname_masked: string; category: string; content: string; color: string; status: string; like_count: number; created_at: string; updated_at: string; deleted_at: string | null; }
interface MockWishLike { id: string; wish_id: string; user_id: string; created_at: string; }
interface MockWishReport { id: string; wish_id: string; reporter_id: string; reason: string; detail: string | null; status: string; created_at: string; updated_at: string; }

class MockDB {
  users: MockUser[] = [];
  records: MockRecord[] = [];
  lamps: MockLamp[] = [];
  incenses: MockIncense[] = [];
  orders: MockOrder[] = [];
  usage: MockUsage[] = [];
  accounts: MockAccount[] = [];
  smsCodes: MockSmsCode[] = [];
  sessions: MockSession[] = [];
  recoveryCredentials: MockRecoveryCredential[] = [];
  feedback: MockFeedback[] = [];
  wishes: MockWish[] = [];
  wishLikes: MockWishLike[] = [];
  wishReports: MockWishReport[] = [];

  // 种子数据: 预置一些心愿灯墙数据
  constructor() {
    const seededNames = [
      ["武**","武*"],["w**","w*"],["赵**","赵*"],["杜**","杜*"],
      ["刘**","刘*"],["林**","林*"],["杨**","杨*"],["邓**","邓*"],
      ["王**","王*"],["Z**","Z*"],["张**","张*"],["朱**","朱*"],
      ["马**","马*"],["付**","付*"],["周**","周*"],["何**","何*"],
    ];
    seededNames.forEach(([nm, dn], i) => {
      this.lamps.push({
        id: genId("lamp"), record_id: genId("rec"), user_id: "seed",
        name_raw: nm, name_masked: nm, donor_name_raw: dn, donor_name_masked: "善**",
        relation: "家人", lamp_type: "平安灯", duration: "month",
        wish: null, amount: 2.9, paid: 1, created_at: new Date(Date.now() - i * 3600000).toISOString(), expires_at: new Date(Date.now() + (30 - i) * 86400000).toISOString(),
      });
    });
  }
}

// 单例
let _mockDb: MockDB | null = null;
export function mockDb(): MockDB {
  if (!_mockDb) _mockDb = new MockDB();
  return _mockDb;
}

// ---------- D1 辅助: 获取 D1 绑定或回退 Mock ----------
export function getDB(env: any) {
  // Cloudflare Pages Functions 中 D1 绑定在 env.DB
  return env?.DB || null;
}

// 统一执行: 有 D1 用 D1, 本地开发可回退 Mock，生产环境禁止静默回退
export function useDB(env: any) {
  const db = getDB(env);
  if (!db && !isMockDbAllowed(env)) {
    throw new Error("D1 数据库未配置，生产环境禁止使用 Mock 内存数据库");
  }
  return { db, mock: mockDb(), hasDB: !!db };
}

export async function ensureUserExists(db: any, userId: string) {
  const now = new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(userId, now, now)
    .run();
}

export function ensureMockUser(userId: string) {
  const mock = mockDb();
  if (!mock.users.some((u) => u.id === userId)) {
    mock.users.push({ id: userId, created_at: new Date().toISOString() });
  }
}

export function usageDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export const TRIAL_DAYS = 15;

export type TrialStatus = {
  active: boolean;
  startedAt: string;
  endsAt: string;
  daysTotal: number;
  daysRemaining: number;
};

function trialDays(env: any) {
  const configured = Number.parseInt(envValue(env, "SITE_TRIAL_DAYS"), 10);
  return Number.isFinite(configured) && configured > 0 && configured <= 90 ? configured : TRIAL_DAYS;
}

export function buildTrialStatus(startedAt: string | null | undefined, now = Date.now(), days = TRIAL_DAYS): TrialStatus {
  const parsed = startedAt ? Date.parse(startedAt) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return { active: false, startedAt: "", endsAt: "", daysTotal: days, daysRemaining: 0 };
  }

  const endsAtMs = parsed + days * 24 * 60 * 60 * 1000;
  const remainingMs = endsAtMs - now;
  return {
    active: remainingMs > 0,
    startedAt: new Date(parsed).toISOString(),
    endsAt: new Date(endsAtMs).toISOString(),
    daysTotal: days,
    daysRemaining: Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
  };
}

// SITE_TRIAL_START_AT is set once at actual launch, so every visitor shares the same testing window.
export function getSiteTrial(env: any, now = Date.now()) {
  return buildTrialStatus(envValue(env, "SITE_TRIAL_START_AT"), now, trialDays(env));
}
export const FREE_LIMITS: Record<string, { total: number; label: string; paidAmount: number }> = {
  fortune_draw: { total: 1, label: "关帝灵签", paidAmount: 2.9 },
  fortune_divination: { total: 1, label: "六爻占卜", paidAmount: 2.9 },
};

export async function getFreeUsageCount(db: any, userId: string, type: string, day = usageDate()) {
  try {
    const result = await db.prepare(
      "SELECT COUNT(*) as used FROM daily_usage WHERE user_id = ? AND type = ? AND usage_date = ? AND free = 1"
    ).bind(userId, type, day).first();
    return Number((result as any)?.used || 0);
  } catch {
    const result = await db.prepare(
      "SELECT COUNT(*) as used FROM service_records WHERE user_id = ? AND type = ? AND status = 'completed' AND date(created_at) = date(?)"
    ).bind(userId, type, day).first();
    return Number((result as any)?.used || 0);
  }
}

export async function addUsageEvent(db: any, input: { id: string; userId: string; type: string; recordId: string; free: boolean; createdAt: string }) {
  try {
    await db.prepare(
      "INSERT OR IGNORE INTO daily_usage (id, user_id, type, usage_date, record_id, free, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(input.id, input.userId, input.type, usageDate(new Date(input.createdAt)), input.recordId, input.free ? 1 : 0, input.createdAt).run();
  } catch {
    // 旧本地数据库尚未初始化 daily_usage 时，不阻断主流程。
  }
}

export function getMockFreeUsageCount(userId: string, type: string, day = usageDate()) {
  return mockDb().usage.filter((u) => u.user_id === userId && u.type === type && u.usage_date === day && u.free === 1).length;
}

export function addMockUsageEvent(input: { id: string; userId: string; type: string; recordId: string; free: boolean; createdAt: string }) {
  const mock = mockDb();
  if (mock.usage.some((u) => u.id === input.id)) return;
  mock.usage.push({
    id: input.id,
    user_id: input.userId,
    type: input.type,
    usage_date: usageDate(new Date(input.createdAt)),
    record_id: input.recordId,
    free: input.free ? 1 : 0,
    created_at: input.createdAt,
  });
}

// ---------- 参数校验 ----------
export function requireFields(body: any, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") return f;
  }
  return null;
}

export function requireEnum(value: string, options: string[], fieldName: string): string | null {
  if (!options.includes(value)) return `${fieldName} 必须是 ${options.join("/")} 之一`;
  return null;
}

export function requireLength(value: string, max: number, fieldName: string): string | null {
  if (value && value.length > max) return `${fieldName} 不能超过 ${max} 字符`;
  return null;
}

// ---------- 读取请求体 ----------
export async function readBody(request: Request): Promise<any> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return request.json();
  }
  // form-data 暂不解析，手相上传用 base64 代替
  return {};
}
