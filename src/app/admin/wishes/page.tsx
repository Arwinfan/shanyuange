"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "shanyuan_admin_wishes_key";
const ADMIN_API_BASE = typeof window !== "undefined" && window.location.hostname === "127.0.0.1" && window.location.port === "3000"
  ? "http://127.0.0.1:8788/api/admin/wishes"
  : "/api/admin/wishes";

type ReportStatus = "received" | "reviewing" | "resolved";
type NoteStatus = "visible" | "hidden" | "deleted";
type AdminWish = {
  reportId: string;
  reportStatus: ReportStatus;
  reportReason: string;
  reportDetail: string | null;
  reportedAt: string;
  reportUpdatedAt: string;
  wishId: string;
  userId: string;
  nickname: string;
  category: string;
  content: string;
  color: string;
  noteStatus: NoteStatus;
  likeCount: number;
  createdAt: string;
};

type ResponseData = { items: AdminWish[]; total: number; page: number; pageSize: number; counts: Record<ReportStatus, number> };

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = { received: "待查看", reviewing: "处理中", resolved: "已处理" };
const NOTE_STATUS_LABELS: Record<NoteStatus, string> = { visible: "公开", hidden: "已隐藏", deleted: "用户删除" };
const REASON_LABELS: Record<string, string> = { abuse: "骚扰攻击", privacy: "隐私泄露", illegal: "违法违规", other: "其他" };

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间未知" : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

