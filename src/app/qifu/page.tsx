"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBlessing, getBlessingWall, getUserMe, payOrder } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type LampType = "清心灯" | "智慧灯" | "长寿灯" | "平安灯" | "姻缘灯" | "财福灯";
type Duration = "month" | "100days" | "year" | "forever";
type Relation = "父亲" | "母亲" | "爱人" | "孩子" | "孙辈" | "朋友" | "自己";

const LAMPS: { id: LampType; name: string; desc: string; emoji: string }[] = [
  { id: "清心灯", name: "清心灯", desc: "祈愿身心安宁、烦恼消解", emoji: "🌸" },
  { id: "智慧灯", name: "智慧灯", desc: "祈愿学业精进、心智明朗", emoji: "📚" },
  { id: "长寿灯", name: "长寿灯", desc: "祈愿身体康健、福寿绵长", emoji: "🎋" },
  { id: "平安灯", name: "平安灯", desc: "祈愿出入平安、家宅安宁", emoji: "🏮" },
  { id: "姻缘灯", name: "姻缘灯", desc: "祈愿良缘早至、感情和顺", emoji: "💕" },
  { id: "财福灯", name: "财福灯", desc: "祈愿财源广进、生意顺遂", emoji: "💰" },
];

const DURATIONS: { id: Duration; label: string; price: number }[] = [
  { id: "month", label: "一月供奉", price: 3.9 },
  { id: "100days", label: "百日供奉", price: 5.9 },
  { id: "year", label: "一年供奉", price: 9.9 },
  { id: "forever", label: "永久长明", price: 19.9 },
];
const DURATION_LABELS: Record<string, string> = {
  month: "一月供奉",
  "100days": "百日供奉",
  year: "一年供奉",
  forever: "永久长明",
};

const RELATIONS: Relation[] = ["父亲", "母亲", "爱人", "孩子", "孙辈", "朋友", "自己"];
const BLESSING_LAMP_BASE_IMAGE = "/images/blessing-palace-lantern-frame.png";
const BLESSING_LAMP_TASSEL_IMAGES = {
  left: "/images/blessing-palace-lantern-tassel-left.png",
  right: "/images/blessing-palace-lantern-tassel-right.png",
  bottom: "/images/blessing-palace-lantern-tassel-bottom.png",
};

type WallItem = {
  lampId?: string;
  recordId?: string;
  maskedDonor?: string | null;
  maskedName: string;
  lampType?: string;
  relation?: string;
  duration?: string;
  wish?: string | null;
  amount?: number | null;
  createdAt?: string;
  isMine?: boolean;
  nameRaw?: string | null;
  donorNameRaw?: string | null;
};

