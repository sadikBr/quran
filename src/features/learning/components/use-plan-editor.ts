"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function usePlanEditor<Settings, Preview>({
    savedSettings,
    revision,
    days,
    failed,
}: {
    savedSettings: Settings;
    revision: number;
    days: number[];
    failed: string;
}) {
    const router = useRouter();
    const [settings, setSettings] = useState(savedSettings);
    const [editing, setEditing] = useState(revision === 0);
    const [regenerating, setRegenerating] = useState(false);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [pending, setPending] = useState(false);
    const busy = useRef(false);
    const savedRevision = useRef(revision);
    const dayKey = days.join(",");
    const savedDays = useRef(dayKey);
    useEffect(() => {
        if (savedRevision.current !== revision) {
            savedRevision.current = revision;
            setSettings(savedSettings);
            setPreview(null);
            if (revision === 0) {
                setRegenerating(false);
                setEditing(true);
            }
        }
        if (savedDays.current !== dayKey) {
            savedDays.current = dayKey;
            setPreview(null);
        }
    }, [revision, savedSettings, dayKey]);
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible" && !busy.current)
                router.refresh();
        };
        const timer = setInterval(refresh, 60000);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [router]);
    function change(value: Partial<Settings>) {
        setSettings((current) => ({ ...current, ...value }));
        setPreview(null);
    }
    function cancel() {
        setSettings(savedSettings);
        setPreview(null);
        setEditing(false);
        setRegenerating(false);
    }
    function toggle() {
        setSettings(savedSettings);
        setPreview(null);
        setEditing((current) => !current);
        setRegenerating(false);
    }
    function startRegeneration() {
        setSettings(savedSettings);
        setPreview(null);
        setRegenerating(true);
        setEditing(true);
    }
    async function act<T>(task: () => Promise<T>) {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        try {
            return await task();
        } catch {
            toast.error(failed);
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return {
        settings,
        editing,
        regenerating,
        startRegeneration,
        preview,
        pending,
        change,
        cancel,
        toggle,
        act,
        setPreview,
        setEditing,
        refresh: () => router.refresh(),
    };
}
