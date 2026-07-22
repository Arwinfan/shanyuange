"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountButton, InstallAppButton, MusicButton } from "@/lib/pwa";

type IconName = "home" | "lamp" | "calendar" | "lot" | "bazi" | "dream" | "face" | "name" | "hexagram" | "meditate" | "temple" | "feedback";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const DAILY_ITEMS: NavItem[] = [
  { href: "/", label: "今日修行", icon: "home" },
  { href: "/almanac", label: "今日通胜", icon: "calendar" },
  { href: "/qifu", label: "祈愿供灯", icon: "lamp" },
  { href: "/temple", label: "一炷清香", icon: "temple" },
];

const STUDY_ITEMS: NavItem[] = [
  { href: "/lottery", label: "灵签解读", icon: "lot" },
  { href: "/bazi", label: "八字精批", icon: "bazi" },
  { href: "/divination", label: "六爻占卜", icon: "hexagram" },
  { href: "/dream", label: "梦境参详", icon: "dream" },
  { href: "/palmistry", label: "手面相", icon: "face" },
  { href: "/naming", label: "宝宝起名", icon: "name" },
  { href: "/meditation", label: "静心禅坐", icon: "meditate" },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="site-shell">
      <aside className="site-sidebar hidden lg:flex" aria-label="主导航">
        <Link href="/" className="site-brand">
          <span className="site-brand-mark" aria-hidden="true">
            <img src="/favicon.svg" alt="" className="size-7" />
          </span>
          <span>
            <strong>善缘阁</strong>
            <small>心安之所</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="功能导航">
          <NavGroup label="日课" items={DAILY_ITEMS} pathname={pathname} />
          <NavGroup label="参详" items={STUDY_ITEMS} pathname={pathname} />
        </nav>

        <div className="site-sidebar-bottom">
          <Link href="/feedback" className={`site-nav-item site-feedback-link${isCurrentPath(pathname, "/feedback") ? " is-active" : ""}`}>
            <SiteGlyph name="feedback" />
            <span>意见反馈</span>
          </Link>
          <div className="site-sidebar-actions" aria-label="快捷操作">
            <MusicButton />
            <AccountButton />
            <InstallAppButton />
          </div>
          <p>一念澄明，万事从容</p>
        </div>
      </aside>

      <div className="site-content">{children}</div>
    </div>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="site-nav-group">
      <p>{label}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = isCurrentPath(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`site-nav-item${active ? " is-active" : ""}`}>
              <SiteGlyph name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SiteGlyph({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.65,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...common}>
      {name === "home" && <><path d="m3 10 9-7 9 7" /><path d="M5.5 9.5V21h13V9.5" /><path d="M9.5 21v-6h5v6" /></>}
      {name === "lamp" && <><path d="M12 3v3" /><path d="M8 7h8" /><path d="M7 7c.2 5 1.6 8.2 5 8.2S16.8 12 17 7" /><path d="M8.5 17h7" /><path d="M12 15.2V21" /><path d="M10.5 21h3" /></>}
      {name === "calendar" && <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9h17M8 13h3M13 13h3M8 17h3" /></>}
      {name === "lot" && <><path d="M7 3h10l-1.2 17H8.2L7 3Z" /><path d="M9 7h6M9.5 11.5h5M10 15.5h4" /></>}
      {name === "bazi" && <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></>}
      {name === "dream" && <><path d="M5 18.5c0-3.5 2.8-6.3 6.3-6.3 3.5 0 6.2 2.5 6.2 5.6 0 1.5-.6 2.3-1.6 2.3-1.2 0-1.9-1.1-1.7-2.6" /><path d="M5 9c.6-2.7 2.7-4.5 5.5-4.5 2.4 0 4.4 1.3 5.2 3.4" /><path d="M5.8 5.5c1.2-1.3 2.8-2 4.6-2" /></>}
      {name === "face" && <><path d="M12 3.5c-4 0-6.5 2.8-6.5 7.3 0 4.7 2.8 9.7 6.5 9.7s6.5-5 6.5-9.7c0-4.5-2.5-7.3-6.5-7.3Z" /><path d="M9.2 11h.1M14.7 11h.1M9.5 15.2c1.4.8 3.6.8 5 0" /></>}
      {name === "name" && <><path d="M5 4.5h14M7 8.5h10M8 4.5c.2 5.7-1.1 9.8-3.4 12.2M16 4.5c-.2 5.7 1.1 9.8 3.4 12.2M7.2 14.5h9.6" /></>}
      {name === "hexagram" && <><path d="M5 5h14M5 9h5M14 9h5M5 13h14M5 17h5M14 17h5" /></>}
      {name === "meditate" && <><circle cx="12" cy="5.5" r="2.2" /><path d="M8.5 11.5c1.5-1.1 5.5-1.1 7 0l2.5 2.2M9 13.2 5 18M15 13.2l4 4.8M8 20h8M12 8v5.3" /></>}
      {name === "temple" && <><path d="m4 9 8-5 8 5M6 9v9M10 9v9M14 9v9M18 9v9M4 19h16M3 22h18" /></>}
      {name === "feedback" && <><path d="M5 5.5h14v10H10l-4 3v-3H5z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></>}
    </svg>
  );
}
