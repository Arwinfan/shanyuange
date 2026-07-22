"use client";

import { useState } from "react";
import Link from "next/link";
import { fortuneDream } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

const CATEGORIES = [
  { emoji: "👥", label: "人物" }, { emoji: "🫀", label: "身体" }, { emoji: "🐎", label: "动物" },
  { emoji: "🌿", label: "植物" }, { emoji: "🌤", label: "天象自然" }, { emoji: "📿", label: "物品" },
  { emoji: "🏠", label: "房舍宅院" }, { emoji: "🕯", label: "生死婚丧" }, { emoji: "🚶", label: "行为" },
  { emoji: "🙏", label: "鬼神宗教" }, { emoji: "💰", label: "财运钱帛" },
];

const HOT_DREAMS = [
  { title: "梦见贵人", rating: "上上", text: "事业上将遇贵人扶持，或得到上级器重。" },
  { title: "梦见父母", rating: "上吉", text: "近期家中诸事顺遂，家人安康。若双亲已故，则提示需多缅怀祭祀。" },
  { title: "梦见孩子", rating: "中吉", text: "象征新的开始与希望。怀孕者梦此为胎气稳固，未孕者主未来三月有喜事。" },
  { title: "梦见已故亲人", rating: "上吉", text: "已故亲人入梦多为思念所致，亦为先祖庇佑之兆。若亡者面色和悦，家中将逢喜事。" },
  { title: "梦见僧人", rating: "上吉", text: "象征心灵将得开悟，迷茫之事将有指引。亦为虔诚信佛者之吉兆。" },
  { title: "梦见自己死了", rating: "上上", text: "梦中死亡是\"重生\"的象征，旧的告一段落，新的将启。莫怕。" },
  { title: "梦见亲戚", rating: "中吉", text: "近期可能有久未联系之亲戚相聚。彼此应多走动，互相扶持。" },
  { title: "梦见陌生人", rating: "中平", text: "提示生活中将有新缘分到来，可能是贵人或新友。需明辨善恶。" },
  { title: "梦见头发", rating: "中平", text: "白发主长寿与智慧；脱发反而是烦恼脱落、轻装前行之意。" },
  { title: "梦见掉牙", rating: "中平", text: "传统认为掉牙主长辈安康。现代心理学解为压力释放或对衰老的担忧，不必过虑。" },
  { title: "梦见眼睛", rating: "中吉", text: "象征对事物有新洞察。若梦中视物不清，则提示当下判断需谨慎。" },
  { title: "梦见流血", rating: "上吉", text: "鲜血在解梦学中反主财运将至，尤其大量流血更佳。莫被字面吓到。" },
];

type DreamResult = {
  title: string;
  level: string;
  text: string;
  full?: {
    traditionalSymbols?: string[];
    realityReflection?: string;
    advice?: string;
    doList?: string[];
    avoidList?: string[];
    aiEnhanced?: boolean;
    aiModel?: string;
    generationNote?: string;
  };
};

