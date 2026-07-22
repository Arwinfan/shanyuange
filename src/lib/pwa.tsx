"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureUser, getAccountName } from "@/lib/api";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const musicListeners = new Set<(state: MusicState) => void>();
const DEFAULT_MUSIC_SRC = "https://upload.wikimedia.org/wikipedia/commons/2/25/SingingBowl1.ogg";

type MusicState = {
  playing: boolean;
  progress: number;
};

let musicAudio: HTMLAudioElement | null = null;
let musicState: MusicState = {
  playing: false,
  progress: 0,
};

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function notifyMusicListeners() {
  musicListeners.forEach((listener) => listener(musicState));
}

function setMusicState(next: Partial<MusicState>) {
  musicState = { ...musicState, ...next };
  notifyMusicListeners();
}

function syncMusicProgress() {
  const audio = musicAudio;
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    setMusicState({ progress: 0 });
    return;
  }
  setMusicState({ progress: Math.min(100, (audio.currentTime / audio.duration) * 100) });
}

function ensureMusicAudio() {
  if (typeof window === "undefined") return null;
  if (musicAudio) return musicAudio;

  const audio = new Audio(DEFAULT_MUSIC_SRC);
  audio.loop = true;
  audio.preload = "none";
  audio.addEventListener("play", () => setMusicState({ playing: true }));
  audio.addEventListener("pause", () => setMusicState({ playing: false }));
  audio.addEventListener("ended", () => setMusicState({ playing: false, progress: 0 }));
  audio.addEventListener("loadedmetadata", syncMusicProgress);
  audio.addEventListener("timeupdate", syncMusicProgress);
  audio.addEventListener("error", () => setMusicState({ playing: false }));
  musicAudio = audio;
  return audio;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as any).standalone);
}

function isLocalDevelopment() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
}

async function clearLocalPwaCache() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("putiyuan-")).map((key) => caches.delete(key)));
}

function installFallbackText() {
  if (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
    return "请在浏览器分享菜单中选择“添加到主屏幕”";
  }
  return "请在浏览器地址栏或菜单中选择“安装应用”";
}

export function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (isLocalDevelopment()) {
        void clearLocalPwaCache().catch(() => {});
      } else {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      notifyListeners();
    };

    const handleInstalled = () => {
      deferredPrompt = null;
      notifyListeners();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return null;
}

export function InstallAppButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const syncState = () => {
      const standalone = isStandaloneMode();
      setInstalled(standalone);
      setCanInstall(Boolean(deferredPrompt) && !standalone);
    };

    syncState();
    listeners.add(syncState);
    return () => {
      listeners.delete(syncState);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleInstall = async () => {
    if (isStandaloneMode()) {
      setInstalled(true);
      setMessage("已安装到桌面");
      return;
    }

    const promptEvent = deferredPrompt;
    if (!promptEvent) {
      setMessage(installFallbackText());
      return;
    }

    deferredPrompt = null;
    setCanInstall(false);
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setMessage(choice.outcome === "accepted" ? "正在安装到桌面" : installFallbackText());
    notifyListeners();
  };

  const title = installed ? "已安装到桌面" : "安装到桌面";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={handleInstall}
        className={`flex size-8 items-center justify-center rounded-full border text-gold/75 transition-colors hover:bg-gold/10 hover:text-gold ${
          canInstall ? "border-gold/45 shadow-[0_0_14px_rgba(214,177,108,0.22)]" : "border-gold/30"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
          <path d="M7 17h10" />
        </svg>
      </button>
      {message ? (
        <span className="absolute right-0 top-10 z-[120] w-48 rounded-md border border-gold/20 bg-xuan-card/95 px-3 py-2 text-center text-xs leading-relaxed text-paper-dark shadow-lg shadow-black/25">
          {message}
        </span>
      ) : null}
    </span>
  );
}

export function MusicButton() {
  const [state, setState] = useState<MusicState>(musicState);

  useEffect(() => {
    ensureMusicAudio();
    const listener = (nextState: MusicState) => setState(nextState);
    musicListeners.add(listener);
    listener(musicState);
    return () => {
      musicListeners.delete(listener);
    };
  }, []);

  const handleToggle = async () => {
    const audio = ensureMusicAudio();
    if (!audio) return;

    if (musicState.playing) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setMusicState({ playing: false });
    }
  };

  const progressDeg = Math.max(0, Math.min(100, state.progress)) * 3.6;
  const title = state.playing ? "暂停音乐" : "播放音乐";

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={handleToggle}
      className="relative inline-flex size-9 items-center justify-center rounded-full p-[2px] text-paper-dark transition-colors hover:text-gold"
      style={{ background: `conic-gradient(#d6b16c ${progressDeg}deg, rgba(214,177,108,0.22) 0deg)` }}
    >
      <span className="inline-flex size-full items-center justify-center rounded-full border border-gold/20 bg-xuan text-current">
        {state.playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function AccountButton() {
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    let alive = true;
    ensureUser()
      .then(() => {
        if (alive) setAccountName(getAccountName());
      })
      .catch(() => {
        if (alive) setAccountName(getAccountName());
      });
    return () => {
      alive = false;
    };
  }, []);

  const title = accountName ? `我的账号：${accountName}` : "我的账号";

  return (
    <Link
      href="/my"
      aria-label={title}
      title={title}
      className="relative inline-flex size-9 items-center justify-center rounded-full border border-gold/25 text-paper-dark transition-colors hover:border-gold/40 hover:text-gold"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </Link>
  );
}