const LAMP_VISUALS: Record<LampType, {
  inscription: string;
  accent: string;
  border: string;
  badgeBg: string;
  glow: string;
  aura: string;
  filter: string;
  textColor: string;
}> = {
  清心灯: {
    inscription: "净",
    accent: "#8ee8e0",
    border: "rgba(142, 232, 224, 0.34)",
    badgeBg: "rgba(142, 232, 224, 0.1)",
    glow: "rgba(94, 216, 205, 0.34)",
    aura: "radial-gradient(circle, rgba(153, 246, 228, 0.5) 0%, rgba(94, 216, 205, 0.2) 44%, transparent 74%)",
    filter: "hue-rotate(138deg) saturate(0.72) brightness(1.12)",
    textColor: "#2f6f68",
  },
  智慧灯: {
    inscription: "慧",
    accent: "#9db7ff",
    border: "rgba(157, 183, 255, 0.34)",
    badgeBg: "rgba(157, 183, 255, 0.1)",
    glow: "rgba(112, 142, 255, 0.34)",
    aura: "radial-gradient(circle, rgba(191, 219, 254, 0.5) 0%, rgba(112, 142, 255, 0.2) 44%, transparent 74%)",
    filter: "hue-rotate(205deg) saturate(0.75) brightness(1.1)",
    textColor: "#41527f",
  },
  长寿灯: {
    inscription: "寿",
    accent: "#b4d77a",
    border: "rgba(180, 215, 122, 0.34)",
    badgeBg: "rgba(180, 215, 122, 0.1)",
    glow: "rgba(148, 194, 85, 0.34)",
    aura: "radial-gradient(circle, rgba(217, 249, 157, 0.48) 0%, rgba(148, 194, 85, 0.2) 44%, transparent 74%)",
    filter: "hue-rotate(82deg) saturate(0.9) brightness(1.05)",
    textColor: "#596c27",
  },
  平安灯: {
    inscription: "安",
    accent: "#f2bd6d",
    border: "rgba(242, 189, 109, 0.34)",
    badgeBg: "rgba(242, 189, 109, 0.1)",
    glow: "rgba(245, 158, 11, 0.34)",
    aura: "radial-gradient(circle, rgba(253, 230, 138, 0.5) 0%, rgba(245, 158, 11, 0.2) 44%, transparent 74%)",
    filter: "saturate(1.02) brightness(1.04)",
    textColor: "#7d4b1e",
  },
  姻缘灯: {
    inscription: "缘",
    accent: "#f4a0b7",
    border: "rgba(244, 160, 183, 0.34)",
    badgeBg: "rgba(244, 160, 183, 0.1)",
    glow: "rgba(244, 114, 182, 0.34)",
    aura: "radial-gradient(circle, rgba(251, 207, 232, 0.5) 0%, rgba(244, 114, 182, 0.2) 44%, transparent 74%)",
    filter: "hue-rotate(324deg) saturate(1.12) brightness(1.08)",
    textColor: "#7a3a48",
  },
  财福灯: {
    inscription: "福",
    accent: "#ffd36b",
    border: "rgba(255, 211, 107, 0.38)",
    badgeBg: "rgba(255, 211, 107, 0.12)",
    glow: "rgba(251, 191, 36, 0.38)",
    aura: "radial-gradient(circle, rgba(254, 240, 138, 0.54) 0%, rgba(251, 191, 36, 0.22) 44%, transparent 74%)",
    filter: "hue-rotate(12deg) saturate(1.24) brightness(1.08) contrast(1.02)",
    textColor: "#8a5415",
  },
};

function getLampVisual(lampType?: string) {
  return LAMP_VISUALS[lampType as LampType] || LAMP_VISUALS["平安灯"];
}

function getLanternInscription(item: WallItem) {
  const chineseSurname = item.maskedName.match(/[\u4e00-\u9fff]/)?.[0];
  return chineseSurname || getLampVisual(item.lampType).inscription;
}

function getDurationLabel(duration?: string) {
  return duration ? DURATION_LABELS[duration] || duration : "未记录";
}

function formatLampTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function getDurationEndDate(start: Date, duration: Duration) {
  const end = new Date(start);
  if (duration === "month") end.setMonth(end.getMonth() + 1);
  if (duration === "100days") end.setDate(end.getDate() + 100);
  if (duration === "year") end.setFullYear(end.getFullYear() + 1);
  return end;
}

function getDurationPeriodText(duration: Duration, startDate: Date | null) {
  if (!startDate) return "从今日起";
  const start = formatShortDate(startDate);
  if (duration === "forever") return `自 ${start} 起长期`;
  return `${start} 至 ${formatShortDate(getDurationEndDate(startDate, duration))}`;
}

