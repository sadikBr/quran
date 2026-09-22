"use client";

import { createContext, type ReactNode, useContext } from "react";

import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";

const SettingsContext = createContext<Preferences | undefined>(undefined);

export function SettingsProvider({
    children,
    preferences = DEFAULT_PREFERENCES,
}: {
    children: ReactNode;
    preferences?: Preferences;
}) {
    return (
        <SettingsContext.Provider value={preferences}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const settings = useContext(SettingsContext);

    if (!settings) {
        throw new Error("useSettings must be used within a SettingsProvider.");
    }

    return settings;
}
