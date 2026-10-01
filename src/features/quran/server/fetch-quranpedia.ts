import "server-only";

import { gunzipSync } from "node:zlib";

const BASE = "https://api.quranpedia.net";
export const QURANPEDIA_REVALIDATE_SECONDS = 86400;

export default async function fetchQuranpedia(path: string): Promise<unknown> {
    if (!path.startsWith("/") || path.startsWith("//"))
        throw new Error("Invalid Quranpedia resource.");
    try {
        const response = await fetch(`${BASE}${path}`, {
            next: { revalidate: QURANPEDIA_REVALIDATE_SECONDS },
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Quranpedia HTTP ${response.status}`);
        return path.endsWith(".gz")
            ? JSON.parse(
                  gunzipSync(Buffer.from(await response.arrayBuffer()), {
                      maxOutputLength: 32 * 1024 * 1024,
                  }).toString("utf8"),
              )
            : await response.json();
    } catch (error) {
        console.error("Unable to load Quranpedia resource.", { path, error });
        throw new Error("Unable to load Quran data. Please try again shortly.");
    }
}

/** Bounded, coalesced cache; rejected loads never replace validated data. */
export function createQuranpediaCache<T>(limit: number) {
    const values = new Map<string, { value: T; expires: number }>();
    const pending = new Map<string, Promise<T>>();
    return (key: string, load: () => Promise<T>): Promise<T> => {
        const cached = values.get(key);
        if (cached && cached.expires > Date.now())
            return Promise.resolve(cached.value);
        const current = pending.get(key);
        if (current) return current;
        const request = load()
            .then((value) => {
                if (!values.has(key) && values.size >= limit) {
                    const oldest = values.keys().next().value;
                    if (oldest !== undefined) values.delete(oldest);
                }
                values.set(key, {
                    value,
                    expires: Date.now() + QURANPEDIA_REVALIDATE_SECONDS * 1000,
                });
                return value;
            })
            .catch((error) => {
                // Only a short outage grace period; never serve a stale corpus forever.
                if (
                    cached &&
                    Date.now() - cached.expires <
                        QURANPEDIA_REVALIDATE_SECONDS * 1000
                )
                    return cached.value;
                throw error;
            })
            .finally(() => pending.delete(key));
        pending.set(key, request);
        return request;
    };
}
