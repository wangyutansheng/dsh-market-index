// 把 awesome-dsh-plugin 社区目录（dshmarket 的 registry 格式）转成 dsh 内置 plugin-market 的 format 1 索引。
// 用法: node build-index.mjs [输出路径]
// 规则来源: @deepseek-ai/dsh-plugin-market-index (packages/util/plugin-market-index)
import fs from "node:fs";
import path from "node:path";

const SRC = "https://awesome-dsh-plugin.com/plugins.json";
const REGISTRY = "https://registry.npmmirror.com";
const OUT = process.argv[2] ?? path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "index.json");

const NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u;
const NUM = "(?:0|[1-9]\\d*)";
const PRE = `(?:${NUM}|\\d*[a-zA-Z-][0-9a-zA-Z-]*)`;
const SEMVER_RE = new RegExp(`^${NUM}\\.${NUM}\\.${NUM}(?:-${PRE}(?:\\.${PRE})*)?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`, "u");

const stats = { total: 0, noNpm: 0, badName: 0, badVersion: 0, dup: 0, kept: 0 };

function semverOf(v) {
  if (typeof v !== "string") return undefined;
  let s = v.trim().replace(/^v/i, "").replace(/^=/, "").trim();
  if (!SEMVER_RE.test(s)) return undefined;
  return s;
}

function epochSeconds(v) {
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
}

// localizedText: 必须含 en；接受 string 或 {lang: string}
function localized(obj, fallback) {
  const out = {};
  if (typeof obj === "string" && obj.trim()) out.en = obj.trim();
  else if (obj && typeof obj === "object") {
    for (const [lang, text] of Object.entries(obj)) {
      if (/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/u.test(lang) && typeof text === "string" && text.trim()) out[lang] = text.trim();
    }
  }
  if (!out.en && fallback) out.en = fallback;
  return out.en ? out : undefined;
}

const res = await fetch(SRC, { redirect: "error" });
if (!res.ok) throw new Error(`registry fetch ${res.status}`);
const registry = await res.json();

const categories = {};
for (const [id, value] of Object.entries(registry.categories ?? {})) {
  const title = localized(value);
  if (title) categories[id] = { title };
}

/** @type {Map<string, any>} */
const byName = new Map();
for (const entry of registry.plugins ?? []) {
  stats.total++;
  const npm = typeof entry.npm === "string" ? entry.npm.trim() : "";
  if (!npm) { stats.noNpm++; continue; }
  if (npm.length > 214 || !NAME_RE.test(npm)) { stats.badName++; continue; }
  const version = semverOf(entry.version);
  if (!version) { stats.badVersion++; continue; }

  const description = localized(entry.description);
  const homepage = typeof entry.url === "string" && /^https?:\/\//i.test(entry.url) ? entry.url : undefined;
  const category = entry.category && Object.hasOwn(categories, entry.category) ? entry.category : undefined;

  const plugin = {
    name: npm,
    title: { en: entry.name ?? npm },
    ...(description ? { description } : {}),
    ...(entry.owner ? { author: String(entry.owner) } : {}),
    ...(homepage ? { homepage } : {}),
    ...(homepage ? { repository: { url: homepage } } : {}),
    metadata: {
      ...(category ? { category } : {}),
      keywords: [entry.name, entry.owner, ...(Array.isArray(entry.capabilities) ? entry.capabilities : [])].filter((x) => typeof x === "string" && x),
      labels: [],
      sortKeys: {
        stars: Number(entry.stars) || 0,
        downloads: Number(entry.downloads) || 0,
      },
    },
    versions: [{
      version,
      publishTimestamp: epochSeconds(entry.added),
      source: { type: "npm", registry: REGISTRY },
      engines: {},
    }],
  };

  const prev = byName.get(npm);
  if (prev) {
    stats.dup++;
    if ((plugin.metadata.sortKeys.stars ?? 0) <= (prev.metadata.sortKeys.stars ?? 0)) continue;
  }
  byName.set(npm, plugin);
}

const plugins = [...byName.values()].sort((a, b) =>
  (b.metadata.sortKeys.stars - a.metadata.sortKeys.stars) || a.name.localeCompare(b.name));
stats.kept = plugins.length;

const index = {
  format: 1,
  title: { en: "DSH Community Plugins", zh: "DSH 社区插件市场" },
  description: {
    en: "Community plugin catalog mirrored from awesome-dsh-plugin.com (npm-installable entries).",
    zh: "来自 awesome-dsh-plugin.com 的社区插件目录（仅收录可从 npm 安装的条目）。",
  },
  metadata: {
    categories,
    labels: {},
    sortKeys: {
      stars: { title: { en: "Stars", zh: "星标" }, order: "desc" },
      downloads: { title: { en: "Downloads", zh: "下载量" }, order: "desc" },
    },
  },
  plugins,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index));
console.log(JSON.stringify({ ...stats, categories: Object.keys(categories).length, bytes: fs.statSync(OUT).size, out: OUT }, null, 1));
