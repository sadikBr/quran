import type { Preferences } from "./preferences";

export function vibrate(mode: Preferences["vibration"]) {
    if (
        mode === "off" ||
        typeof navigator === "undefined" ||
        typeof navigator.vibrate !== "function"
    )
        return;
    try {
        // Browsers expose duration, not physical motor intensity.
        navigator.vibrate(mode === "strong" ? 40 : 15);
    } catch {
        // Feedback is optional and must never block the user's action.
    }
}
