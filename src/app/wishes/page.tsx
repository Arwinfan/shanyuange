"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createWish,
  deleteWish,
  getWishes,
  reportWish,
  toggleWishLike,
  type WishCategory,
  type WishColor,
  type WishItem,
  type WishReportReason,
  type WishSort,
} from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

const CATEGORIES: { value: WishCategory; label: string; mark: string }[] = [
  { value: "health", label: "平安健康", mark: "安" },
  { value: "study", label: "学业事业", mark: "进" },
  { value: "family", label: "感情家庭", mark: "和" },
  { value: "wealth", label: "财富生活", mark: "丰" },
  { value: "other", label: "其他心愿", mark: "愿" },
];

const REPORT_REASONS: { value: WishReportReason; label: string }[] = [
  { value: "abuse", label: "骚扰、攻击或不友善内容" },
  { value: "privacy", label: "包含个人隐私信息" },
  { value: "illegal", label: "违法、违规或不当信息" },
  { value: "other", label: "其他原因" },
];

const NOTE_STYLES: Record<WishItem["color"], { background: string; text: string }> = {
  amber: { background: "#edcf75", text: "#493817" },
  rose: { background: "#e7ada1", text: "#542f2b" },
  jade: { background: "#aed1b4", text: "#294639" },
  sky: { background: "#a8cdd8", text: "#29414a" },
  lilac: { background: "#cfbfdc", text: "#453553" },
};

const NOTE_COLOR_OPTIONS: { value: WishColor; label: string }[] = [
  { value: "amber", label: "暖金" },
  { value: "rose", label: "桃粉" },
  { value: "jade", label: "青玉" },
  { value: "sky", label: "天青" },
  { value: "lilac", label: "淡紫" },
];

type ScatterLayout = {
  width: number;
  left: number;
  top: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

type DragPosition = Pick<ScatterLayout, "left" | "top">;

type DragSession = DragPosition & {
  wishId: string;
  pointerId: number;
  startX: number;
  startY: number;
  maxLeft: number;
  maxTop: number;
};

function hashWishId(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, salt: number) {
  let value = (seed + Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4_294_967_296;
}

function getScatterColumns(wallWidth: number) {
  if (wallWidth < 640) return 1;
  if (wallWidth < 900) return 2;
  if (wallWidth < 1_200) return 3;
  if (wallWidth < 1_500) return 4;
  return 5;
}

function calculateScatterLayout(wishId: string, index: number, measuredWallWidth: number): ScatterLayout {
  const wallWidth = measuredWallWidth || 1_000;
  const compact = wallWidth < 640;
  const columns = getScatterColumns(wallWidth);
  const seed = hashWishId(wishId);
  const width = compact
    ? Math.min(336, Math.max(248, wallWidth * (0.77 + seededUnit(seed, 0) * 0.08)))
    : Math.min(304, Math.max(206, wallWidth / (columns + 0.48) * (0.94 + seededUnit(seed, 0) * 0.1)));
  const horizontalRoom = Math.max(16, wallWidth - width - 16);
  const lane = index % columns;
  const band = Math.floor(index / columns);
  const baseLeft = columns === 1 ? horizontalRoom / 2 : horizontalRoom * lane / (columns - 1);
  const horizontalJitter = compact
    ? (seededUnit(seed, 1) - 0.5) * Math.min(58, wallWidth * 0.13)
    : (seededUnit(seed, 1) - 0.5) * Math.min(width * 0.72, horizontalRoom / Math.max(1, columns - 1));
  const bandHeight = compact ? 292 : 276;
  const verticalJitter = (seededUnit(seed, 2) - 0.5) * (compact ? 56 : 84);

  return {
    width,
    left: Math.min(Math.max(8, baseLeft + horizontalJitter), horizontalRoom + 8),
    top: Math.max(8, band * bandHeight + verticalJitter + 24),
    rotation: (seededUnit(seed, 3) - 0.5) * (compact ? 3.2 : 4.6),
    scale: 0.97 + seededUnit(seed, 4) * 0.06,
    zIndex: 1 + Math.floor(seededUnit(seed, 5) * 6),
  };
}

function getScatterWallHeight(itemCount: number, measuredWallWidth: number) {
  const wallWidth = measuredWallWidth || 1_000;
  const compact = wallWidth < 640;
  const columns = getScatterColumns(wallWidth);
  const rows = Math.ceil(itemCount / columns);
  return Math.max(compact ? 520 : 500, rows * (compact ? 292 : 276) + 360);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60 * 60 * 1000) return `${Math.max(1, Math.floor(elapsed / 60_000))} 分钟前`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 3_600_000)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
}

