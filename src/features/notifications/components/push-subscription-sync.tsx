"use client";

import { useEffect } from "react";
import { getOwnedPushSubscription } from "../device-subscription";

export default function PushSubscriptionSync() {
    useEffect(() => {
        function synchronize() {
            // A failed network check must not remove a valid offline subscription.
            void getOwnedPushSubscription().catch(() => {});
        }
        synchronize();
        window.addEventListener("focus", synchronize);
        return () => window.removeEventListener("focus", synchronize);
    }, []);
    return null;
}
