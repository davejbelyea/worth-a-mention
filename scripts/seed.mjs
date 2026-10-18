// npm run seed     -> adds the sample content
// npm run unseed   -> removes all of it
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@libsql/client";
import { initDatabase } from "../lib/schema.mjs";
import { loadSampleData, removeSampleData } from "../lib/sample-data.mjs";

const dir = path.resolve(process.env.DATA_DIR || "./data");
fs.mkdirSync(dir, { recursive: true });
const client = createClient({ url: "file:" + path.join(dir, "worth-a-mention.db") });
await initDatabase(client);
if (process.argv.includes("--remove")) {
  console.log(`Removed ${await removeSampleData(client)} sample rows.`);
} else {
  await loadSampleData(client);
  console.log("Sample content loaded.");
}
