"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ADMIN_KEY_STORAGE = "shanyuan_admin_feedback_key";
const ADMIN_API_BASE =
  typeof window !== "undefined" && window.location.hostname === "127.0.0.1" && window.location.port === "3000"
    ? "http://127.0.0.1:8788/api/admin/feedback"
    : "/api/admin/feedback";

const CATEGORY_OPTIONS = [
  ["", "全部类型"],
  ["suggestion", "功能建议"],
  ["issue", "问题报告"],
  ["content", "内容纠错"],
  ["service", "服务咨询"],
  ["other", "其他"],
] as const;

const STATUS_OPTIONS = [
  ["", "全部状态"],
  ["received", "待查看"],
  ["reviewing", "处理中"],
  ["resolved", "已处理"],
] as const;

type FeedbackStatus = "received" | "reviewing" | "resolved";
type FeedbackCategory = Exclude<(typeof CATEGORY_OPTIONS)[number][0], "">;

type AdminFeedback = {
  feedbackId: string;
  userId: string;
  category: FeedbackCategory;
  pagePath: string | null;
  content: string;
  contact: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
};

type FeedbackResponse = {
  items: AdminFeedback[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<FeedbackStatus, number>;
};

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  suggestion: "功能建议",
  issue: "问题报告",
  content: "内容纠错",
  service: "服务咨询",
  other: "其他",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  received: "待查看",
  reviewing: "处理中",
  resolved: "已处理",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function maskUserId(userId: string) {
  return `匿名账号 · ${userId.slice(-8) || "未知"}`;
}

async function requestAdmin<T>(
  key: string,
  method: "GET" | "POST",
  query?: URLSearchParams,
  body?: Record<string, string>,
): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const url = `${ADMIN_API_BASE}${query && query.size ? `?${query.toString()}` : ""}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": key,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => null);
    if (!payload || !response.ok || !payload.success) {
      return { success: false, message: payload?.message || "请求未完成，请稍后再试" };
    }
    return payload;
  } catch {
    return { success: false, message: "管理服务暂时不可用，请检查本地服务是否启动" };
  }
}

export default function FeedbackAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [counts, setCounts] = useState<Record<FeedbackStatus, number>>({ received: 0, reviewing: 0, resolved: 0 });
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");

  const requestQuery = useMemo(() => {
    const query = new URLSearchParams({ page: "1", pageSize: "30" });
    if (statusFilter) query.set("status", statusFilter);
    if (categoryFilter) query.set("category", categoryFilter);
    if (appliedKeyword.trim()) query.set("keyword", appliedKeyword.trim());
    return query;
  }, [statusFilter, categoryFilter, appliedKeyword]);

  const loadFeedback = async (key: string, query = requestQuery) => {
    setLoading(true);
    const result = await requestAdmin<FeedbackResponse>(key, "GET", query);
    setLoading(false);
    if (!result.success || !result.data) {
      setMessage(result.message || "无法读取反馈记录");
      if (result.message?.includes("密钥")) {
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        setAuthenticated(false);
      }
      return false;
    }

    setItems(result.data.items || []);
    setCounts(result.data.counts || { received: 0, reviewing: 0, resolved: 0 });
    setTotal(result.data.total || 0);
    setMessage("");
    return true;
  };

  useEffect(() => {
    const savedKey = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (!savedKey) return;
    setAdminKey(savedKey);
    loadFeedback(savedKey).then((success) => setAuthenticated(success));
  }, []);

  useEffect(() => {
    if (!authenticated || !adminKey) return;
    loadFeedback(adminKey).catch(() => undefined);
  }, [authenticated, statusFilter, categoryFilter, appliedKeyword]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminKey.trim()) {
      setMessage("请输入管理员访问密钥");
      return;
    }
    const success = await loadFeedback(adminKey.trim(), new URLSearchParams({ page: "1", pageSize: "30" }));
    if (success) {
      sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
      setAuthenticated(true);
    }
  };

  const applySearch = () => setAppliedKeyword(keyword);

  const updateStatus = async (feedbackId: string, status: FeedbackStatus) => {
    setUpdatingId(feedbackId);
    const result = await requestAdmin<AdminFeedback>(adminKey, "POST", undefined, { feedbackId, status });
    setUpdatingId("");
    if (!result.success || !result.data) {
      setMessage(result.message || "状态更新失败");
      return;
    }

    setItems((current) => current.map((item) => item.feedbackId === feedbackId ? result.data as AdminFeedback : item));
    setCounts((current) => {
      const original = items.find((item) => item.feedbackId === feedbackId);
      if (!original || original.status === status) return current;
      return {
        ...current,
        [original.status]: Math.max(0, current[original.status] - 1),
        [status]: current[status] + 1,
      };
    });
    setMessage("处理状态已更新");
  };

  const logout = () => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setAuthenticated(false);
    setItems([]);
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-[#0b100d] px-4 py-8 text-[#ded5bd] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#6e5832]/50 pb-5">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#bda66f]">SHANYUAN PAVILION</p>
            <h1 className="mt-2 font-display text-3xl text-[#e7cd87]">善缘阁 · 反馈管理</h1>
          </div>
          <Link href="/" className="rounded-md border border-[#7f693d] px-4 py-2 text-sm text-[#d8c89e] transition hover:border-[#d4b66f] hover:text-[#f1dfae]">
            返回网站
          </Link>
        </header>

        {!authenticated ? (
          <section className="mx-auto max-w-lg border border-[#6e5832] bg-[#131a14]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:p-8">
            <p className="text-sm leading-7 text-[#a89f86]">此页不在用户导航中。请输入服务端配置的管理员访问密钥后再查看客户反馈。</p>
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block text-sm text-[#d9cba7]">
                管理员访问密钥
                <input
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-md border border-[#665432] bg-[#0b100d] px-3 py-3 text-[#efe6ce] outline-none transition focus:border-[#d3b773]"
                  placeholder="输入访问密钥"
                />
              </label>
              {message && <p className="text-sm text-[#d89478]">{message}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-md bg-[#a9473f] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c0554d] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "验证中..." : "进入反馈管理"}
              </button>
            </form>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#665432] bg-[#131a14]/90 p-4">
              <div>
                <p className="text-sm text-[#d9cba7]">当前共 {total} 条符合条件的反馈</p>
                <p className="mt-1 text-xs text-[#92886f]">管理员密钥仅保存在本次浏览器会话中。</p>
              </div>
              <button type="button" onClick={logout} className="rounded-md border border-[#665432] px-3 py-2 text-xs text-[#c9ba96] transition hover:border-[#cfae68] hover:text-[#f1dfae]">退出管理</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(["received", "reviewing", "resolved"] as FeedbackStatus[]).map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(statusFilter === status ? "" : status)} className={`border p-4 text-left transition ${statusFilter === status ? "border-[#d3b773] bg-[#2a3328]" : "border-[#665432] bg-[#131a14]/90 hover:border-[#9b824d]"}`}>
                  <p className="text-xs text-[#a99e82]">{STATUS_LABELS[status]}</p>
                  <p className="mt-1 font-display text-2xl text-[#e7cd87]">{counts[status] || 0}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 border border-[#665432] bg-[#131a14]/90 p-4 md:grid-cols-[170px_170px_1fr_auto]">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd] outline-none focus:border-[#d3b773]">
                {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-md border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd] outline-none focus:border-[#d3b773]">
                {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applySearch(); }} className="rounded-md border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd] outline-none focus:border-[#d3b773]" placeholder="搜索反馈内容、联系方式或页面路径" />
              <button type="button" onClick={applySearch} className="rounded-md border border-[#9b824d] px-4 py-2.5 text-sm text-[#e7cd87] transition hover:border-[#d3b773]">查询</button>
            </div>

            {message && <p className="text-sm text-[#d8b47e]">{message}</p>}
            {loading ? (
              <div className="border border-[#665432] py-12 text-center text-sm text-[#9e947c]">正在读取反馈...</div>
            ) : items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <article key={item.feedbackId} className="border border-[#665432] bg-[#131a14]/90 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-display text-xl text-[#e4c77f]">{CATEGORY_LABELS[item.category]}</p>
                        <p className="text-xs text-[#9f957d]">{formatTime(item.createdAt)} · {maskUserId(item.userId)}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[#ab9f82]">
                        处理状态
                        <select value={item.status} disabled={updatingId === item.feedbackId} onChange={(event) => updateStatus(item.feedbackId, event.target.value as FeedbackStatus)} className="rounded-md border border-[#665432] bg-[#0b100d] px-2 py-1.5 text-sm text-[#ded5bd] outline-none focus:border-[#d3b773] disabled:opacity-60">
                          {STATUS_OPTIONS.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#d6cdb6]">{item.content}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#53462d] pt-3 text-xs text-[#9f957d]">
                      <span>相关页面：{item.pagePath || "未指定"}</span>
                      {item.contact && <span>联系方式：{item.contact}</span>}
                      {item.updatedAt !== item.createdAt && <span>最后更新：{formatTime(item.updatedAt)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#665432] py-14 text-center text-sm text-[#9e947c]">暂时没有符合条件的反馈。</div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}