function categoryLabel(category: WishCategory) {
  return CATEGORIES.find((item) => item.value === category)?.label || "其他心愿";
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.8 8.6c0 5.2-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.6C3.2 6 5.2 4 7.8 4c1.7 0 3.2.9 4.2 2.2C13 4.9 14.5 4 16.2 4c2.6 0 4.6 2 4.6 4.6Z" /></svg>;
}

export default function WishesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sort, setSort] = useState<WishSort>("latest");
  const [items, setItems] = useState<WishItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [monthlyRemaining, setMonthlyRemaining] = useState(3);
  const [monthlyLimit, setMonthlyLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState<WishCategory>("health");
  const [color, setColor] = useState<WishColor>("amber");
  const [content, setContent] = useState("");
  const [reportTarget, setReportTarget] = useState<WishItem | null>(null);
  const [reportReason, setReportReason] = useState<WishReportReason>("abuse");
  const [reportDetail, setReportDetail] = useState("");
  const [reporting, setReporting] = useState(false);
  const [activeWishId, setActiveWishId] = useState<string | null>(null);
  const [draggingWishId, setDraggingWishId] = useState<string | null>(null);
  const [draggedPositions, setDraggedPositions] = useState<Record<string, DragPosition>>({});
  const [wallWidth, setWallWidth] = useState(0);
  const wallRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);

  const load = useCallback(async (nextSort: WishSort, nextPage: number, replace = false) => {
    replace ? setLoading(true) : setLoadingMore(true);
    const result = await getWishes(nextSort, nextPage);
    if (!result.success || !result.data) {
      setMessage(result.message || "心愿墙暂时无法读取，请稍后再试");
      replace ? setLoading(false) : setLoadingMore(false);
      return;
    }
    setItems((current) => replace ? result.data!.items : [...current, ...result.data!.items]);
    setPage(result.data.page);
    setHasMore(result.data.page * result.data.pageSize < result.data.total);
    setMonthlyRemaining(result.data.monthlyRemaining);
    setMonthlyLimit(result.data.monthlyLimit);
    setMessage("");
    replace ? setLoading(false) : setLoadingMore(false);
  }, []);

  useEffect(() => { void load("latest", 1, true); }, [load]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    const syncWallWidth = () => {
      const nextWidth = Math.round(wall.clientWidth);
      setWallWidth((current) => current === nextWidth ? current : nextWidth);
    };

    syncWallWidth();
    const observer = new ResizeObserver(syncWallWidth);
    observer.observe(wall);
    return () => observer.disconnect();
  }, [items.length, loading]);

  const changeSort = (nextSort: WishSort) => {
    if (nextSort === sort) return;
    setSort(nextSort);
    void load(nextSort, 1, true);
  };

  const submitWish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const result = await createWish({ nickname, category, content, color });
    setSubmitting(false);
    if (!result.success || !result.data) {
      setMessage(result.message || "发布失败，请稍后再试");
      return;
    }
    setNickname("");
    setContent("");
    setColor("amber");
    setMonthlyRemaining(result.data.monthlyRemaining);
    setMonthlyLimit(result.data.monthlyLimit);
    setCreateOpen(false);
    setMessage("便利签已贴上心愿墙，愿你所愿皆有回响。");
    if (sort === "latest") setItems((current) => [result.data!.item, ...current]);
  };

  const likeWish = async (wishId: string) => {
    const previous = items.find((item) => item.wishId === wishId);
    if (!previous) return;
    setItems((current) => current.map((item) => item.wishId === wishId ? { ...item, isLiked: !item.isLiked, likeCount: Math.max(0, item.likeCount + (item.isLiked ? -1 : 1)) } : item));
    const result = await toggleWishLike(wishId);
    if (!result.success || !result.data) {
      setItems((current) => current.map((item) => item.wishId === wishId ? previous : item));
      setMessage(result.message || "点赞未完成，请稍后再试");
      return;
    }
    setItems((current) => current.map((item) => item.wishId === wishId ? { ...item, isLiked: result.data!.liked, likeCount: result.data!.likeCount } : item));
  };

  const removeWish = async (wish: WishItem) => {
    if (!window.confirm("删除后无法恢复，确定要移除这张便利签吗？")) return;
    const result = await deleteWish(wish.wishId);
    if (!result.success) {
      setMessage(result.message || "删除未完成，请稍后再试");
      return;
    }
    setItems((current) => current.filter((item) => item.wishId !== wish.wishId));
    setMessage("便利签已移除。");
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportTarget) return;
    setReporting(true);
    const result = await reportWish(reportTarget.wishId, { reason: reportReason, detail: reportDetail });
    setReporting(false);
    if (!result.success) {
      setMessage(result.message || "举报提交失败，请稍后再试");
      return;
    }
    setReportTarget(null);
    setReportDetail("");
    setMessage("举报已提交，管理员会尽快处理。");
  };

  return (
    <main
      className="min-h-screen bg-[#151b12] px-4 pb-16 pt-20 text-paper sm:px-6 lg:px-10 lg:pt-12"
      style={{
        backgroundImage: "linear-gradient(180deg, rgba(9, 14, 9, 0.18) 0%, rgba(12, 17, 10, 0.36) 100%), url('/images/wish-wall-backdrop-v1.png')",
        backgroundAttachment: "fixed, fixed",
        backgroundPosition: "center, center",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
      }}
    >
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gold/15 bg-xuan/95 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="flex items-center gap-2"><img src="/images/shanyuange-logo-v3.png" alt="善缘阁" className="size-8" /><span className="font-display text-lg tracking-[0.15em] text-gold">善缘阁</span></Link>
        <div className="flex items-center gap-1.5"><MusicButton /><AccountButton /><InstallAppButton /><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "关闭导航" : "打开导航"} className="inline-flex size-9 items-center justify-center rounded-full border border-gold/25 text-paper-dark"><span className="text-lg leading-none">{menuOpen ? "×" : "☰"}</span></button></div>
      </header>
      {menuOpen ? <nav className="fixed inset-x-0 top-16 z-40 grid grid-cols-2 gap-1 border-b border-gold/15 bg-xuan/95 px-4 py-3 backdrop-blur-md lg:hidden" aria-label="移动端功能导航">{[["/wishes", "便利签心愿墙"], ["/qifu", "祈愿供灯"], ["/almanac", "今日通胜"], ["/lottery", "灵签解读"], ["/bazi", "八字精批"], ["/my", "我的记录"]].map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-paper-dark/75 hover:bg-gold/10 hover:text-gold">{label}</Link>)}</nav> : null}

      <div className="mx-auto w-full max-w-none">
        <section className="flex flex-col gap-6 border-b border-gold/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold/75">WISH NOTES</p>
            <h1 className="mt-3 font-display text-4xl tracking-[0.08em] text-gold-light sm:text-5xl">便利签心愿墙</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-paper-dark/70">把此刻想说的话贴在这里。陌生人的善意会路过，但你的隐私请留在自己手里。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 border border-gold/20 bg-black/15 p-3 sm:p-4">
            <div className="px-1 text-sm text-paper-dark/75"><span className="font-display text-lg text-gold-light">本月还可发布 <b className="mx-1 text-2xl text-gold">{monthlyRemaining}</b> 张</span><p className="mt-1 text-xs text-paper-dark/45">每月最多 {monthlyLimit} 张</p></div>
            <button type="button" onClick={() => setCreateOpen(true)} disabled={monthlyRemaining <= 0} className="bg-vermillion px-5 py-3 text-sm font-medium text-paper transition hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-50">{monthlyRemaining <= 0 ? "本月便利签已用完" : "写一张心愿"}</button>
          </div>
        </section>

        {message ? <p role="status" className="mt-5 text-sm text-gold-light">{message}</p> : null}

        <section className="py-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gold/15 pb-4">
            <div><h2 className="font-display text-2xl text-gold-light">大家的心愿</h2><p className="mt-1 text-xs text-paper-dark/45">轻轻读过，也轻轻祝福。拖动便签，把心愿贴在你喜欢的位置。</p></div>
            <div className="flex border border-gold/20 p-1 text-sm">{(["latest", "popular"] as WishSort[]).map((value) => <button key={value} type="button" onClick={() => changeSort(value)} className={`px-4 py-2 transition ${sort === value ? "bg-gold/20 text-gold-light" : "text-paper-dark/60 hover:text-paper"}`}>{value === "latest" ? "最新" : "本月热门"}</button>)}</div>
          </div>

          {loading ? <div className="py-20 text-center text-sm text-paper-dark/55">心愿正在慢慢汇集…</div> : items.length ? (
            <div
              ref={wallRef}
              className="relative mt-6 overflow-visible"
              style={{ minHeight: `${getScatterWallHeight(items.length, wallWidth)}px` }}
            >
              {items.map((wish, index) => {
                const note = NOTE_STYLES[wish.color];
                const scatter = calculateScatterLayout(wish.wishId, index, wallWidth);
                const notePosition = draggedPositions[wish.wishId] || { left: scatter.left, top: scatter.top };
                const isActive = activeWishId === wish.wishId;
                const isDragging = draggingWishId === wish.wishId;
                const baseZIndex = wish.isMine ? 100 + scatter.zIndex : scatter.zIndex;
                const raisedZIndex = wish.isMine ? 200 : 50;
                return <article
                  key={wish.wishId}
                  data-wish-id={wish.wishId}
                  data-scatter-left={notePosition.left.toFixed(1)}
                  data-scatter-top={notePosition.top.toFixed(1)}
                  className={`absolute isolate flex min-h-[15.5rem] flex-col overflow-visible px-6 pb-5 pt-6 shadow-[0_18px_34px_rgba(0,0,0,0.22)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_30px_56px_rgba(0,0,0,0.48)] focus-within:shadow-[0_30px_56px_rgba(0,0,0,0.48)] ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  onMouseEnter={() => setActiveWishId(wish.wishId)}
                  onMouseMove={() => setActiveWishId(wish.wishId)}
                  onMouseLeave={() => setActiveWishId((current) => current === wish.wishId && dragRef.current?.wishId !== wish.wishId ? null : current)}
                  onPointerEnter={() => setActiveWishId(wish.wishId)}
                  onPointerLeave={() => setActiveWishId((current) => current === wish.wishId && dragRef.current?.wishId !== wish.wishId ? null : current)}
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (event.button !== 0 || target.closest("button, a, input, textarea, select, label")) return;
                    const wallHeight = getScatterWallHeight(items.length, wallWidth);
                    const card = event.currentTarget;
                    event.preventDefault();
                    card.setPointerCapture(event.pointerId);
                    dragRef.current = {
                      wishId: wish.wishId,
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      left: notePosition.left,
                      top: notePosition.top,
                      maxLeft: Math.max(8, (wallWidth || 1_000) - scatter.width - 8),
                      maxTop: Math.max(8, wallHeight - card.offsetHeight + 8),
                    };
                    setActiveWishId(wish.wishId);
                    setDraggingWishId(wish.wishId);
                  }}
                  onPointerMove={(event) => {
                    const drag = dragRef.current;
                    if (!drag || drag.wishId !== wish.wishId || drag.pointerId !== event.pointerId) return;
                    setDraggedPositions((current) => ({
                      ...current,
                      [wish.wishId]: {
                        left: Math.min(Math.max(8, drag.left + event.clientX - drag.startX), drag.maxLeft),
                        top: Math.min(Math.max(8, drag.top + event.clientY - drag.startY), drag.maxTop),
                      },
                    }));
                  }}
                  onPointerUp={(event) => {
                    if (dragRef.current?.wishId !== wish.wishId || dragRef.current.pointerId !== event.pointerId) return;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    dragRef.current = null;
                    setDraggingWishId(null);
                  }}
                  onPointerCancel={(event) => {
                    if (dragRef.current?.wishId !== wish.wishId || dragRef.current.pointerId !== event.pointerId) return;
                    dragRef.current = null;
                    setDraggingWishId(null);
                  }}
                  onFocusCapture={() => setActiveWishId(wish.wishId)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveWishId((current) => current === wish.wishId ? null : current);
                  }}
                  style={{
                    width: `${scatter.width}px`,
                    left: `${notePosition.left}px`,
                    top: `${notePosition.top}px`,
                    zIndex: isActive || isDragging ? raisedZIndex : baseZIndex,
                    color: note.text,
                    backgroundColor: note.background,
                    backgroundImage: "linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.04) 42%, rgba(60,40,18,0.16) 100%), url('/images/wish-note-paper-v2.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundBlendMode: "soft-light, multiply",
                    touchAction: "none",
                    transform: `translate3d(0, ${isActive && !isDragging ? -12 : 0}px, 0) rotate(${scatter.rotation}deg) scale(${isActive && !isDragging ? scatter.scale + 0.015 : scatter.scale})`,
                  }}
                >
                  <span aria-hidden="true" className="absolute left-1/2 top-0 z-0 h-3 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] bg-[#ead9a2]/70 shadow-sm" />
                  <div className="relative z-10 flex items-start justify-between gap-3"><div><span className="font-display text-xl">{wish.nickname}</span><span className="ml-2 text-xs opacity-60">{categoryLabel(wish.category)}</span></div>{wish.isMine ? <button type="button" onClick={() => void removeWish(wish)} className="text-xs opacity-60 underline-offset-2 hover:underline">删除</button> : <button type="button" onClick={() => { setReportTarget(wish); setReportReason("abuse"); }} aria-label={`举报 ${wish.nickname} 的便利签`} className="text-xs opacity-55 transition hover:opacity-100">举报</button>}</div>
                  <p className="relative z-10 mt-6 whitespace-pre-wrap break-words font-display text-[1.05rem] leading-8">{wish.content}</p>
                  <div className="relative z-10 mt-auto flex items-center justify-between border-t border-current/15 pt-3 text-xs opacity-70"><span>{formatTime(wish.createdAt)}</span><button type="button" onClick={() => void likeWish(wish.wishId)} aria-pressed={wish.isLiked} className={`inline-flex items-center gap-1 transition hover:opacity-100 ${wish.isLiked ? "opacity-100" : "opacity-70"}`}><HeartIcon filled={wish.isLiked} />{wish.likeCount}</button></div>
                </article>;
              })}
            </div>
          ) : <div className="border border-dashed border-gold/25 py-16 text-center text-sm text-paper-dark/55">还没有公开的便利签。写下第一张心愿吧。</div>}
          {hasMore ? <div className="pt-7 text-center"><button type="button" disabled={loadingMore} onClick={() => void load(sort, page + 1)} className="border border-gold/30 px-6 py-2.5 text-sm text-gold-light transition hover:bg-gold/10 disabled:opacity-50">{loadingMore ? "正在加载…" : "查看更多心愿"}</button></div> : null}
        </section>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="presentation">
          <form onSubmit={submitWish} role="dialog" aria-modal="true" aria-labelledby="create-wish-title" className="w-full max-w-lg border border-gold/30 bg-[#1b211a] p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="create-wish-title" className="font-display text-2xl text-gold-light">写一张便利签</h2>
                <p className="mt-1 text-xs text-paper-dark/50">昵称会自动脱敏，请不要填写隐私信息。</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="关闭心愿窗口" className="text-2xl text-paper-dark/60 transition hover:text-paper">×</button>
            </div>
            <label className="mt-5 block text-sm text-paper-dark/80">
              昵称
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={12} required className="mt-2 w-full border-b border-gold/30 bg-transparent px-1 py-2 text-paper outline-none transition focus:border-gold" placeholder="如：念安" />
            </label>
            <fieldset className="mt-5">
              <legend className="text-sm text-paper-dark/80">心愿分类</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CATEGORIES.map((item) => <button type="button" key={item.value} onClick={() => setCategory(item.value)} className={`flex items-center gap-2 border px-3 py-2 text-left text-sm transition ${category === item.value ? "border-gold bg-gold/10 text-gold-light" : "border-paper-dark/15 text-paper-dark/65 hover:border-gold/50"}`}><span className="font-display text-base">{item.mark}</span>{item.label}</button>)}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="text-sm text-paper-dark/80">便签纸色</legend>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {NOTE_COLOR_OPTIONS.map((item) => {
                  const noteStyle = NOTE_STYLES[item.value];
                  const isSelected = color === item.value;
                  return <button type="button" key={item.value} onClick={() => setColor(item.value)} aria-label={`${item.label}色便签纸`} aria-pressed={isSelected} className={`relative h-12 border transition ${isSelected ? "border-gold ring-2 ring-gold/60 ring-offset-2 ring-offset-[#1b211a]" : "border-white/10 hover:border-gold/55"}`} style={{ backgroundColor: noteStyle.background, color: noteStyle.text }}>
                    {isSelected ? <span aria-hidden="true" className="font-display text-lg">✓</span> : <span className="sr-only">{item.label}色</span>}
                  </button>;
                })}
              </div>
              <p className="mt-2 text-xs text-paper-dark/45">选择喜欢的纸色，发布后不可修改。</p>
            </fieldset>
            <label className="mt-5 block text-sm text-paper-dark/80">
              心愿
              <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={160} minLength={3} required rows={5} className="mt-2 w-full resize-none border border-gold/20 bg-black/15 p-3 leading-7 text-paper outline-none transition focus:border-gold" placeholder="写下你此刻最想实现的愿望…" />
            </label>
            <div className="mt-2 flex justify-between text-xs text-paper-dark/40"><span>发布即表示同意公开展示</span><span>{content.length}/160</span></div>
            {message ? <p className="mt-3 text-sm text-gold-light">{message}</p> : null}
            <button type="submit" disabled={submitting} className="mt-5 w-full bg-vermillion px-4 py-3 text-sm font-medium text-paper transition hover:bg-vermillion-light disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "正在贴上墙…" : "贴上心愿墙"}</button>
          </form>
        </div>
      ) : null}

      {reportTarget ? <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="presentation"><form onSubmit={submitReport} role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-md border border-gold/30 bg-[#1b211a] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 id="report-title" className="font-display text-2xl text-gold-light">举报便利签</h2><button type="button" onClick={() => setReportTarget(null)} aria-label="关闭举报窗口" className="text-xl text-paper-dark/60">×</button></div><p className="mt-3 text-sm leading-6 text-paper-dark/70">请只举报确有问题的内容。管理员会人工处理，不会因单次举报自动下架。</p><fieldset className="mt-4 space-y-2">{REPORT_REASONS.map((item) => <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm text-paper-dark"><input type="radio" name="reason" value={item.value} checked={reportReason === item.value} onChange={() => setReportReason(item.value)} />{item.label}</label>)}</fieldset><textarea value={reportDetail} onChange={(event) => setReportDetail(event.target.value)} maxLength={240} rows={3} className="mt-4 w-full resize-none border border-gold/20 bg-black/15 p-3 text-sm text-paper outline-none focus:border-gold" placeholder="补充说明（可选）" /><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setReportTarget(null)} className="px-4 py-2 text-sm text-paper-dark/70">取消</button><button type="submit" disabled={reporting} className="bg-vermillion px-4 py-2 text-sm text-paper disabled:opacity-60">{reporting ? "提交中…" : "提交举报"}</button></div></form></div> : null}
    </main>
  );
}
