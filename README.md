# dsh-market-index

A [format-1 plugin market index](https://github.com/deepseek-ai/deepseek-harness) for DeepSeek Harness (dsh), generated from the community catalog at
[awesome-dsh-plugin.com/plugins.json](https://awesome-dsh-plugin.com/plugins.json).

- Index URL: `https://raw.githubusercontent.com/wangyutansheng/dsh-market-index/main/index.json`
- Scope: community plugins that are installable from npm (git-only entries are skipped).
- Installs resolve through `https://registry.npmmirror.com`.
- Regenerated daily by [`.github/workflows/refresh.yml`](.github/workflows/refresh.yml) and validated with
  `@deepseek-ai/dsh-plugin-market-index` before publishing.

## Use it in dsh

Plugins page 鈫?**Discover** 鈫?**Add index source** 鈫?paste the index URL above.

## Files

| Path | Role |
|---|---|
| `build-index.mjs` | Fetch the community registry and convert it to format 1 |
| `.validator/validate.mjs` | Validate `index.json` with the official dsh validator |
| `index.json` | The published index (rewritten daily) |
