// 命令行运行流水线。本地默认写 data/store.json；设置了 BLOB_READ_WRITE_TOKEN 时写 Vercel Blob。
// 用法：npm run pipeline            抓取并更新
//       npm run pipeline -- --reset 删除本地 data/store.json，回到示范数据
import { rmSync } from "node:fs";
import { runPipeline } from "../src/engine/pipeline";
import { LOCAL_PATH } from "../src/engine/persist";

async function main() {
  if (process.argv.includes("--reset")) {
    rmSync(LOCAL_PATH, { force: true });
    console.log("已删除 data/store.json，网站回到示范数据。");
    return;
  }
  const report = await runPipeline({ log: console.log });
  for (const f of report.failures) console.warn(`  跳过 ${f}`);
  console.log(
    `完成（存储：${report.backend}）：${report.items} 条资料，${report.selected} 条信号，${report.events} 个事件，${report.editions} 期晨报。`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
