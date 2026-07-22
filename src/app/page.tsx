"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";
import { getAlmanacToday, type AlmanacData } from "@/lib/api";

type AlmanacSnapshot = Pick<AlmanacData["dateInfo"], "solar" | "weekday" | "lunar" | "rating" | "ratingText"> & {
  yi: string[];
  ji: string[];
};

const DEFAULT_ALMANAC: AlmanacSnapshot = {
  solar: "今日",
  weekday: "",
  lunar: "农历信息加载中",
  rating: "平",
  ratingText: "从容安排，诸事有度",
  yi: ["祈福", "静坐", "读书"],
  ji: ["急躁", "妄断"],
};

const RITUALS = [
  {
    href: "/almanac",
    step: "01",
    name: "翻开通胜",
    caption: "从宜忌与时辰里，为今日找好起点。",
    art: "/images/object-almanac-booklet-v1.png",
    artClass: "academy-object-book",
    action: "查看今日通胜",
  },
  {
    href: "/meditation",
    step: "02",
    name: "听一段静音",
    caption: "让钟钵与呼吸，把心慢慢带回当下。",
    art: "/images/object-meditation-bowl-v1.png",
    artClass: "academy-object-bowl",
    action: "开始静坐",
  },
  {
    href: "/lottery",
    step: "03",
    name: "请一支灵签",
    caption: "围绕此刻所问，留一份从容的参详。",
    art: "/images/object-fortune-tube-v1.png",
    artClass: "academy-object-tube",
    action: "抽取灵签",
  },
];

const PATHWAYS = [
  { code: "01", href: "/bazi", title: "八字精批", desc: "排盘、五行与流年参详" },
  { code: "02", href: "/divination", title: "六爻占卜", desc: "以卦象观察当下所问" },
  { code: "03", href: "/dream", title: "梦境参详", desc: "从梦境线索回看心绪" },
  { code: "04", href: "/palmistry", title: "手相 / 面相", desc: "由图像可见特征作文化参考" },
  { code: "05", href: "/naming", title: "宝宝起名", desc: "结合八字、音韵与典故" },
  { code: "06", href: "/temple", title: "一炷清香", desc: "为自己与家人致一份敬意" },
];

const MOBILE_NAV = [
  ["/qifu", "祈愿供灯"],
  ["/almanac", "今日通胜"],
  ["/lottery", "灵签解读"],
  ["/bazi", "八字精批"],
  ["/dream", "梦境参详"],
  ["/palmistry", "手相 / 面相"],
  ["/naming", "宝宝起名"],
  ["/divination", "六爻占卜"],
  ["/meditation", "静心禅坐"],
];