function LanternImage({
  item,
  className = "h-24 w-24",
  inscriptionClassName = "text-[0.95rem]",
}: {
  item: WallItem;
  className?: string;
  inscriptionClassName?: string;
}) {
  const visual = getLampVisual(item.lampType);
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="absolute inset-x-5 bottom-2 h-6 rounded-full blur-md"
        style={{ backgroundColor: visual.glow }}
      />
      <img
        src={BLESSING_LAMP_BASE_IMAGE}
        alt={`${item.maskedName}的${item.lampType || "心愿灯"}`}
        className="relative z-10 h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(249,168,37,0.25)]"
        style={{ filter: visual.filter }}
        loading="lazy"
      />
      <img
        src={BLESSING_LAMP_TASSEL_IMAGES.left}
        alt=""
        aria-hidden="true"
        className="animate-lantern-tassel-left absolute z-20 object-contain"
        style={{ left: "20.703%", top: "25.781%", width: "8.789%", height: "38.672%", filter: visual.filter }}
        loading="lazy"
      />
      <img
        src={BLESSING_LAMP_TASSEL_IMAGES.right}
        alt=""
        aria-hidden="true"
        className="animate-lantern-tassel-right absolute z-20 object-contain"
        style={{ left: "70.508%", top: "25.781%", width: "8.594%", height: "38.672%", filter: visual.filter }}
        loading="lazy"
      />
      <img
        src={BLESSING_LAMP_TASSEL_IMAGES.bottom}
        alt=""
        aria-hidden="true"
        className="animate-lantern-tassel-bottom absolute z-20 object-contain"
        style={{ left: "44.337%", top: "72.852%", width: "12.109%", height: "25.977%", filter: visual.filter }}
        loading="lazy"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[51%] z-20 h-[50%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-[1px] mix-blend-screen"
        style={{ background: visual.aura }}
      />
      <span
        className={`pointer-events-none absolute left-1/2 top-[50.5%] z-30 -translate-x-1/2 -translate-y-1/2 font-display leading-none opacity-[0.62] mix-blend-multiply [text-shadow:0_1px_2px_rgba(255,238,178,0.35)] ${inscriptionClassName}`}
        style={{ color: visual.textColor }}
        aria-hidden="true"
      >
        {getLanternInscription(item)}
      </span>
    </div>
  );
}

