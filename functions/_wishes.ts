export const WISH_CATEGORIES = ["health", "study", "family", "wealth", "other"] as const;
export const WISH_COLORS = ["amber", "rose", "jade", "sky", "lilac"] as const;
export const WISH_STATUSES = ["visible", "hidden", "deleted"] as const;
export const REPORT_REASONS = ["abuse", "privacy", "illegal", "other"] as const;
export const REPORT_STATUSES = ["received", "reviewing", "resolved"] as const;

export type WishCategory = (typeof WISH_CATEGORIES)[number];
export type WishStatus = (typeof WISH_STATUSES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const WISH_LIMITS = {
  nickname: 12,
  content: 160,
  reportDetail: 240,
  monthly: 3,
};

// 第一版采用可维护的基础拦截词表。线上运营可在此集中增补，而服务端始终是最终校验点。
const BLOCKED_TERMS = [
  "裸聊", "约炮", "招嫖", "卖淫", "博彩", "网赌", "赌博", "毒品", "冰毒", "人肉搜索", "身份证号",
];

export function readWishText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function findBlockedWishTerm(value: string) {
  const normalized = value.toLocaleLowerCase();
  return BLOCKED_TERMS.find((term) => normalized.includes(term.toLocaleLowerCase())) || "";
}

export function pickWishColor(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return WISH_COLORS[Math.abs(hash >>> 0) % WISH_COLORS.length];
}

export function monthStartInChina(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value || now.getUTCFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value || now.getUTCMonth() + 1);
  // 中国自然月 00:00 对应 UTC 的前一天 16:00。
  return new Date(Date.UTC(year, month - 1, 1, -8)).toISOString();
}

export function toWishItem(row: any) {
  return {
    wishId: row.id,
    nickname: row.nickname_masked,
    category: row.category,
    content: row.content,
    color: WISH_COLORS.includes(row.color) ? row.color : "amber",
    likeCount: Number(row.like_count || 0),
    periodLikeCount: Number(row.period_like_count || 0),
    createdAt: row.created_at,
    isMine: Boolean(row.is_mine),
    isLiked: Boolean(row.is_liked),
  };
}