export default function DreamPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DreamResult | null>(null);

  const handleDream = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fortuneDream(query);
      if (res.success && res.data?.result) {
        setResult({
          title: res.data.result.title,
          level: res.data.result.level,
          text: res.data.result.interpretation,
          full: res.data.fullResult,
        });
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      <SiteHeader current="dream" menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {menuOpen && <MobileMenu current="dream" />}

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* Title */}
          <section className="text-center space-y-4">
            <div className="text-4xl mb-2">🌙</div>
            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">周公解梦</h1>
            <p className="text-paper-dark/70 text-base">百梦皆有意 · 古今相参证</p>
          </section>

          {/* Search */}
          <section className="space-y-4">
            <p className="text-center text-base text-paper-dark/80">请描述您梦中所见</p>
            <div className="flex gap-3">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="如：梦见龙、梦见牙齿掉了"
                className="flex-1 h-12 rounded-md border border-gold/20 bg-xuan-surface px-4 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors" />
              <button onClick={handleDream} disabled={loading}
                className="rounded-lg bg-vermillion px-6 py-3 text-white font-medium hover:bg-vermillion-light transition-colors shrink-0 disabled:opacity-60">
                {loading ? "参详中..." : "解梦"}
              </button>
            </div>
            {loading && <p className="text-center text-sm text-paper-dark/55" role="status" aria-live="polite">正在整理梦境意象，请稍候。</p>}
            {result && (
              <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-4 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg text-gold/90">梦境解析</p>
                    <p className="mt-1 text-sm text-paper-dark/65">{result.title}</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-900/20 px-2 py-0.5 text-xs text-emerald-300">{result.level}</span>
                </div>
                <p className="text-sm text-paper-dark/60 leading-relaxed">{result.text}</p>
                {result.full?.traditionalSymbols?.length ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {result.full.traditionalSymbols.map((symbol) => (
                      <span key={symbol} className="rounded-full border border-gold/15 bg-gold/5 px-2 py-0.5 text-xs text-gold/80">{symbol}</span>
                    ))}
                  </div>
                ) : null}
                {result.full?.realityReflection ? (
                  <p className="rounded-md border border-gold/10 bg-xuan-surface/30 p-3 text-xs leading-relaxed text-paper-dark/55">{result.full.realityReflection}</p>
                ) : null}
                {result.full?.advice ? (
                  <p className="text-xs leading-relaxed text-paper-dark/55">提醒：{result.full.advice}</p>
                ) : null}
                {(result.full?.doList?.length || result.full?.avoidList?.length) ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.full.doList?.length ? (
                      <div className="rounded-md border border-emerald-500/15 bg-emerald-900/10 p-3">
                        <p className="text-xs text-emerald-300/80">宜</p>
                        <p className="mt-1 text-xs leading-relaxed text-paper-dark/55">{result.full.doList.join("、")}</p>
                      </div>
                    ) : null}
                    {result.full.avoidList?.length ? (
                      <div className="rounded-md border border-vermillion/20 bg-vermillion/10 p-3">
                        <p className="text-xs text-vermillion-light">忌</p>
                        <p className="mt-1 text-xs leading-relaxed text-paper-dark/55">{result.full.avoidList.join("、")}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {/* Categories */}
          <section className="space-y-4">
            <h2 className="font-display text-xl text-gold text-center">按类查梦</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.label} onClick={() => setQuery(c.label)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-gold/15 bg-xuan-surface/40 p-3 text-center hover:border-gold/30 hover:bg-xuan-surface/70 transition-colors">
                  <span className="text-xl">{c.emoji}</span>
                  <span className="text-xs text-paper-dark/70">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Hot Dreams */}
          <section className="space-y-4">
            <h2 className="font-display text-xl text-gold text-center">热门梦境</h2>
            <div className="grid gap-3">
              {HOT_DREAMS.map(d => {
                const ratingColor = d.rating === "上上" ? "text-emerald-400 bg-emerald-900/20 border-emerald-500/30" :
                  d.rating === "上吉" ? "text-emerald-300 bg-emerald-900/15 border-emerald-500/25" :
                  d.rating === "中吉" ? "text-gold/80 bg-gold/5 border-gold/20" : "text-paper-dark/50 bg-xuan-surface/30 border-gold/10";
                return (
                  <button key={d.title}
                    className="group rounded-lg border border-gold/15 bg-xuan-surface/40 p-4 text-left hover:border-gold/30 hover:bg-xuan-surface/70 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg text-gold/90">{d.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ratingColor}`}>{d.rating}</span>
                    </div>
                    <p className="mt-2 text-sm text-paper-dark/55 leading-relaxed">{d.text}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* Shared components - same pattern as bazi */
function SiteHeader({ current, menuOpen, setMenuOpen }: { current: string; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  return (<header className="fixed top-0 inset-x-0 z-50 pt-[9px]"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]"><Link href="/" className="flex items-center gap-2 shrink-0"><img src="/favicon.svg" alt="善缘阁" className="size-8" /><span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span></Link><nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">{nav.map(n=><Link key={n.href} href={n.href} className={n.href===`/${current}`?"text-gold":"hover:text-gold transition-colors"}>{n.label}</Link>)}</nav><div className="flex items-center gap-2"><MusicButton /><AccountButton /><InstallAppButton /><button onClick={()=>setMenuOpen(!menuOpen)} className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{menuOpen?(<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>):(<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}</svg></button></div></div><div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent"/></header>);
}

function MobileMenu({ current }: { current: string }) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  return (<div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown"><nav className="flex flex-col p-4 space-y-1">{nav.map(n=><Link key={n.href} href={n.href} className={`py-3 px-4 rounded-lg ${n.href===`/${current}`?"text-gold bg-gold/5":"text-paper-dark/80 hover:bg-gold/5 hover:text-gold"}`}>{n.label}</Link>)}</nav></div>);
}

function SiteFooter() {
  return (<footer className="relative z-10 pt-[45px] pb-12 px-4 text-center text-sm text-paper-dark/55"><div className="mx-auto max-w-2xl space-y-6"><div className="space-y-2"><p>善念起于心，福缘自然生。一念清净，万物皆宁。</p><p>结善缘，修善念。心安之处，处处生光。</p><p>命自我立，福自我求。诸恶莫作，众善奉行。</p></div><div className="flex justify-center gap-6 text-paper-dark/45"><Link href="/terms" className="hover:text-gold/70 transition-colors">用户协议</Link><Link href="/privacy" className="hover:text-gold/70 transition-colors">隐私说明</Link><Link href="/ai" className="hover:text-gold/70 transition-colors">AI 生成说明</Link></div><div className="space-y-1 text-xs text-paper-dark/35"><p>本站内容仅作传统文化参考，不替代医疗、法律、投资等专业意见；部分说明由 AI 辅助生成。</p><p>继续使用本站或发起服务，即表示您已阅读《用户协议》《隐私说明》《AI 生成说明》；未满18周岁请勿使用本服务。</p></div><p className="text-paper-dark/30 text-xs pt-4">善缘阁 · 一念慈悲，一灯长明</p></div></footer>);
}
