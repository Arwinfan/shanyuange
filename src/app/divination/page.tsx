"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fortuneDivination, getQuotaToday, payOrderAndGetRecord } from "@/lib/api";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type Master = "huiming" | "mingxin" | "xuanzhen";

const MASTERS = [
  { id: "huiming" as const, emoji: "🧘", name: "慧照长老", title: "古寺住持", style: "庄重持重，引经据典", desc: "通读《渊海子平》《滴天髓》，言语稳重克制。适合希望深度解读、看古籍出处的施主。" },
  { id: "mingxin" as const, emoji: "🙏", name: "明净师父", title: "尼众法师", style: "慈悲温柔，劝人向善", desc: "语调温和，慈悲为怀。适合家庭、感情、亲人祈福场景。" },
  { id: "xuanzhen" as const, emoji: "☯️", name: "玄清道长", title: "山中道人", style: "直爽通透，说大白话", desc: "山中道人，不爱绕弯子。把命理讲成大白话，适合急性子。" },
];

export default function DivinationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [master, setMaster] = useState<Master>("huiming");
  const [question, setQuestion] = useState("");
  const [shaking, setShaking] = useState(false);
  const [quotaText, setQuotaText] = useState("1/1");
  const [trialActive, setTrialActive] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; amount: number } | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const refreshQuota = async () => {
    const res = await getQuotaToday("fortune_divination");
    const quota = res.data?.items?.[0];
    if (quota) setQuotaText(`${quota.remaining}/${quota.total}`);
    if (res.data?.trial) setTrialActive(res.data.trial.active);
  };

  useEffect(() => {
    refreshQuota().catch(() => {});
  }, []);

  const handleShake = async () => {
    if (!question.trim()) {
      setResult({ error: "请先写下要问的事，再开始起卦。" });
      return;
    }
    setShaking(true);
    setResult(null);
    setPendingOrder(null);
    try {
      const res = await fortuneDivination(master, question || undefined);
      await new Promise(r => setTimeout(r, 2000)); // 保留动画时长
      if (res.success) {
        setResult(res.data?.fullResult || res.data?.preview);
        if (res.data?.orderId) setPendingOrder({ orderId: res.data.orderId, amount: res.data.amount });
        if (res.data?.quota) setQuotaText(`${res.data.quota.remaining}/${res.data.quota.total}`);
        if (res.data?.trial) setTrialActive(res.data.trial.active);
      } else {
        setResult({ error: res.message || "起卦失败" });
      }
    } catch {
      setResult({ error: "服务暂时不可用，请稍后重试" });
    }
    setShaking(false);
  };

  const handleUnlock = async () => {
    if (!pendingOrder) return;
    setUnlocking(true);
    try {
      const res = await payOrderAndGetRecord(pendingOrder.orderId);
      if (res.success && res.data?.fullResult) {
        setResult(res.data.fullResult);
        setPendingOrder(null);
      } else {
        setResult({ error: res.message || "解锁失败，请稍后重试" });
      }
    } catch {
      setResult({ error: "服务暂时不可用，请稍后重试" });
    }
    setUnlocking(false);
  };

  const resetResult = () => {
    setResult(null);
    setPendingOrder(null);
  };

  const ctaLabel = trialActive ? "15 天免费试运营 · 点击抽签" : quotaText.startsWith("0/") ? "今日免费已用完 · 加抽 ¥2.9" : "点击抽签";

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      <SiteHeader current="divination" menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {menuOpen && <MobileMenu current="divination" />}

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* Title */}
          <section className="text-center space-y-4">
            <div className="relative flex justify-center mb-2">
              <div className={`${shaking ? "animate-taiji-spin" : ""}`}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="none" stroke="#d6b16c" strokeWidth="0.8" opacity="0.25"/>
                  <circle cx="32" cy="32" r="22" fill="none" stroke="#d6b16c" strokeWidth="0.5" opacity="0.12"/>
                  <line x1="32" y1="10" x2="32" y2="54" stroke="#d6b16c" strokeWidth="0.6" opacity="0.5"/>
                  <line x1="10" y1="32" x2="54" y2="32" stroke="#d6b16c" strokeWidth="0.6" opacity="0.5"/>
                  <line x1="16.4" y1="16.4" x2="47.6" y2="47.6" stroke="#d6b16c" strokeWidth="0.4" opacity="0.3"/>
                  <line x1="47.6" y1="16.4" x2="16.4" y2="47.6" stroke="#d6b16c" strokeWidth="0.4" opacity="0.3"/>
                  <circle cx="17" cy="17" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="47" cy="47" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="17" cy="47" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="47" cy="17" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="32" cy="17" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="32" cy="47" r="1.5" fill="#d6b16c" opacity="0.4"/>
                  <circle cx="17" cy="32" r="1.5" fill="#d6b16c" opacity="0.3"/>
                  <circle cx="47" cy="32" r="1.5" fill="#d6b16c" opacity="0.3"/>
                </svg>
              </div>
            </div>
            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">六爻占卜</h1>
            <p className="text-paper-dark/70 text-base">心诚则灵 · 摇动签筒 · 六爻成卦</p>

            {/* Free count */}
            <div className="inline-flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-900/20 text-emerald-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5h4.8l-3.9 2.8 1.5 4.7-3.9-2.8-3.9 2.8 1.5-4.7-3.9-2.8h4.8z"/></svg>
                {trialActive ? <>15 天免费试运营 <span className="font-semibold text-white">进行中</span></> : <>今日免费 <span className="font-semibold text-white">{quotaText}</span></>}
              </span>
            </div>
          </section>

          {/* Master */}
          <section className="space-y-4">
            <p className="text-center text-base text-paper-dark/80">请选一位师父为您开示</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MASTERS.map(m => {
                const selected = master === m.id;
                return (
                  <button key={m.id} onClick={() => setMaster(m.id)}
                    className={`group rounded-xl border p-4 text-left transition-all ${
                      selected ? "border-gold/60 bg-gold/10 shadow-gold" : "border-gold/20 bg-xuan-surface/40 hover:border-gold/40 hover:bg-xuan-surface/70"
                    }`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <p className="font-display text-lg text-gold/90 mt-2">{m.name}</p>
                    <p className="text-xs text-paper-dark/50">{m.title}</p>
                    <p className="text-sm text-paper-dark/70 mt-2">{m.style}</p>
                    <p className="text-xs text-paper-dark/50 mt-1 leading-relaxed">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Question */}
          <section className="space-y-3">
            <p className="text-center text-base text-paper-dark/80">默念心中所问，写下您要问的事</p>
            <textarea value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="例如：这次出行是否顺利？" rows={4}
              className="w-full rounded-md border border-gold/20 bg-xuan-surface px-4 py-3 text-base text-paper-dark placeholder:text-paper-dark/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30 resize-none transition-colors" />
            <p className="text-center text-sm text-paper-dark/50">先静心默念，再摇签筒，一卦一事。</p>
          </section>

          {/* Divination Tube */}
          <section className="space-y-4">
            <div className="rounded-lg border border-gold/20 bg-xuan-card/95 p-5 text-center shadow-paper md:p-6">
              <p className="mb-4 text-sm tracking-[0.2em] text-paper-dark/45">━━ 关圣帝君 · 灵签筒 ━━</p>
              <DivinationTube shaking={shaking} />
              <p className="mt-4 text-sm text-paper-dark/55">
                {shaking ? "签筒摇动中，静待一卦成形" : "点击抽签后，签筒会摇动并抽出一支灵签。"}
              </p>
            </div>

            {/* Shake Button */}
            <div className="text-center">
              <button onClick={handleShake} disabled={shaking}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vermillion px-12 py-4 text-xl text-white font-medium tracking-wider shadow-lg shadow-vermillion/20 hover:bg-vermillion-light active:bg-vermillion-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {shaking ? (
                  <>
                    <svg className="animate-spin size-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="8" strokeLinecap="round"/></svg>
                    摇签中...
                  </>
                ) : ctaLabel}
              </button>
            </div>
          </section>

          {(result || pendingOrder) && (
            <DivinationResult result={result} pendingOrder={pendingOrder} unlocking={unlocking} onUnlock={handleUnlock} onReset={resetResult} question={question || "未设问题"} />
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function DivinationTube({ shaking }: { shaking: boolean }) {
  return (
    <div
      className="relative mx-auto flex h-[320px] max-w-md items-center justify-center overflow-hidden rounded-xl border border-gold/10 bg-[radial-gradient(circle_at_50%_43%,rgba(214,177,108,0.2),transparent_50%),linear-gradient(180deg,rgba(18,15,11,0.06),rgba(18,15,11,0.44))]"
      aria-hidden="true"
    >
      <div className={`absolute inset-0 ${shaking ? "animate-divination-glow-pulse" : ""}`} />
      <div className="absolute bottom-6 h-6 w-52 rounded-full bg-black/40 blur-md" />
      <div className={`relative origin-bottom ${shaking ? "animate-divination-tube-pop" : ""}`}>
        <img
          src="/images/divination-qiantong-v2.png"
          alt="古法竹制签筒"
          className={`relative z-10 h-[292px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.46)] ${shaking ? "animate-divination-tube-shake" : ""}`}
        />
        {shaking && <span className="animate-divination-spark absolute left-[14%] top-[33%] size-1.5 rounded-full bg-gold shadow-[0_0_12px_rgba(248,217,138,0.95)]" />}
      </div>
    </div>
  );
}

function DivinationResult({
  result,
  pendingOrder,
  unlocking,
  onUnlock,
  onReset,
  question,
}: {
  result: any;
  pendingOrder: { orderId: string; amount: number } | null;
  unlocking: boolean;
  onUnlock: () => void;
  onReset: () => void;
  question: string;
}) {
  if (result?.error) {
    return <p className="rounded-lg border border-vermillion/30 bg-vermillion/10 p-4 text-sm text-vermillion-light">{result.error}</p>;
  }

  const original = result?.original_hexagram || { name: result?.hexagram || "本卦", unicode: "卦" };
  const changed = result?.changed_hexagram || { name: "待解锁", unicode: "变" };
  const references = Array.isArray(result?.references) ? result.references : [];
  const keyChanges = Array.isArray(result?.keyChanges) ? result.keyChanges : [];
  const lineTexts = Array.isArray(result?.lineTexts) ? result.lineTexts : [];
  const actionAdvice = Array.isArray(result?.actionAdvice) ? result.actionAdvice : [];

  return (
    <section className="rounded-xl border border-gold/30 bg-xuan-card/95 p-5 shadow-paper space-y-6">
      <div className="text-center">
        <p className="font-display text-3xl tracking-widest text-gold">卦象解读</p>
        <p className="mt-2 text-base text-paper-dark/70">所问：{question}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HexagramPanel label="本卦" name={original.name} unicode={original.unicode} />
        <div className="flex items-center justify-center rounded-xl border border-vermillion/40 bg-vermillion/10 p-5 text-center">
          <div>
            <p className="text-sm text-vermillion-light">动爻</p>
            <p className="mt-1 font-display text-3xl text-vermillion-light">第 {result?.changing_line || "?"} 爻</p>
            <p className="mt-2 text-sm text-paper-dark/70">{result?.changing_line_text || "变化处待观"}</p>
          </div>
        </div>
        <HexagramPanel label="变卦" name={changed.name} unicode={changed.unicode} />
      </div>

      {Array.isArray(result?.lines) && <LineStack lines={result.lines} />}

      {(result?.shiYing || keyChanges.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {result?.shiYing && (
            <div className="rounded-lg border border-gold/15 bg-xuan-surface/30 p-4">
              <p className="text-sm text-gold/80">世应</p>
              <p className="mt-2 text-sm leading-relaxed text-paper-dark/70">{result.shiYing.shi} · {result.shiYing.ying}</p>
              <p className="mt-1 text-xs leading-relaxed text-paper-dark/45">{result.shiYing.note}</p>
            </div>
          )}
          {keyChanges.length > 0 && (
            <div className="rounded-lg border border-gold/15 bg-xuan-surface/30 p-4">
              <p className="text-sm text-gold/80">关键变化</p>
              <div className="mt-2 space-y-1 text-sm leading-relaxed text-paper-dark/70">
                {keyChanges.map((item: string, index: number) => <p key={index}>{item}</p>)}
              </div>
            </div>
          )}
        </div>
      )}

      {lineTexts.length > 0 && (
        <div className="rounded-lg border border-gold/15 bg-xuan-surface/30 p-4">
          <p className="text-sm text-gold/80">六亲六神</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {lineTexts.map((item: any) => (
              <p key={item.line} className="rounded-md border border-gold/10 bg-xuan-card/35 px-3 py-2 text-xs leading-relaxed text-paper-dark/60">
                {item.name} · {item.relation} · {item.god}{item.moving ? " · 动" : ""}：{item.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {(result?.judgment || result?.summary) && (
        <div className="rounded-lg border border-gold/25 bg-xuan-surface/40 px-5 py-4 text-center">
          <p className="font-display text-lg leading-relaxed text-paper-dark/80">
            {result?.judgment ? `《${original.name}》卦辞：${result.judgment}` : result.summary}
          </p>
        </div>
      )}

      {result?.original && <ResultSection title="本卦" text={result.original} />}
      {result?.changing && <ResultSection title="动爻与变卦" text={result.changing} />}
      {result?.interpretation && <ResultSection title="综合卦解" text={result.interpretation} />}
      {result?.advice && <ResultSection title="师父建议" text={result.advice} />}

      {actionAdvice.length > 0 && (
        <div className="rounded-lg border border-gold/10 bg-xuan-surface/30 p-4">
          <p className="text-sm text-gold/80">行动建议</p>
          <div className="mt-2 space-y-1 text-sm leading-relaxed text-paper-dark/70">
            {actionAdvice.map((item: string, index: number) => <p key={index}>{item}</p>)}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className="space-y-3">
          <p className="text-center text-sm text-gold">古籍佐证</p>
          {references.map((ref: any, index: number) => (
            <blockquote key={`${ref.book}-${ref.chapter}-${index}`} className="rounded-lg border-l-4 border-gold/50 bg-xuan-surface/40 px-5 py-3 text-sm italic leading-relaxed text-paper-dark/70">
              <span className="text-gold">《{ref.book}{ref.chapter ? ` · ${ref.chapter}` : ""}》：</span>{ref.quote}
            </blockquote>
          ))}
        </div>
      )}

      {result?.culturalNote && <p className="text-xs leading-relaxed text-paper-dark/40">{result.culturalNote}</p>}

      {pendingOrder && (
        <button onClick={onUnlock} disabled={unlocking}
          className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm text-gold hover:bg-gold/15 disabled:opacity-60">
          {unlocking ? "支付处理中..." : `立即支付 ¥${pendingOrder.amount} · 查看完整卦解`}
        </button>
      )}
      {!pendingOrder && (
        <div className="flex justify-center pt-2">
          <button onClick={onReset} className="rounded-lg border border-gold/30 bg-xuan-surface/40 px-5 py-2.5 text-sm text-gold hover:bg-gold/10">
            再摇一卦
          </button>
        </div>
      )}
    </section>
  );
}

function HexagramPanel({ label, name, unicode }: { label: string; name: string; unicode: string }) {
  return (
    <div className="rounded-xl border border-gold/25 bg-xuan-surface/40 p-5 text-center">
      <p className="text-sm text-gold/80">{label}</p>
      <p className="mt-2 text-5xl text-gold">{unicode}</p>
      <p className="mt-2 font-display text-xl text-paper-dark">{name}</p>
    </div>
  );
}

function LineStack({ lines }: { lines: number[] }) {
  return (
    <div className="rounded-xl border border-gold/15 bg-xuan-surface/35 px-4 py-5">
      <p className="mb-3 text-center text-sm text-paper-dark/65">六爻已成</p>
      <div className="mx-auto flex max-w-xs flex-col-reverse gap-2">
        {lines.map((line, index) => {
          const yang = line === 7 || line === 9;
          return (
            <div key={`${line}-${index}`} className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
              <span className="text-xs text-paper-dark/40">第 {index + 1} 爻</span>
              {yang ? (
                <span className="h-2 rounded-full bg-gold/80" />
              ) : (
                <span className="grid grid-cols-2 gap-5"><i className="h-2 rounded-full bg-gold/80" /><i className="h-2 rounded-full bg-gold/80" /></span>
              )}
              <span className="text-xs text-paper-dark/40">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-xuan-surface/30 p-4">
      <p className="text-sm text-gold/80">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-paper-dark/70">{text}</p>
    </div>
  );
}

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
