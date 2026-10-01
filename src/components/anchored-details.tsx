"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** Open a disclosure when a page shortcut points to it, including repeat clicks. */
export default function AnchoredDetails({
    id,
    defaultOpen = false,
    className,
    children,
}: {
    id: string;
    defaultOpen?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        function reveal(hash: string) {
            if (hash === `#${id}` && ref.current) ref.current.open = true;
        }
        function onHashChange() {
            reveal(window.location.hash);
        }
        function onClick(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            )
                return;
            const link =
                event.target instanceof Element
                    ? event.target.closest("a[href]")
                    : null;
            if (!(link instanceof HTMLAnchorElement)) return;
            const url = new URL(link.href);
            if (
                url.origin === window.location.origin &&
                url.pathname === window.location.pathname &&
                url.search === window.location.search
            )
                reveal(url.hash);
        }
        onHashChange();
        window.addEventListener("hashchange", onHashChange);
        document.addEventListener("click", onClick);
        return () => {
            window.removeEventListener("hashchange", onHashChange);
            document.removeEventListener("click", onClick);
        };
    }, [id]);

    return (
        <details ref={ref} id={id} open={defaultOpen} className={className}>
            {children}
        </details>
    );
}
