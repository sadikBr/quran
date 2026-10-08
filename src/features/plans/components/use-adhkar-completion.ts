"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DailyAdhkarCompletion } from "../daily-checklist";
import { setDailyAdhkarCompletion } from "../server/daily-checklist-actions";

export default function useAdhkarCompletion(initial?: DailyAdhkarCompletion) {
    const router = useRouter();
    const [state, setState] = useState(initial);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inFlight = useRef(false);
    useEffect(() => {
        setState(initial);
    }, [initial]);

    async function save(completed: boolean) {
        if (!state || inFlight.current || state.completed === completed) return;
        inFlight.current = true;
        setPending(true);
        setError(null);
        try {
            const result = await setDailyAdhkarCompletion({
                ...state,
                completed,
            });
            if (!result.success) {
                setError(result.reason);
                router.refresh();
                return;
            }
            setState({ ...state, completed, revision: result.revision });
            router.refresh();
        } catch {
            setError("failed");
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    }
    return { completed: state?.completed ?? false, pending, error, save };
}
