"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AccountButton, InstallAppButton } from "@/lib/pwa";

const MEDITATION_STATS_KEY = "putiyuan_meditation_stats_v1";

type MeditationStats = {
  today: string;
  todaySeconds: number;
  totalSeconds: number;
};

const TRACKS = [
  {
    emoji: "🧘",
    title: "钵音一响",
    desc: "短声清越·入座提示",
    duration: "0:13",
    type: "钵音",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/25/SingingBowl1.ogg",
  },
  {
    emoji: "🔔",
    title: "钵音回响",
    desc: "空钵余韵·慢慢散开",
    duration: "0:09",
    type: "钵音",
    src: "https://upload.wikimedia.org/wikipedia/commons/6/64/SingingBowl2.ogg",
  },
  {
    emoji: "🏯",
    title: "清钟一叩",
    desc: "钟声悠长·收摄杂念",
    duration: "0:18",
    type: "钟声",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Striking_a_bell_15cm_large.ogg",
  },
  {
    emoji: "☯️",
    title: "铜锣余音",
    desc: "低沉泛音·沉入呼吸",
    duration: "0:08",
    type: "铜锣",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Gong55.ogg",
  },
  {
    emoji: "🎐",
    title: "风铃入静",
    desc: "微风轻响·心念放缓",
    duration: "0:22",
    type: "风铃",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/28/Windchime.ogg",
  },
  {
    emoji: "🌙",
    title: "空灵风铃",
    desc: "清音层叠·适合静坐",
    duration: "0:19",
    type: "风铃",
    src: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Windglockenspiel.Koshi.ogg",
  },
  {
    emoji: "🏯",
    title: "灵隐梵音",
    desc: "寺院远诵·清净入耳",
    duration: "1:03",
    type: "寺院梵音",
    src: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Chanting_at_Lingyin_Temple%2C_Hangzhou.ogg",
  },
  {
    emoji: "📿",
    title: "楞严咒引",
    desc: "短段咒音·净念初起",
    duration: "0:30",
    type: "咒音",
    src: "https://upload.wikimedia.org/wikipedia/commons/4/41/Buddhism_Shurangama_dharani_chant_120_150.ogg",
  },
  {
    emoji: "🪷",
    title: "白伞盖咒",
    desc: "梵文持诵·绵密安定",
    duration: "2:50",
    type: "咒音",
    src: "https://upload.wikimedia.org/wikipedia/commons/5/55/Usnidha_Sitatapatra_dharani%2C_Siddham_chant_and_Buddhist_Sanskrit_mantra_chant_420_590.ogg",
  },
  {
    emoji: "🙏",
    title: "白伞盖咒·长诵",
    desc: "深沉梵声·适合静坐",
    duration: "2:15",
    type: "咒音",
    src: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Usnidha_Sitatapatra_dharani%2C_Siddham_chant_and_Buddhist_Sanskrit_mantra_chant_2_long_version_1075_1210.ogg",
  },
  {
    emoji: "🕯️",
    title: "尼泊尔祈愿",
    desc: "寺中祈声·缓缓归心",
    duration: "2:26",
    type: "寺院梵音",
    src: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Buddhist_prayer_in_Nepal.ogg",
  },
  {
    emoji: "☸️",
    title: "巴利清诵",
    desc: "比丘诵戒·长时禅修",
    duration: "34:27",
    type: "传统诵经",
    src: "https://upload.wikimedia.org/wikipedia/commons/6/69/Bhikkhu_P%C4%81%E1%B9%ADimokkha_Pali.ogg",
  },
];

