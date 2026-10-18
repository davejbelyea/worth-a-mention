import type { Client } from "@libsql/client";
export function loadSampleData(client: Client, opts?: { ownerId?: string }): Promise<void>;
export function removeSampleData(client: Client): Promise<number>;
export function sampleCounts(client: Client): Promise<{ users: number; recs: number; plans: number; newsletters: number; comments: number }>;