export default function QifuPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("父亲");
  const [lampType, setLampType] = useState<LampType>("平安灯");
  const [duration, setDuration] = useState<Duration>("month");
  const [wish, setWish] = useState("");
  const [donorName, setDonorName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [wallItems, setWallItems] = useState<WallItem[]>([]);
  const [wallTotal, setWallTotal] = useState(0);
  const [todayNew, setTodayNew] = useState(0);
  const [wallLoading, setWallLoading] = useState(true);
  const [selectedLamp, setSelectedLamp] = useState<WallItem | null>(null);
  const [durationStartDate, setDurationStartDate] = useState<Date | null>(null);
  const [trialActive, setTrialActive] = useState(true);

  const price = DURATIONS.find((d) => d.id === duration)?.price ?? 3.9;

  const loadWall = async () => {
    try {
      const res = await getBlessingWall(1, 40);
      if (res.success && res.data) {
        const items = (res.data.items || []).map((item: any) => ({
          lampId: item.lampId,
          recordId: item.recordId,
          maskedDonor: item.maskedDonor,
          maskedName: item.maskedName,
          lampType: item.lampType,
          relation: item.relation,
          duration: item.duration,
          wish: item.wish,
          amount: typeof item.amount === "number" ? item.amount : Number(item.amount || 0),
          createdAt: item.createdAt,
          isMine: Boolean(item.isMine),
          nameRaw: item.nameRaw,
          donorNameRaw: item.donorNameRaw,
        }));
        setWallItems(items);
        setWallTotal(Number(res.data.total || items.length));
        setTodayNew(Number(res.data.todayNew || 0));
      }
    } catch {
      setResultMsg("灯墙数据加载失败，请稍后刷新");
    } finally {
      setWallLoading(false);
    }
  };

  useEffect(() => {
    setDurationStartDate(new Date());
    void getUserMe().then((res) => setTrialActive(res.data?.trial?.active ?? false));
    loadWall();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedDonor = donorName.trim();
    const trimmedWish = wish.trim();

    if (!trimmedName) {
      setResultMsg("请先填写家人姓名");
      return;
    }

    setSubmitting(true);
    setResultMsg("");
    try {
      const res = await createBlessing({
        name: trimmedName,
        relation,
        lampType,
        duration,
        wish: trimmedWish || undefined,
        donorName: trimmedDonor || undefined,
      });
      if (res.success) {
        if (res.data?.orderId) {
          const paid = await payOrder(res.data.orderId);
          if (!paid.success) {
            setResultMsg(paid.message || "订单已创建，支付确认失败，请稍后在记录中找回");
            setSubmitting(false);
            return;
          }
        }
        const created: WallItem = {
          recordId: res.data?.recordId,
          maskedDonor: res.data?.preview?.maskedDonor || "善**",
          maskedName: res.data?.preview?.maskedName || `${trimmedName[0] || "善"}*`,
          lampType: res.data?.preview?.lampType || lampType,
          relation,
          duration,
          wish: trimmedWish || null,
          amount: res.data?.amount ?? price,
          createdAt: new Date().toISOString(),
          isMine: true,
          nameRaw: trimmedName,
          donorNameRaw: trimmedDonor || null,
        };
        setWallItems((items) => [created, ...items].slice(0, 40));
        setWallTotal((total) => total + 1);
        setTodayNew((total) => total + 1);
        setResultMsg(`心愿已提交并完成供奉！${res.data?.preview?.maskedName || ""}的${res.data?.preview?.lampType || lampType}已点亮 🏮`);
        await loadWall();
      } else {
        setResultMsg(res.message || "提交失败，请重试");
      }
    } catch (e: any) {
      setResultMsg("服务暂时不可用，请稍后重试");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      {/* ===== Header ===== */}
      <header className="fixed top-0 inset-x-0 z-50 pt-[9px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/favicon.svg" alt="善缘阁" className="size-8" />
            <span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">
            <Link href="/qifu" className="text-gold transition-colors">为家人祈福</Link>
            <Link href="/almanac" className="hover:text-gold transition-colors">今日黄历</Link>
            <Link href="/lottery" className="hover:text-gold transition-colors">求灵签</Link>
            <Link href="/bazi" className="hover:text-gold transition-colors">八字精批</Link>
            <Link href="/dream" className="hover:text-gold transition-colors">周公解梦</Link>
            <Link href="/palmistry" className="hover:text-gold transition-colors">手相 / 面相</Link>
            <Link href="/naming" className="hover:text-gold transition-colors">宝宝起名</Link>
            <Link href="/divination" className="hover:text-gold transition-colors">六爻占卜</Link>
            <Link href="/meditation" className="hover:text-gold transition-colors">静心禅坐</Link>
          </nav>

          <div className="flex items-center gap-2">
            <MusicButton />
            <AccountButton />
            <InstallAppButton />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>) : (<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}
              </svg>
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown">
          <nav className="flex flex-col p-4 space-y-1">
            <Link href="/qifu" className="py-3 px-4 rounded-lg text-gold bg-gold/5">为家人祈福</Link>
            <Link href="/almanac" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">今日黄历</Link>
            <Link href="/lottery" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">求灵签</Link>
            <Link href="/bazi" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">八字精批</Link>
            <Link href="/dream" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">周公解梦</Link>
            <Link href="/palmistry" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">手相/面相</Link>
            <Link href="/naming" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">宝宝起名</Link>
            <Link href="/divination" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">六爻占卜</Link>
            <Link href="/meditation" className="py-3 px-4 rounded-lg text-paper-dark/80 hover:bg-gold/5 hover:text-gold transition-colors">静心禅坐</Link>
          </nav>
        </div>
      )}

      {/* ===== Main Content ===== */}
      <main className="relative z-10 mx-auto w-full max-w-[1008px] px-[18px] pb-[108px] pt-20">
        {/* ===== Page Title ===== */}
        <div className="text-center mb-10">
          {/* Candle ornament */}
          <div className="relative mb-6 flex justify-center">
            <div className="absolute -top-2">
              {/* Flame glow */}
              <div className="relative">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 size-6 bg-amber-400/20 rounded-full blur-md" />
                <svg width="28" height="32" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="12" cy="4" rx="4" ry="7" fill="#f59e0b" opacity="0.9"/>
                  <ellipse cx="12" cy="5" rx="2.5" ry="5" fill="#fbbf24"/>
                  <ellipse cx="12" cy="5.5" rx="1.2" ry="2.5" fill="#fef3c7"/>
                  <rect x="9" y="10" width="6" height="14" rx="3" fill="#92400e"/>
                  <rect x="9" y="10" width="6" height="14" rx="3" fill="url(#candle-grad)" opacity="0.5"/>
                </svg>
              </div>
            </div>
          </div>
          <h1 className="font-display text-[40px] tracking-[0.1em] text-gold mb-3">
            祈愿供灯
          </h1>
          <p className="text-paper-dark/70 text-base max-w-md mx-auto leading-relaxed">
            点一盏灯，写下一份祝愿，留给家人、自己或重要时刻一份温和的仪式感。
          </p>
        </div>

        {/* ===== Stats Banner ===== */}
        <div className="mx-auto mb-6 flex w-full max-w-sm items-center justify-center gap-4 rounded-full border border-gold/30 bg-xuan-card/70 px-6 py-2 text-sm text-paper-dark/80">
          <span className="inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
              <path d="M8.625 0c.61 7.189-5.625 9.664-5.625 15.996 0 4.301 3.069 7.972 9 8.004 5.931.032 9-4.414 9-8.956 0-4.141-2.062-8.046-5.952-10.474.924 2.607-.306 4.988-1.563 5.196.167-.318.255-.669.255-1.032C13.74.969 8.625 0 8.625 0z"/>
            </svg>
            已点亮 <span className="font-display text-lg text-gold">{wallTotal}</span> 盏
          </span>
          <span className="h-4 w-px bg-gold/30" />
          <span>
            今日新增 <span className="font-display text-lg text-vermillion">{todayNew}</span> 盏
          </span>
        </div>

        {/* ===== Marquee: Recent lights ===== */}
        {wallItems.length > 0 && (
        <div className="overflow-hidden rounded-full bg-xuan-card/50 px-2 py-2 mb-10">
          <div className="flex animate-marquee whitespace-nowrap gap-8">
            {[...wallItems.slice(0, 12), ...wallItems.slice(0, 12)].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs text-paper-dark/75 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-vermillion/60">
                  <path d="M8.625 0c.61 7.189-5.625 9.664-5.625 15.996 0 4.301 3.069 7.972 9 8.004 5.931.032 9-4.414 9-8.956 0-4.141-2.062-8.046-5.952-10.474.924 2.607-.306 4.988-1.563 5.196.167-.318.255-.669.255-1.032C13.74.969 8.625 0 8.625 0z"/>
                </svg>
                {item.maskedDonor || "善**"} 为 {item.maskedName} 点亮{item.lampType || "心愿灯"}
              </span>
            ))}
          </div>
        </div>
        )}

        {/* ===== Form Card ===== */}
        <div className="rounded-2xl border border-gold/10 bg-xuan-card/40 p-6 md:p-8 space-y-8 mb-12">
          {/* Section: 为谁点灯 */}
          <section className="space-y-5">
            <h2 className="font-display text-2xl tracking-[0.05em] text-gold text-center">
              为谁点灯
            </h2>

            {/* 家人姓名 */}
            <label className="block space-y-2">
              <span className="text-sm text-paper-dark/70">家人姓名</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入家人姓名"
                className="h-12 w-full rounded-md border border-gold/20 bg-xuan-surface px-4 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
              />
            </label>

            {/* 与您的关系 */}
            <label className="block space-y-2">
              <span className="text-sm text-paper-dark/70">与您的关系</span>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value as Relation)}
                className="h-12 w-full rounded-md border border-gold/20 bg-xuan-surface px-3 text-lg text-paper-dark focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d6b16c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.75rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25rem",
                  paddingRight: "2.5rem",
                }}
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </section>

          {/* Section: 选一盏灯 */}
          <section className="space-y-4">
            <p className="text-sm text-paper-dark/70">选一盏灯</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {LAMPS.map((lamp) => {
                const visual = getLampVisual(lamp.id);
                const selected = lampType === lamp.id;
                return (
                  <button
                    key={lamp.id}
                    type="button"
                    onClick={() => setLampType(lamp.id)}
                    className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? "bg-xuan-surface/60"
                        : "border-gold/10 bg-xuan-surface/40 hover:border-gold/30 hover:bg-gold/5"
                    }`}
                    style={{
                      borderColor: selected ? visual.border : undefined,
                      boxShadow: selected ? `0 0 22px ${visual.glow}` : undefined,
                    }}
                  >
                    <span
                      className="absolute right-4 top-4 h-3 w-3 rounded-full shadow-[0_0_12px_currentColor]"
                      style={{ backgroundColor: visual.accent, color: visual.accent }}
                    />
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: `linear-gradient(135deg, ${visual.badgeBg}, transparent 58%)` }}
                    />
                    <p className="relative mb-1 font-display text-lg" style={{ color: visual.accent }}>{lamp.name}</p>
                    <p className="relative text-sm text-paper-dark/50">{lamp.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section: 供奉时长 */}
          <section className="space-y-4">
            <p className="text-sm text-paper-dark/70">供奉时长</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {DURATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDuration(d.id)}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    duration === d.id
                      ? "border-gold/60 bg-gold/10 shadow-gold"
                      : "border-gold/10 bg-xuan-surface/40 hover:border-gold/30 hover:bg-gold/5"
                  }`}
                >
                  <p className="font-display text-base text-gold/90 mb-0.5">{d.label}</p>
                  <p className="mb-1 text-xs leading-relaxed text-paper-dark/45">{getDurationPeriodText(d.id, durationStartDate)}</p>
                  <p className="text-sm font-semibold text-emerald-300">{trialActive ? "15 天免费试运营" : `¥${d.price}`}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 心愿 */}
          <label className="block space-y-2">
            <span className="text-sm text-paper-dark/70">心愿（可选，最多 80 字）</span>
            <textarea
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              maxLength={80}
              placeholder="写下您的心愿..."
              rows={4}
              className="w-full rounded-md border border-gold/20 bg-xuan-surface px-4 py-3 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors resize-none"
            />
          </label>

          {/* 您的称呼 */}
          <label className="block space-y-2">
            <span className="text-sm text-paper-dark/70">您的称呼（可选，会显示在灯墙）</span>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="请输入您的称呼"
              className="h-12 w-full rounded-md border border-gold/20 bg-xuan-surface px-4 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors"
            />
          </label>

          {/* Submit area */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-paper-dark/60">
              {trialActive ? "15 天免费试运营中，本次无需支付" : <>需供奉 <span className="text-vermillion font-semibold text-lg">&yen;{price}</span></>}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-vermillion px-10 py-3 text-white text-lg font-medium tracking-wider shadow-lg shadow-vermillion/20 hover:bg-vermillion-light active:bg-vermillion-dark transition-all hover:shadow-vermillion/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "提交中..." : "点亮此灯"}
            </button>
            {resultMsg && (
              <p className="text-sm text-emerald-300 mt-2 animate-fadeIn">{resultMsg}</p>
            )}
          </div>
        </div>

        {/* ===== 心愿灯墙 ===== */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="font-display text-2xl tracking-[0.05em] text-gold mb-2">
              心愿灯墙
            </h2>
            <p className="text-sm text-paper-dark/45">姓名已脱敏处理 · 仅作心愿展示</p>
          </div>

          {wallItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {wallItems.map((item, i) => {
              const visual = getLampVisual(item.lampType);
              const isMine = Boolean(item.isMine);
              return (
                <button
                  key={item.lampId || item.recordId || i}
                  type="button"
                  onClick={() => {
                    if (isMine) setSelectedLamp(item);
                  }}
                  aria-label={isMine ? `查看${item.maskedName}的供灯详情` : `${item.maskedName}的心愿灯`}
                  aria-disabled={!isMine}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border bg-xuan-card/30 p-4 text-left transition-all ${
                    isMine ? "cursor-pointer hover:-translate-y-0.5 hover:bg-xuan-card/55" : "cursor-default"
                  }`}
                  style={{
                    borderColor: visual.border,
                    boxShadow: `0 0 18px ${visual.glow}`,
                  }}
                >
                  {isMine && (
                    <span
                      className="absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] leading-none"
                      style={{ borderColor: visual.border, backgroundColor: visual.badgeBg, color: visual.accent }}
                    >
                      我的
                    </span>
                  )}

                  <LanternImage item={item} />

                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] leading-none tracking-[0.08em]"
                    style={{ borderColor: visual.border, backgroundColor: visual.badgeBg, color: visual.accent }}
                  >
                    {item.lampType || "心愿灯"}
                  </span>

                  {/* Dedication text */}
                  <p className="text-center text-xs leading-relaxed text-paper-dark/50">
                    {item.maskedDonor || "善**"} 为 {item.maskedName}
                    <br />
                    敬奉
                  </p>
                </button>
              );
            })}
          </div>
          ) : (
            <div className="rounded-xl border border-gold/15 bg-xuan-card/30 p-8 text-center text-sm text-paper-dark/50">
              {wallLoading ? "正在读取灯墙..." : "还没有供灯记录，点亮第一盏灯后会显示在这里。"}
            </div>
          )}
        </section>
      </main>

      {selectedLamp && (() => {
        const visual = getLampVisual(selectedLamp.lampType);
        const detailRows = [
          ["供奉对象", selectedLamp.nameRaw || selectedLamp.maskedName],
          ["供奉人", selectedLamp.donorNameRaw || selectedLamp.maskedDonor || "善信"],
          ["关系", selectedLamp.relation || "未记录"],
          ["灯型", selectedLamp.lampType || "心愿灯"],
          ["供奉时长", getDurationLabel(selectedLamp.duration)],
          ["点灯时间", formatLampTime(selectedLamp.createdAt)],
        ];

        return (
          <div
            className="fixed inset-0 z-[120] flex animate-fadeIn items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="心愿灯详情"
            onClick={() => setSelectedLamp(null)}
          >
            <div
              className="animate-modal-pop relative w-full max-w-lg overflow-hidden rounded-2xl border bg-xuan-card p-5 shadow-2xl md:p-7"
              style={{
                background: "linear-gradient(180deg, rgba(36, 27, 19, 0.98), rgba(29, 22, 15, 0.96))",
                borderColor: visual.border,
                boxShadow: `0 0 36px ${visual.glow}, 0 24px 80px rgba(0,0,0,0.45)`,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedLamp(null)}
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-gold/20 text-paper-dark/65 transition-colors hover:border-gold/50 hover:text-gold"
                aria-label="关闭供灯详情"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <p
                  className="mx-auto mb-3 inline-flex rounded-full border px-3 py-1 text-xs tracking-[0.12em]"
                  style={{ borderColor: visual.border, backgroundColor: visual.badgeBg, color: visual.accent }}
                >
                  我的心愿灯
                </p>
                <h3 className="font-display text-3xl tracking-[0.08em] text-gold">供灯详情</h3>
              </div>

              <div className="mt-4 flex justify-center">
                <LanternImage item={selectedLamp} className="h-44 w-44" inscriptionClassName="text-[1.7rem]" />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {detailRows.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-gold/10 bg-xuan-surface/50 px-3 py-2">
                    <p className="text-xs text-paper-dark/45">{label}</p>
                    <p className="mt-1 text-sm text-paper-dark">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-gold/10 bg-xuan-surface/50 px-3 py-3">
                <p className="text-xs text-paper-dark/45">心愿</p>
                <p className="mt-2 text-sm leading-relaxed text-paper-dark">
                  {selectedLamp.wish?.trim() || "未填写心愿，愿平安顺遂、福慧增长。"}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Footer ===== */}
      <footer className="relative z-10 pt-[45px] pb-12 px-4 text-center text-sm text-paper-dark/55">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="space-y-2">
            <p>善念起于心，福缘自然生。一念清净，万物皆宁。</p>
            <p>结善缘，修善念。心安之处，处处生光。</p>
            <p>命自我立，福自我求。诸恶莫作，众善奉行。</p>
          </div>
          <div className="flex justify-center gap-6 text-paper-dark/45">
            <Link href="/terms" className="hover:text-gold/70 transition-colors">用户协议</Link>
            <Link href="/privacy" className="hover:text-gold/70 transition-colors">隐私说明</Link>
            <Link href="/ai" className="hover:text-gold/70 transition-colors">AI 生成说明</Link>
          </div>
          <div className="space-y-1 text-xs text-paper-dark/35">
            <p>本站内容仅作传统文化参考，不替代医疗、法律、投资等专业意见；部分说明由 AI 辅助生成。</p>
            <p>继续使用本站或发起服务，即表示您已阅读《用户协议》《隐私说明》《AI 生成说明》；未满18周岁请勿使用本服务。</p>
          </div>
          <p className="text-paper-dark/30 text-xs pt-4">善缘阁 · 一念慈悲，一灯长明</p>
        </div>
      </footer>

    </div>
  );
}
