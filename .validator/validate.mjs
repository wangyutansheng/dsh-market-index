import fs from "node:fs";
import { parseMarketIndex, MarketIndexError } from "@deepseek-ai/dsh-plugin-market-index";

const file = process.argv[2] ?? "../index.json";
const value = JSON.parse(fs.readFileSync(file, "utf8"));
try {
  const index = parseMarketIndex(value, "https://raw.githubusercontent.com/wangyutansheng/dsh-market-index/main/index.json");
  console.log(`valid format ${index.format}: ${index.plugins.length} plugins, ${Object.keys(index.metadata.categories).length} categories`);
} catch (error) {
  console.error("INVALID:", error instanceof MarketIndexError ? `${error.path} ${error.reason}` : error.message);
  process.exit(1);
}
