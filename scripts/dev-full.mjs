import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const npx = isWindows ? "npx.cmd" : "npx";
const children = new Set();

function cachedWranglerCommand() {
  const base = isWindows
    ? path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx")
    : path.join(process.env.HOME || "", ".npm", "_npx");
  try {
    for (const dir of fs.readdirSync(base)) {
      const candidate = path.join(base, dir, "node_modules", "wrangler", "bin", "wrangler.js");
      if (fs.existsSync(candidate)) return { command: "node", args: [candidate] };
    }
  } catch {
    // Fall back to npx below.
  }
  return { command: npx, args: ["--yes", "wrangler"] };
}

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: isWindows,
  });

  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`[${name}] exited with code ${code ?? signal}`);
      stopAll(code || 1);
    }
  });

  return child;
}

function run(name, command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: isWindows,
  });

  if (result.status !== 0) {
    console.error(`[${name}] exited with code ${result.status ?? result.signal}`);
    stopAll(result.status || 1);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // Server is still starting.
    }
    await wait(600);
  }
  return false;
}

function stopAll(exitCode = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

console.log("Starting Next.js on http://127.0.0.1:3000 ...");
start("next", npx, ["next", "dev", "--hostname", "127.0.0.1", "--port", "3000"]);

const nextReady = await waitForHttp("http://127.0.0.1:3000");
if (!nextReady) {
  console.error("Next.js did not become ready on http://127.0.0.1:3000");
  stopAll(1);
}

console.log("Starting Cloudflare Pages Functions on http://127.0.0.1:8788 ...");
const wrangler = cachedWranglerCommand();

console.log("Initializing local D1 schema ...");
run("d1:init", wrangler.command, [...wrangler.args, "d1", "execute", "putiyuan-db", "--local", "--file=./db/schema.sql"]);

start("wrangler", wrangler.command, [...wrangler.args, "pages", "dev", ".next", "--port", "8788", "--proxy", "3000"]);

console.log("Ready: open http://127.0.0.1:3000");
