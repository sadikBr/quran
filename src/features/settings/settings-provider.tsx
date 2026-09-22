"use client";

import { createContext, type ReactNode, useContext } from "react";

import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";

const SettingsContext = createContext<Preferences | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    return (
        <SettingsContext.Provider value={DEFAULT_PREFERENCES}>
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
