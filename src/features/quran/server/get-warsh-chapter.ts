import "server-only";

import type { WarshChapter } from "../types";
import { getWarshChapter as getQuranpediaWarshChapter } from "./get-warsh-mushaf";

export default async function getWarshChapter(
    surahNumber: number,
): Promise<WarshChapter> {
    return getQuranpediaWarshChapter(surahNumber);
}
