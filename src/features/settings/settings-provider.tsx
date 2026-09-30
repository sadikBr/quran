"use client";

import {
    createContext,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import ScreenAwake from "./components/screen-awake";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";

type SettingsContextValue = Preferences & {
    setPreferences: Dispatch<SetStateAction<Preferences>>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(
    undefined,
);

export function SettingsProvider({
    children,
    preferences = DEFAULT_PREFERENCES,
}: {
    children: ReactNode;
    preferences?: Preferences;
}) {
    const [values, setPreferences] = useState(preferences);

    useEffect(() => {
        setPreferences(preferences);
    }, [preferences]);

    const value = useMemo(() => ({ ...values, setPreferences }), [values]);

    return (
        <SettingsContext.Provider value={value}>
            <ScreenAwake enabled={values.keepScreenAwake} />
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
