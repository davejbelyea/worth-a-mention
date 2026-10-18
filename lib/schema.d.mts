export const SCHEMA: string;
export const DEFAULT_CATEGORIES: { slug: string; name: string; emoji: string; has_location: number }[];
export const DEFAULT_SETTINGS: Record<string, string>;
export function initDatabase(client: import("@libsql/client").Client): Promise<void>;
