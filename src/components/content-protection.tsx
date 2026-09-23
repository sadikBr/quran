"use client";

import { useEffect } from "react";

export default function ContentProtection() {
    useEffect(() => {
        function preventContextMenu(event: MouseEvent) {
            event.preventDefault();
        }

        function preventCopy(event: ClipboardEvent) {
            event.preventDefault();
        }

        document.addEventListener("contextmenu", preventContextMenu);
        document.addEventListener("copy", preventCopy);

        return () => {
            document.removeEventListener("contextmenu", preventContextMenu);
            document.removeEventListener("copy", preventCopy);
        };
    }, []);

    return null;
}