async function request<T>(key: string, method: "GET" | "POST", query?: URLSearchParams, body?: Record<string, string>) {
  try {
    const response = await fetch(`${ADMIN_API_BASE}${query?.size ? `?${query.toString()}` : ""}`, { method, headers: { "Content-Type": "application/json", "X-Admin-Key": key }, body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json().catch(() => null);
    return payload && response.ok && payload.success ? payload as { success: true; data: T } : { success: false as const, message: payload?.message || "请求未完成，请稍后再试" };
  } catch {
    return { success: false as const, message: "管理服务暂时不可用，请稍后再试" };
  }
}

export default function WishesAdminPage() {
  const [key, setKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [items, setItems] = useState<AdminWish[]>([]);
  const [counts, setCounts] = useState<Record<ReportStatus, number>>({ received: 0, reviewing: 0, resolved: 0 });
  const [total, setTotal] = useState(0);
  const [reportStatus, setReportStatus] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState("");
  const [message, setMessage] = useState("");

  const query = useMemo(() => {
    const value = new URLSearchParams({ page: "1", pageSize: "30" });
    if (reportStatus) value.set("reportStatus", reportStatus);
    if (noteStatus) value.set("noteStatus", noteStatus);
    if (appliedKeyword) value.set("keyword", appliedKeyword);
    return value;
  }, [reportStatus, noteStatus, appliedKeyword]);

  const load = async (adminKey: string, nextQuery = query) => {
    setLoading(true);
    const result = await request<ResponseData>(adminKey, "GET", nextQuery);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message || "无法读取举报记录");
      if (result.message?.includes("密钥")) { sessionStorage.removeItem(STORAGE_KEY); setAuthenticated(false); }
      return false;
    }
    setItems(result.data.items || []);
    setCounts(result.data.counts || { received: 0, reviewing: 0, resolved: 0 });
    setTotal(result.data.total || 0);
    setMessage("");
    return true;
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    setKey(saved);
    void load(saved).then(setAuthenticated);
  }, []);
  useEffect(() => { if (authenticated && key) void load(key); }, [authenticated, query]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!key.trim()) { setMessage("请输入管理员访问密钥"); return; }
    const valid = await load(key.trim(), new URLSearchParams({ page: "1", pageSize: "30" }));
    if (valid) { sessionStorage.setItem(STORAGE_KEY, key.trim()); setAuthenticated(true); }
  };

  const update = async (item: AdminWish, action: "setNoteStatus" | "setReportStatus", status: string) => {
    setUpdating(`${action}:${item.wishId}:${item.reportId}`);
    const body: Record<string, string> = action === "setNoteStatus" ? { action, wishId: item.wishId, status } : { action, reportId: item.reportId, status };
    const result = await request<{ status: string }>(key, "POST", undefined, body);
    setUpdating("");
    if (!result.success) { setMessage(result.message || "更新失败"); return; }
    setItems((current) => current.map((entry) => entry.reportId === item.reportId ? { ...entry, ...(action === "setNoteStatus" ? { noteStatus: status as NoteStatus } : { reportStatus: status as ReportStatus }) } : entry));
    setMessage("状态已更新");
  };

  const logout = () => { sessionStorage.removeItem(STORAGE_KEY); setKey(""); setAuthenticated(false); setItems([]); setMessage(""); };

  return <main className="min-h-screen bg-[#0b100d] px-4 py-8 text-[#ded5bd] sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl"><header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#6e5832]/50 pb-5"><div><p className="text-xs tracking-[0.22em] text-[#bda66f]">SHANYUAN PAVILION</p><h1 className="mt-2 font-display text-3xl text-[#e7cd87]">善缘阁 · 心愿墙管理</h1></div><Link href="/" className="border border-[#7f693d] px-4 py-2 text-sm text-[#d8c89e] transition hover:border-[#d4b66f]">返回网站</Link></header>{!authenticated ? <section className="mx-auto max-w-lg border border-[#6e5832] bg-[#131a14]/90 p-6 sm:p-8"><p className="text-sm leading-7 text-[#a89f86]">此页不在用户导航中。输入服务端配置的管理员访问密钥后，可处理便利签举报与内容状态。</p><form onSubmit={login} className="mt-6 space-y-4"><label className="block text-sm text-[#d9cba7]">管理员访问密钥<input value={key} onChange={(event) => setKey(event.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full border border-[#665432] bg-[#0b100d] px-3 py-3 text-[#efe6ce] outline-none focus:border-[#d3b773]" placeholder="输入访问密钥" /></label>{message ? <p className="text-sm text-[#d89478]">{message}</p> : null}<button type="submit" disabled={loading} className="w-full bg-[#a9473f] px-4 py-3 text-sm text-white disabled:opacity-60">{loading ? "验证中…" : "进入心愿墙管理"}</button></form></section> : <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3 border border-[#665432] bg-[#131a14]/90 p-4"><div><p className="text-sm text-[#d9cba7]">当前共 {total} 条符合条件的举报</p><p className="mt-1 text-xs text-[#92886f]">管理密钥仅保存在本次浏览器会话中。</p></div><button type="button" onClick={logout} className="border border-[#665432] px-3 py-2 text-xs text-[#c9ba96]">退出管理</button></div><div className="grid gap-3 sm:grid-cols-3">{(["received", "reviewing", "resolved"] as ReportStatus[]).map((status) => <button key={status} type="button" onClick={() => setReportStatus(reportStatus === status ? "" : status)} className={`border p-4 text-left ${reportStatus === status ? "border-[#d3b773] bg-[#2a3328]" : "border-[#665432] bg-[#131a14]/90"}`}><p className="text-xs text-[#a99e82]">{REPORT_STATUS_LABELS[status]}</p><p className="mt-1 font-display text-2xl text-[#e7cd87]">{counts[status] || 0}</p></button>)}</div><div className="grid gap-3 border border-[#665432] bg-[#131a14]/90 p-4 md:grid-cols-[170px_170px_1fr_auto]"><select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)} className="border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd]"><option value="">全部举报状态</option>{Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={noteStatus} onChange={(event) => setNoteStatus(event.target.value)} className="border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd]"><option value="">全部内容状态</option>{Object.entries(NOTE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setAppliedKeyword(keyword.trim()); }} className="border border-[#665432] bg-[#0b100d] px-3 py-2.5 text-sm text-[#ded5bd]" placeholder="搜索昵称、心愿或举报说明" /><button type="button" onClick={() => setAppliedKeyword(keyword.trim())} className="border border-[#9b824d] px-4 py-2.5 text-sm text-[#e7cd87]">查询</button></div>{message ? <p className="text-sm text-[#d8b47e]">{message}</p> : null}{loading ? <div className="border border-[#665432] py-12 text-center text-sm text-[#9e947c]">正在读取举报…</div> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.reportId} className="border border-[#665432] bg-[#131a14]/90 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-xl text-[#e4c77f]">{item.nickname} · {item.category}</p><p className="mt-1 text-xs text-[#9f957d]">便利签发布于 {formatTime(item.createdAt)} · 举报于 {formatTime(item.reportedAt)}</p></div><div className="flex flex-wrap gap-2"><label className="text-xs text-[#ab9f82]">内容<select value={item.noteStatus} disabled={item.noteStatus === "deleted" || updating.startsWith("setNoteStatus")} onChange={(event) => void update(item, "setNoteStatus", event.target.value)} className="ml-2 border border-[#665432] bg-[#0b100d] px-2 py-1.5 text-sm text-[#ded5bd]">{item.noteStatus === "deleted" ? <option value="deleted">用户删除</option> : <><option value="visible">公开</option><option value="hidden">隐藏</option></>}</select></label><label className="text-xs text-[#ab9f82]">举报<select value={item.reportStatus} disabled={updating.startsWith("setReportStatus")} onChange={(event) => void update(item, "setReportStatus", event.target.value)} className="ml-2 border border-[#665432] bg-[#0b100d] px-2 py-1.5 text-sm text-[#ded5bd]">{Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#d6cdb6]">{item.content}</p><div className="mt-4 border-t border-[#53462d] pt-3 text-xs text-[#9f957d]"><span>举报原因：{REASON_LABELS[item.reportReason] || "其他"}</span>{item.reportDetail ? <p className="mt-2">补充说明：{item.reportDetail}</p> : null}<p className="mt-2">发布账号：匿名账号 · {item.userId.slice(-8)}</p></div></article>)}</div> : <div className="border border-dashed border-[#665432] py-14 text-center text-sm text-[#9e947c]">暂时没有符合条件的举报。</div>}</section>}</div></main>;
}
