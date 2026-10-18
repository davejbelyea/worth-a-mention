import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DEFAULT_SETTINGS, initDatabase } from "./schema.mjs";

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

type G = typeof globalThis & { __wamDb?: Promise<Client> };
const g = globalThis as G;

async function open(): Promise<Client> {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const client = createClient({ url: "file:" + path.join(DATA_DIR, "worth-a-mention.db") });
  await client.execute("PRAGMA journal_mode = WAL");
  await initDatabase(client);
  return client;
}

export function db(): Promise<Client> {
  if (!g.__wamDb) g.__wamDb = open();
  return g.__wamDb;
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as T);
}

export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []) {
  const c = await db();
  return c.execute({ sql, args });
}

export function newId() {
  return crypto.randomBytes(9).toString("base64url");
}

export function now() {
  return new Date().toISOString();
}

export async function getSetting(key: string): Promise<string> {
  const r = await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return r?.value ?? (DEFAULT_SETTINGS as Record<string, string>)[key] ?? "";
}

export async function setSetting(key: string, value: string) {
  await run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}