const CLASSIC_BOOKS = [
  ["渊海子平", "/books/classics/yuanhai-ziping.png"],
  ["三命通会", "/books/classics/sanming-tonghui.png"],
  ["滴天髓", "/books/classics/ditian-sui.png"],
  ["穷通宝鉴", "/books/classics/qiongtong-baojian.png"],
  ["子平真诠", "/books/classics/ziping-zhenquan.png"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [almanac, setAlmanac] = useState<AlmanacSnapshot>(DEFAULT_ALMANAC);

  useEffect(() => {
    let alive = true;
    getAlmanacToday().then((res) => {
      if (!alive || !res.success || !res.data) return;
      const { dateInfo, yi, ji } = res.data;
      setAlmanac({
        solar: dateInfo.solar,
        weekday: dateInfo.weekday,
        lunar: dateInfo.lunar,
        rating: dateInfo.rating,
        ratingText: dateInfo.ratingText,
        yi: yi.slice(0, 4),
        ji: ji.slice(0, 3),
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <>
      <MobileHeader menuOpen={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
      {menuOpen ? (
        <div className="fixed inset-x-0 top-[63px] z-40 border-b border-gold/15 bg-xuan/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <nav className="grid grid-cols-2 gap-1" aria-label="移动端功能导航">
            {MOBILE_NAV.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-paper-dark/75 hover:bg-gold/10 hover:text-gold">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      <main className="academy-home">
        <section className="academy-stage" aria-labelledby="academy-stage-title">
          <div className="academy-stage-copy">
            <p className="academy-kicker">善缘阁 · 今日案台</p>
            <h1 id="academy-stage-title">为心留一盏灯<br />为日子留一页白</h1>
            <p className="academy-stage-summary">不必急着找到答案。先从一段安静的时间、一件愿意认真完成的小事开始。</p>

            <div className="academy-day-ledger">
              <div className="academy-day-head">
                <span>今日通胜</span>
                <Link href="/almanac">查看完整 <i aria-hidden="true">↗</i></Link>
              </div>
              <div className="academy-day-date">
                <strong>{almanac.solar}</strong>
                <span>{almanac.weekday}</span>
              </div>
              <p className="academy-day-lunar">{almanac.lunar}</p>
              <div className="academy-day-details">
                <p><b>宜</b>{almanac.yi.join(" · ")}</p>
                <p><b>忌</b>{almanac.ji.join(" · ")}</p>
              </div>
            </div>

            <div className="academy-stage-actions">
              <Link href="/qifu" className="academy-primary-link">点亮祈愿灯 <span aria-hidden="true">→</span></Link>
              <Link href="/my" className="academy-plain-link">查看我的记录 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>

          <figure className="academy-stage-art">
            <img src="/images/home-daily-study-v2.png" alt="夜色书院中的案台与宫灯" />
            <figcaption>
              <span>今日心灯</span>
              <p>“心有一隅安静，万事便有余地。”</p>
            </figcaption>
          </figure>
        </section>

        <section className="academy-ritual-section" aria-labelledby="academy-ritual-title">
          <div className="academy-section-title">
            <div>
              <p>三件日课</p>
              <h2 id="academy-ritual-title">让心慢慢归位</h2>
            </div>
            <span>从一件开始，就很好</span>
          </div>
          <div className="academy-ritual-grid">
            {RITUALS.map((ritual) => (
              <Link key={ritual.href} href={ritual.href} className="academy-ritual-item">
                <span className="academy-ritual-number">{ritual.step}</span>
                <span className="academy-object-stage">
                  <img src={ritual.art} alt="" aria-hidden="true" className={ritual.artClass} />
                </span>
                <span className="academy-ritual-copy">
                  <strong>{ritual.name}</strong>
                  <small>{ritual.caption}</small>
                  <em>{ritual.action} <i aria-hidden="true">→</i></em>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="academy-pathways" aria-labelledby="academy-pathways-title">
          <div className="academy-pathway-intro">
            <p>参详门径</p>
            <h2 id="academy-pathways-title">为此刻，留一份文化参考</h2>
            <span>命理、卦象与梦境解读，皆不替代专业意见，只为让思考多一个安静的角度。</span>
          </div>
          <div className="academy-pathway-list">
            {PATHWAYS.map((item) => (
              <Link key={item.href} href={item.href} className="academy-pathway-row">
                <span>{item.code}</span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </div>
        </section>

        <section className="academy-library" aria-labelledby="academy-library-title">
          <div className="academy-library-copy">
            <p>典籍一隅</p>
            <h2 id="academy-library-title">古法不是结论<br />而是一面镜子</h2>
            <span>从《渊海子平》《滴天髓》《周易》等传统文本中，回看人的处境、节奏与选择。</span>
          </div>
          <div className="academy-book-shelf" aria-label="命理古籍">
            {CLASSIC_BOOKS.map(([title, src]) => (
              <figure key={title}>
                <img src={src} alt={`《${title}》书封`} loading="lazy" />
                <figcaption>{title}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="academy-lamp-final" aria-labelledby="academy-lamp-title">
          <img className="academy-lamp-courtyard" src="/images/home-courtyard-lantern-v1.png" alt="" aria-hidden="true" />
          <div className="academy-lamp-copy">
            <p>祈愿供灯</p>
            <h2 id="academy-lamp-title">把想说的话，安放在一盏灯里</h2>
            <span>为家人、为自己，在一段郑重的光里留下温和祝愿。</span>
            <div>
              <Link href="/qifu" className="academy-primary-link">点亮祈愿灯 <span aria-hidden="true">→</span></Link>
              <Link href="/qifu#lamp-wall" className="academy-plain-link">看看心愿灯墙 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <div className="academy-lamp-object" aria-hidden="true">
            <img src="/images/blessing-palace-lantern.png" alt="" />
          </div>
        </section>
      </main>

      <footer className="academy-footer">
        <div>
          <p>善缘阁 · 一念澄明，一灯长明</p>
          <span>本站内容仅作传统文化参考</span>
        </div>
        <nav>
          <Link href="/terms">用户协议</Link>
          <Link href="/privacy">隐私说明</Link>
          <Link href="/ai">AI 生成说明</Link>
        </nav>
      </footer>
    </>
  );
}

function MobileHeader({ menuOpen, onToggle }: { menuOpen: boolean; onToggle: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gold/15 bg-xuan/95 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <img src="/favicon.svg" alt="善缘阁" className="size-8" />
        <span className="font-display text-lg tracking-[0.15em] text-gold">善缘阁</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <MusicButton />
        <AccountButton />
        <InstallAppButton />
        <button type="button" onClick={onToggle} aria-label={menuOpen ? "关闭导航" : "打开导航"} className="inline-flex size-9 items-center justify-center rounded-full border border-gold/25 text-paper-dark">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {menuOpen ? <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
          </svg>
        </button>
      </div>
    </header>
  );
}
