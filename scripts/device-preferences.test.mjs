import { expect, test } from "bun:test";
import { vibrate } from "../src/features/settings/device-feedback";
import {
    DEFAULT_PREFERENCES,
    preferencesZodSchema,
} from "../src/features/settings/preferences";

test("device preferences default off and reject invalid modes", () => {
    expect(DEFAULT_PREFERENCES.keepScreenAwake).toBe(false);
    expect(DEFAULT_PREFERENCES.vibration).toBe("off");
    expect(
        preferencesZodSchema.safeParse({
            ...DEFAULT_PREFERENCES,
            vibration: "invalid",
        }).success,
    ).toBe(false);
    expect(
        preferencesZodSchema.safeParse({
            ...DEFAULT_PREFERENCES,
            keepScreenAwake: "yes",
        }).success,
    ).toBe(false);
});
test("vibration uses selected pulse and tolerates unsupported or denied hardware", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const pulses = [];
    try {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: { vibrate: (pulse) => pulses.push(pulse) },
        });
        vibrate("off");
        vibrate("gentle");
        vibrate("strong");
        expect(pulses).toEqual([15, 40]);
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: {},
        });
        expect(() => vibrate("gentle")).not.toThrow();
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: {
                vibrate() {
                    throw new Error("denied");
                },
            },
        });
        expect(() => vibrate("strong")).not.toThrow();
    } finally {
        if (original) Object.defineProperty(globalThis, "navigator", original);
        else Reflect.deleteProperty(globalThis, "navigator");
    }
});