const GUIDES = [
  {
    title: "十分钟入门", subtitle: "适合初学者", duration: "10 分钟",
    steps: ["盘腿端坐，背挺直", "深呼吸三次，吸气数 4 秒，呼气数 6 秒", "把注意力放在鼻尖呼吸的进出", "杂念升起时不评判，温柔回到呼吸", "结束时双手合掌，回向众生"],
  },
  {
    title: "二十分钟正念", subtitle: "进阶练习", duration: "20 分钟",
    steps: ["三下吐纳调息", "观呼吸：注意力锁定鼻尖出入气", "扫描身体：从头顶到脚趾，依次放松每一处", "观念头来去：见妄念升起即知见，不跟随", "回向：愿一切众生离苦得乐"],
  },
  {
    title: "南无阿弥陀佛", subtitle: "持名念佛", duration: "15 分钟",
    steps: ["盘坐，掐念珠或合掌", "心中默念或低声出声「南无阿弥陀佛」六字", "字字分明、心心相续", "杂念起，回到佛号", "下座前合掌回向"],
  },
];

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMeditationTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const restSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(restSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

function getInitialStats(): MeditationStats {
  return {
    today: getTodayKey(),
    todaySeconds: 0,
    totalSeconds: 0,
  };
}

function readStoredStats(): MeditationStats {
  const today = getTodayKey();

  try {
    const raw = window.localStorage.getItem(MEDITATION_STATS_KEY);
    if (!raw) return { today, todaySeconds: 0, totalSeconds: 0 };

    const parsed = JSON.parse(raw) as Partial<MeditationStats>;
    const totalSeconds = Number.isFinite(Number(parsed.totalSeconds))
      ? Math.max(0, Math.floor(Number(parsed.totalSeconds)))
      : 0;
    const storedToday = typeof parsed.today === "string" ? parsed.today : today;
    const todaySeconds =
      storedToday === today && Number.isFinite(Number(parsed.todaySeconds))
        ? Math.max(0, Math.floor(Number(parsed.todaySeconds)))
        : 0;

    return { today, todaySeconds, totalSeconds };
  } catch {
    return { today, todaySeconds: 0, totalSeconds: 0 };
  }
}

export default function MeditationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playError, setPlayError] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [stats, setStats] = useState<MeditationStats>(getInitialStats);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setStats(readStoredStats());
  }, []);

  useEffect(() => {
    if (!isAudioPlaying) return;
    const timer = window.setInterval(updateProgress, 120);
    return () => window.clearInterval(timer);
  }, [isAudioPlaying]);

  useEffect(() => {
    if (!isAudioPlaying) return;

    const timer = window.setInterval(() => {
      setSessionSeconds((seconds) => seconds + 1);
      setStats((current) => {
        const today = getTodayKey();
        const todayBase = current.today === today ? current.todaySeconds : 0;
        const nextStats = {
          today,
          todaySeconds: todayBase + 1,
          totalSeconds: current.totalSeconds + 1,
        };

        window.localStorage.setItem(MEDITATION_STATS_KEY, JSON.stringify(nextStats));
        return nextStats;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isAudioPlaying]);

  const updateProgress = () => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      setProgress(0);
      return;
    }
    setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
  };

  const playTrack = async (index: number, restart = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    const track = TRACKS[index];
    if (playing !== index) {
      audio.src = track.src;
      audio.currentTime = 0;
      setProgress(0);
    } else if (restart) {
      audio.currentTime = 0;
      setProgress(0);
    }
    audio.loop = true;
    setPlaying(index);
    setPlayError("");

    try {
      await audio.play();
      setIsAudioPlaying(true);
    } catch {
      setIsAudioPlaying(false);
      setPlayError("当前浏览器未能加载该音频，请稍后重试或切换其他曲目。");
    }
  };

  const handleTrackClick = async (index: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing === index && isAudioPlaying) {
      audio.pause();
      return;
    }

    await playTrack(index);
  };

  const handleMusicToggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      audio.pause();
      return;
    }

    await playTrack(playing ?? 0);
  };

  return (
    <div className="min-h-screen bg-xuan flex flex-col">
      <SiteHeader
        current="meditation"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isAudioPlaying={isAudioPlaying}
        progress={progress}
        onMusicToggle={handleMusicToggle}
      />
      {menuOpen && <MobileMenu current="meditation" />}

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-20">
        <div className="space-y-section">
          {/* Hero */}
          <section className="text-center space-y-4">
            <div className="text-5xl mb-2">🪷</div>
            <h1 className="font-display text-[40px] tracking-[0.1em] text-gold">静心禅坐</h1>
            <p className="text-paper-dark/60 text-sm italic">一念心生 · 一念心灭 · 但有觉知 · 莫住莫离</p>
            <div className="text-paper-dark/40 text-sm space-y-1">
              <p>「上善若水，水善利万物而不争」</p>
              <p className="text-xs">— 《道德经》</p>
            </div>
          </section>

          <section aria-label="禅修时间" className="grid grid-cols-3 gap-2 rounded-2xl border border-gold/15 bg-xuan-surface/35 p-2">
            {[
              { label: "本次", value: sessionSeconds },
              { label: "今日", value: stats.todaySeconds },
              { label: "累计", value: stats.totalSeconds },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-xuan-card/55 px-3 py-3 text-center">
                <p className="text-xs text-paper-dark/45">{item.label}</p>
                <p className="mt-1 font-display text-lg text-gold">{formatMeditationTime(item.value)}</p>
              </div>
            ))}
          </section>

          {/* Music Library */}
          <section className="space-y-4">
            <h2 className="font-display text-xl text-gold text-center">禅音曲库</h2>
            <audio
              ref={audioRef}
              onLoadedMetadata={updateProgress}
              onTimeUpdate={updateProgress}
              onPlay={() => setIsAudioPlaying(true)}
              onPause={() => setIsAudioPlaying(false)}
              onEnded={() => {
                setIsAudioPlaying(false);
                setProgress(0);
              }}
              preload="none"
            />
            {playError && (
              <p className="rounded-md border border-vermillion/30 bg-vermillion/10 px-4 py-3 text-sm text-vermillion-light">
                {playError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {TRACKS.map((t, i) => {
                const isPlaying = playing === i;
                return (
                  <div key={t.title}
                    className={`min-h-[76px] rounded-xl border transition-all ${
                      isPlaying ? "border-gold/60 bg-gold/10" : "border-gold/15 bg-xuan-surface/40 hover:border-gold/30 hover:bg-xuan-surface/70"
                    }`}>
                    <button onClick={() => handleTrackClick(i)}
                      className="flex h-full min-h-[76px] w-full items-center gap-3 p-3 text-left">
                      <span className={`shrink-0 text-2xl leading-none ${isPlaying && isAudioPlaying ? "animate-[bounce_1s_ease-in-out_infinite]" : ""}`}>{t.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-base leading-5 text-gold/90 truncate">{t.title}</p>
                        <p className="mt-1 truncate text-sm leading-5 text-paper-dark/50">{t.desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm leading-5 ${isPlaying ? "text-gold" : "text-paper-dark/50"}`}>{isPlaying ? (isAudioPlaying ? "▶ 播放中" : "Ⅱ 已暂停") : t.duration}</p>
                        <p className="text-xs leading-4 text-paper-dark/35">{t.type}</p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Meditation Guides */}
          <section className="space-y-4">
            <h2 className="font-display text-xl text-gold text-center">禅修引导</h2>
            <div className="space-y-4">
              {GUIDES.map((g, i) => (
                <div key={i} className="rounded-lg border border-gold/15 bg-xuan-card/60 p-5 shadow-paper space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg text-gold/90">{g.title}</p>
                      <p className="text-sm text-paper-dark/50">{g.subtitle}</p>
                    </div>
                    <span className="rounded-full border border-gold/20 bg-gold/5 px-3 py-1 text-sm text-gold/80">{g.duration}</span>
                  </div>
                  <ol className="space-y-2">
                    {g.steps.map((s, j) => (
                      <li key={j} className="flex gap-2 text-sm text-paper-dark/60">
                        <span className="text-gold/60 shrink-0">{j + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

    </div>
  );
}

function SiteHeader({
  current,
  menuOpen,
  setMenuOpen,
  isAudioPlaying,
  progress,
  onMusicToggle,
}: {
  current: string;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isAudioPlaying: boolean;
  progress: number;
  onMusicToggle: () => void;
}) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  const progressDeg = Math.max(0, Math.min(100, progress)) * 3.6;
  return (<header className="fixed top-0 inset-x-0 z-50 pt-[9px]"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 h-[54px]"><Link href="/" className="flex items-center gap-2 shrink-0"><img src="/favicon.svg" alt="善缘阁" className="size-8" /><span className="font-display text-lg tracking-[0.15em] text-gold hidden sm:inline">善缘阁</span></Link><nav className="hidden md:flex items-center gap-5 text-sm text-paper-dark/75">{nav.map(n=><Link key={n.href} href={n.href} className={n.href===`/${current}`?"text-gold":"hover:text-gold transition-colors"}>{n.label}</Link>)}</nav><div className="flex items-center gap-2"><button onClick={onMusicToggle} aria-label={isAudioPlaying ? "暂停音乐" : "播放音乐"} title={isAudioPlaying ? "暂停音乐" : "播放音乐"} className="relative inline-flex size-10 items-center justify-center rounded-full p-[2px] text-paper-dark transition-colors hover:text-gold" style={{ background: `conic-gradient(#d6b16c ${progressDeg}deg, rgba(214,177,108,0.22) 0deg)` }}><span className="inline-flex size-full items-center justify-center rounded-full border border-gold/20 bg-xuan text-current">{isAudioPlaying ? (<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>)}</span></button><AccountButton /><InstallAppButton /><button onClick={()=>setMenuOpen(!menuOpen)} className="md:hidden flex size-8 items-center justify-center rounded-full border border-gold/30 text-gold/70 hover:bg-gold/10 hover:text-gold transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{menuOpen?(<><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>):(<><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>)}</svg></button></div></div><div className="h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent"/></header>);
}
function MobileMenu({ current }: { current: string }) {
  const nav = [{ href: "/qifu", label: "为家人祈福" },{ href: "/almanac", label: "今日黄历" },{ href: "/lottery", label: "求灵签" },{ href: "/bazi", label: "八字精批" },{ href: "/dream", label: "周公解梦" },{ href: "/palmistry", label: "手相/面相" },{ href: "/naming", label: "宝宝起名" },{ href: "/divination", label: "六爻占卜" },{ href: "/meditation", label: "静心禅坐" }];
  return (<div className="fixed inset-x-0 top-[63px] z-40 bg-xuan/95 backdrop-blur-md border-b border-gold/10 md:hidden animate-fadeInDown"><nav className="flex flex-col p-4 space-y-1">{nav.map(n=><Link key={n.href} href={n.href} className={`py-3 px-4 rounded-lg ${n.href===`/${current}`?"text-gold bg-gold/5":"text-paper-dark/80 hover:bg-gold/5 hover:text-gold"}`}>{n.label}</Link>)}</nav></div>);
}
