import "server-only";
import type { AdhkarCategory } from "../catalog";
import data from "../data/collections.json";
import type { AdhkarEntry } from "../types";

// Pinned, locally reviewed content. No runtime API or count inference.
export default async function getAdhkar(category: AdhkarCategory) {
    return data.collections[category] satisfies AdhkarEntry[];
}
