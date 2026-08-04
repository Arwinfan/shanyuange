// ============================================================
// 善缘阁 API 客户端
// 统一管理所有后端 API 调用
// ============================================================

import { resolveStoreProduct } from "@/lib/store-products";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
const API_BASE = configuredApiBase || (
  typeof window !== "undefined" && window.location.hostname === "127.0.0.1" && window.location.port === "3000"
    ? "http://127.0.0.1:8788/api"
    : "/api"
);
const USER_ID_KEY = "putiyuan_userId";
const AUTH_KEY = "putiyuan_auth";
const ACCOUNT_NAME_KEY = "putiyuan_accountName";
const ACCOUNT_CREDENTIAL_PREFIX = "sycred_v2_";
const ACCOUNT_NAME_WORDS = [
  "善念", "善缘", "清愿", "静心", "福安", "明善", "莲心", "慈愿",
  "净缘", "慧安", "和善", "愿宁", "心灯", "善行", "福缘", "明愿",
  "清和", "慈心", "静愿", "安善", "莲愿", "慧缘", "念安", "善宁",
];

async function request<T = any>(
  method: string,
  path: string,
  body?: Record<string, any>,
): Promise<{ success: boolean; data?: T; message?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  const auth = getAuthInfo();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth?.sessionToken) headers["X-User-Token"] = auth.sessionToken;
  const opts: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${path}`, opts);
    const text = await res.text();
    let payload: { success: boolean; data?: T; message?: string } | null = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!payload) {
      return { success: false, message: "服务暂时不可用，请稍后重试" };
    }

    if (!res.ok && payload.success !== false) {
      return { success: false, message: payload.message || "服务暂时不可用，请稍后重试", data: payload.data };
    }

    return payload;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return { success: false, message: "请求超时，请稍后重试" };
    }
    return { success: false, message: "服务暂时不可用，请稍后重试" };
  } finally {
    clearTimeout(timer);
  }
}

function get<T = any>(path: string): Promise<{ success: boolean; data?: T; message?: string }> {
  return request<T>("GET", path);
}

function post<T = any>(path: string, body: Record<string, any>): Promise<{ success: boolean; data?: T; message?: string }> {
  return request<T>("POST", path, body);
}

function del<T = any>(path: string, body: Record<string, any>): Promise<{ success: boolean; data?: T; message?: string }> {
  return request<T>("DELETE", path, body);
}

// ========== 用户管理 ==========

let _cachedUserId: string | null = null;
let _creatingUser: Promise<string> | null = null;

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  if (_cachedUserId) return _cachedUserId;
  _cachedUserId = localStorage.getItem(USER_ID_KEY);
  return _cachedUserId;
}

function setUserId(id: string) {
  _cachedUserId = id;
  if (typeof window !== "undefined") localStorage.setItem(USER_ID_KEY, id);
}

function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function buildRandomAccountName(seed: string) {
  const hash = hashText(seed || `${Date.now()}-${Math.random()}`);
  const word = ACCOUNT_NAME_WORDS[hash % ACCOUNT_NAME_WORDS.length];
  const digits = String((Math.floor(hash / ACCOUNT_NAME_WORDS.length) % 9000) + 1000);
  return `${word}${digits}`;
}

function setAccountName(name: string) {
  if (typeof window !== "undefined") localStorage.setItem(ACCOUNT_NAME_KEY, name);
}

export function getAccountName(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(ACCOUNT_NAME_KEY);
  if (existing) return existing;

  const userId = getUserId();
  const generated = buildRandomAccountName(userId || `${Date.now()}-${Math.random()}`);
  setAccountName(generated);
  return generated;
}

export function getAuthInfo(): { phoneMasked?: string; sessionToken?: string; expiresAt?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

function setAuthInfo(input: { phoneMasked?: string; sessionToken?: string; expiresAt?: string }, replace = false) {
  if (typeof window === "undefined") return;
  const current = replace ? {} : (getAuthInfo() || {});
  localStorage.setItem(AUTH_KEY, JSON.stringify({ ...current, ...input }));
}

function clearLocalIdentity() {
  _cachedUserId = null;
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ACCOUNT_NAME_KEY);
}

function hasActiveDeviceSession() {
  const auth = getAuthInfo();
  if (!auth?.sessionToken || !auth.expiresAt) return false;
  const expiresAt = Date.parse(auth.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function extractCredential(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (value.startsWith(ACCOUNT_CREDENTIAL_PREFIX)) return value;

  try {
    const url = new URL(value);
    return url.searchParams.get("credential") || "";
  } catch {
    return "";
  }
}

export async function getAccountCredentialUrl() {
  const userId = await ensureUser();
  const result = await post<{ credential: string; expiresAt: string }>("/auth/credential/issue", { userId });
  if (!result.success || !result.data?.credential) {
    throw new Error(result.message || "账号凭证生成失败");
  }

  if (typeof window === "undefined") return result.data.credential;
  const url = new URL("/my", window.location.origin);
  url.searchParams.set("credential", result.data.credential);
  return url.toString();
}

export async function importAccountCredential(input: string) {
  const credential = extractCredential(input);
  if (!credential.startsWith(ACCOUNT_CREDENTIAL_PREFIX)) {
    return { success: false, message: "账号凭证格式不正确" };
  }

  const result = await post<{ userId: string; sessionToken: string; expiresAt: string }>("/auth/credential/recover", { credential });
  if (!result.success || !result.data?.userId || !result.data.sessionToken) {
    return { success: false, message: result.message || "账号凭证无法识别" };
  }

  setUserId(result.data.userId);
  setAccountName(buildRandomAccountName(result.data.userId));
  setAuthInfo({ sessionToken: result.data.sessionToken, expiresAt: result.data.expiresAt }, true);
  return { success: true, accountName: getAccountName() };
}

/** 确保当前设备持有服务端校验的匿名凭证。 */
export async function ensureUser(): Promise<string> {
  const existing = getUserId();
  if (existing && hasActiveDeviceSession()) return existing;
  if (_creatingUser) return _creatingUser;

  // 旧版本只保存 userId，无法安全证明归属，升级后不再继续信任该标识。
  if (existing) clearLocalIdentity();
  _creatingUser = post<{ userId: string; sessionToken: string; expiresAt: string }>("/user/anonymous", {}).then((res) => {
    if (res.success && res.data?.userId && res.data.sessionToken) {
      setUserId(res.data.userId);
      setAccountName(buildRandomAccountName(res.data.userId));
      setAuthInfo({ sessionToken: res.data.sessionToken, expiresAt: res.data.expiresAt }, true);
      return res.data.userId;
    }
    throw new Error(res.message || "无法创建匿名用户");
  }).finally(() => {
    _creatingUser = null;
  });

  return _creatingUser;
}
export async function sendSmsCode(phone: string) {
  const userId = await ensureUser();
  return post<{ phoneMasked: string; expiresIn: number }>("/auth/sms/send", { phone, userId });
}

export async function loginWithSms(phone: string, code: string) {
  const userId = await ensureUser();
  const res = await post<{ userId: string; sessionToken: string; expiresAt: string; phoneMasked: string; merged: boolean }>(
    "/auth/sms/login",
    { phone, code, userId },
  );
  if (res.success && res.data?.userId) {
    setUserId(res.data.userId);
    setAccountName(buildRandomAccountName(res.data.userId));
    setAuthInfo({
      phoneMasked: res.data.phoneMasked,
      sessionToken: res.data.sessionToken,
      expiresAt: res.data.expiresAt,
    }, true);
  }
  return res;
}

export async function bindPhone(phone: string) {
  const userId = await ensureUser();
  const res = await post<{ phoneMasked: string }>("/auth/phone/bind", { phone, userId });
  if (res.success && res.data?.phoneMasked) {
    setAuthInfo({ phoneMasked: res.data.phoneMasked });
  }
  return res;
}

// ========== 祈福供灯 ==========

export interface TrialInfo {
  active: boolean;
  startedAt: string;
  endsAt: string;
  daysTotal: number;
  daysRemaining: number;
}

export interface CreateBlessingInput {
  name: string;
  relation: string;
  lampType: string;
  duration: string;
  wish?: string;
  donorName?: string;
}

export async function createBlessing(input: CreateBlessingInput) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number; expiresAt?: string;
    preview: { lampType: string; duration: string; maskedName: string; maskedDonor: string };
    trial?: TrialInfo;
  }>("/blessing/create", { userId, ...input });
}

export async function getBlessingWall(page = 1, pageSize = 40) {
  const userId = await ensureUser();
  const res = await get<{ items: any[]; total: number; todayNew: number; myTotal: number; sevenDayFreeNextAt: string | null }>(
    `/blessing/wall?page=${page}&pageSize=${pageSize}&userId=${encodeURIComponent(userId)}`
  );
  return res;
}

// ========== 便利签心愿墙 ==========

export type WishCategory = "health" | "study" | "family" | "wealth" | "other";
export type WishColor = "amber" | "rose" | "jade" | "sky" | "lilac";
export type WishSort = "latest" | "popular";
export type WishReportReason = "abuse" | "privacy" | "illegal" | "other";

export type WishItem = {
  wishId: string;
  nickname: string;
  category: WishCategory;
  content: string;
  color: WishColor;
  likeCount: number;
  periodLikeCount: number;
  createdAt: string;
  isMine: boolean;
  isLiked: boolean;
};

export type WishListData = {
  items: WishItem[];
  total: number;
  page: number;
  pageSize: number;
  sort: WishSort;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
};

export async function getWishes(sort: WishSort = "latest", page = 1, pageSize = 18) {
  const userId = await ensureUser();
  return get<WishListData>(`/wishes?sort=${sort}&page=${page}&pageSize=${pageSize}&userId=${encodeURIComponent(userId)}`);
}

export async function createWish(input: { nickname: string; category: WishCategory; content: string; color?: WishColor }) {
  const userId = await ensureUser();
  return post<{ item: WishItem; monthlyLimit: number; monthlyUsed: number; monthlyRemaining: number }>("/wishes", { userId, ...input });
}

export async function deleteWish(wishId: string) {
  const userId = await ensureUser();
  return del<{ wishId: string; status: "deleted"; deletedAt: string }>(`/wishes/${encodeURIComponent(wishId)}`, { userId });
}

export async function toggleWishLike(wishId: string) {
  const userId = await ensureUser();
  return post<{ wishId: string; liked: boolean; likeCount: number }>(`/wishes/${encodeURIComponent(wishId)}/like`, { userId });
}

export async function reportWish(wishId: string, input: { reason: WishReportReason; detail?: string }) {
  const userId = await ensureUser();
  return post<{ wishId: string; reported: true; status: "received" }>(`/wishes/${encodeURIComponent(wishId)}/report`, { userId, ...input });
}

export interface IncenseOffering {
  incenseId: string;
  recordId: string;
  dedication: string;
  wish: string;
  amount: number;
  isFree: boolean;
  status: "pending_payment" | "burning" | "completed";
  startedAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export async function getIncenseStatus() {
  const userId = await ensureUser();
  return get<{ burningMinutes: number; hasFreeOffering: boolean; total: number; active: IncenseOffering[]; history: IncenseOffering[]; trial?: TrialInfo }>(
    `/incense/status?userId=${encodeURIComponent(userId)}`,
  );
}

export async function offerIncense(input: { dedication?: string; wish?: string }) {
  const userId = await ensureUser();
  return post<{ recordId: string; orderId: string | null; needsPayment: boolean; amount: number; burningMinutes: number; startedAt: string | null; endsAt: string | null; trial?: TrialInfo }>(
    "/incense/offer",
    { userId, ...input },
  );
}

// ========== 八字精批 ==========

export interface BaziInput {
  master: string; year: number; month: number; day: number; hour: string; gender: string;
}

export async function fortuneBazi(input: BaziInput) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number;
    preview: { bazi: string; dayMaster: string; summary: string };
    fullResult?: any; trial?: TrialInfo;
  }>("/fortune/bazi", { userId, ...input });
}

// ========== 求灵签 ==========

export async function fortuneDraw(master: string, question?: string) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number;
    preview: { lotNumber: number; level: string; shortVerse: string; masterName: string };
    fullResult?: any;
    quota?: QuotaItem;
    trial?: TrialInfo;
  }>("/fortune/draw", { userId, master, question });
}

// ========== 周公解梦 ==========

export async function fortuneDream(query: string) {
  const userId = await ensureUser();
  return post<{
    recordId: string; query: string;
    result: { title: string; level: string; interpretation: string };
    fullResult?: any;
  }>("/fortune/dream", { userId, query });
}

// ========== 手相/面相 ==========

export interface PalmistryInput {
  master: string; mode: "hand" | "face"; hand?: "left" | "right"; imageBase64?: string;
}

export async function fortunePalmistry(input: PalmistryInput) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number;
    preview: { summary: string; imageUrl: string };
    fullResult?: any; trial?: TrialInfo;
  }>("/fortune/palmistry", { userId, ...input });
}

export async function deletePalmistryImage(recordId: string) {
  const userId = await ensureUser();
  return post<{ recordId: string; imageDeleted: boolean }>("/fortune/palmistry-delete", { userId, recordId });
}

// ========== 宝宝起名 ==========

export interface NamingInput {
  mode: string; year: number; month: number; day: number; hour: string;
  gender: string; surname?: string; wordCount?: number; styles?: string[];
  beiFenZi?: string; avoidZi?: string; targetName?: string; compareNames?: string[];
}

export async function fortuneNaming(input: NamingInput) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number;
    preview: {
      bazi: string; wuxing: string;
      samples?: { name: string; reason: string }[];
      targetName?: string;
      evaluations?: { name: string; score: number; summary: string }[];
    };
      fullResult?: any;
    trial?: TrialInfo;
  }>("/fortune/naming", { userId, ...input });
}

// ========== 六爻占卜 ==========

export async function fortuneDivination(master: string, question?: string) {
  const userId = await ensureUser();
  return post<{
    recordId: string; orderId: string | null; needsPayment: boolean; amount: number;
    preview: { hexagram: string; lines: number[]; summary: string };
    fullResult?: any;
    quota?: QuotaItem;
    trial?: TrialInfo;
  }>("/fortune/divination", { userId, master, question });
}

// ========== 今日黄历 ==========

export interface AlmanacData {
  dateInfo: {
    date?: string;
    solar: string;
    weekday: string;
    lunar: string;
    ganzhi: string;
    zodiac: string;
    rating: string;
    ratingText: string;
  };
  yi: string[];
  ji: string[];
  shensha: { label: string; value: string; variant: "gold" | "vermillion" }[];
  hours: { shi: string; name: string; chong: string; yi?: string[]; ji?: string[] }[];
  weekDays: { day: string; lunar: string; rating: string; date: string }[];
  source?: { name: string; url: string; description?: string; fallback?: string };
}

export async function getAlmanacToday(date?: string) {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
  return get<AlmanacData>(`/almanac/today${suffix}`);
}

// ========== 记录查询 ==========

// ========== 意见反馈 ==========

export type FeedbackCategory = "suggestion" | "issue" | "content" | "service" | "other";

export type FeedbackItem = {
  feedbackId: string;
  category: FeedbackCategory;
  pagePath: string | null;
  content: string;
  contact: string | null;
  status: "received" | "reviewing" | "resolved";
  createdAt: string;
};

export async function submitFeedback(input: {
  category: FeedbackCategory;
  pagePath?: string;
  content: string;
  contact?: string;
  privacyConsent: boolean;
}) {
  const userId = await ensureUser();
  return post<FeedbackItem>("/feedback", { userId, ...input });
}
export async function getFeedback(page = 1, pageSize = 10) {
  const userId = await ensureUser();
  return get<{ items: FeedbackItem[]; total: number; page: number; pageSize: number }>(
    `/feedback?userId=${encodeURIComponent(userId)}&page=${page}&pageSize=${pageSize}`,
  );
}
export async function getRecords(page = 1, pageSize = 20) {
  const userId = await ensureUser();
  return get<{ items: any[]; total: number; page: number; pageSize: number }>(
    `/records?userId=${userId}&page=${page}&pageSize=${pageSize}`
  );
}

export async function getRecord(recordId: string) {
  const userId = await ensureUser();
  return get<any>(`/records/${recordId}?userId=${userId}`);
}

export async function recoverRecord(recordId: string) {
  const userId = await ensureUser();
  return get<any>(`/records/recover?recordId=${encodeURIComponent(recordId)}&userId=${encodeURIComponent(userId)}`);
}

// ========== 免费额度 / 用户概览 ==========

export interface QuotaItem {
  type: string;
  label: string;
  total: number;
  used: number;
  remaining: number;
  paidAmount: number;
  date?: string;
}

export async function getQuotaToday(type?: string) {
  const userId = await ensureUser();
  const suffix = type ? `&type=${encodeURIComponent(type)}` : "";
  return get<{ items: QuotaItem[]; date: string; trial?: TrialInfo }>(`/quota/today?userId=${userId}${suffix}`);
}

export async function getUserMe() {
  const userId = await ensureUser();
  return get<{ userId: string; stats: { records: number; paidRecords: number }; account?: { phoneMasked?: string } | null; quotas: QuotaItem[]; trial?: TrialInfo; date: string }>(`/user/me?userId=${userId}`);
}

// ========== 订单与支付 ==========

export async function createOrder(recordId: string, amount: number, type: string) {
  const userId = await ensureUser();
  return post<{ orderId: string; amount: number; status: string }>("/order/create", { userId, recordId, amount, type });
}

/** 兼容旧页面调用：付款统一交由已配置的外部商品页完成。 */
export async function payOrder(orderId: string) {
  return payOrderAndGetRecord(orderId) as any;
}

export async function getOrder(orderId: string) {
  const userId = await ensureUser();
  return get<{ orderId: string; recordId: string; type: string; amount: number; status: string; createdAt: string; paidAt?: string }>(`/order/${orderId}?userId=${userId}`);
}

export async function payOrderAndGetRecord(orderId: string) {
  const order = await getOrder(orderId);
  if (!order.success || !order.data) return order as any;

  const product = resolveStoreProduct(order.data.type, order.data.amount);
  if (!product) {
    return { success: false, message: "该服务暂未配置外部付款入口" } as any;
  }

  if (typeof window !== "undefined") {
    const checkout = new URL(product.url);
    checkout.searchParams.set("reference", orderId);
    window.location.assign(checkout.toString());
  }

  return {
    success: false,
    externalCheckout: true,
    message: "正在前往外部付款页面，请在付款完成后返回本站查看开通状态",
  } as any;
}

export async function exportPersonalData() {
  const userId = await ensureUser();
  return post<any>("/privacy/export", { userId });
}

export async function deletePersonalData() {
  const userId = await ensureUser();
  const result = await post<{ deletedAt: string }>("/privacy/delete-account", { userId, confirmed: true });
  if (result.success) clearLocalIdentity();
  return result;
}
