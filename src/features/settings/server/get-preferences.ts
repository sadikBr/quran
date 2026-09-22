import "server-only";

import { DEFAULT_PREFERENCES, type Preferences } from "../preferences";

export default async function getPreferences(): Promise<Preferences> {
    return { ...DEFAULT_PREFERENCES };
}
