"use client";

import { useLocale } from "next-intl";
import { Popover } from "radix-ui";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { TAJWEED_RULES, type TajweedRule } from "../helpers/quranpedia-tajweed";

// One floating explanation per verse, rather than a popover for every letter.
export default function TajweedText({ children }: { children: ReactNode }) {
    const arabic = useLocale() === "ar";
    const id = useId();
    const container = useRef<HTMLSpanElement | null>(null);
    const anchor = useRef<HTMLElement | null>(null);
    const pinned = useRef(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );
    useEffect(() => () => clearTimeout(hideTimer.current), []);
    function cancelHide() {
        clearTimeout(hideTimer.current);
    }
    function scheduleHide() {
        cancelHide();
        if (!pinned.current) hideTimer.current = setTimeout(close, 150);
    }
    const [rules, setRules] = useState<TajweedRule[]>([]);
    const [open, setOpen] = useState(false);
    function show(element: HTMLElement) {
        cancelHide();
        anchor.current?.removeAttribute("aria-describedby");
        anchor.current = element;
        element.setAttribute("aria-describedby", id);
        setRules(
            (element.dataset.tajweedRules ?? element.dataset.tajweed ?? "")
                .split(" ")
                .filter((rule) =>
                    Object.hasOwn(TAJWEED_RULES, rule),
                ) as TajweedRule[],
        );
        setOpen(true);
    }
    function close() {
        cancelHide();
        setOpen(false);
        pinned.current = false;
        anchor.current?.removeAttribute("aria-describedby");
    }
    function target(event: { target: EventTarget | null }) {
        return event.target instanceof HTMLElement
            ? event.target.closest<HTMLElement>("[data-tajweed]")
            : null;
    }
    return (
        <Popover.Root
            open={open}
            onOpenChange={(value) => {
                if (!value) close();
            }}
        >
            <Popover.Anchor virtualRef={anchor} />
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Delegates events from focusable inline rule spans without adding a second tab stop. */}
            <span
                ref={container}
                onPointerOver={(event) => {
                    const el = target(event);
                    if (el && event.pointerType !== "touch" && !pinned.current)
                        show(el);
                }}
                onPointerLeave={scheduleHide}
                onFocusCapture={(event) => {
                    const el = target(event);
                    if (el) show(el);
                }}
                onBlurCapture={close}
                onClick={(event) => {
                    const el = target(event);
                    if (!el || window.getSelection()?.toString()) return;
                    event.stopPropagation();
                    if (pinned.current && anchor.current === el) close();
                    else {
                        pinned.current = true;
                        show(el);
                    }
                }}
                onKeyDown={(event) => {
                    const el = target(event);
                    if (!el) return;
                    if (event.key === "Escape") {
                        event.preventDefault();
                        close();
                    }
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (pinned.current && anchor.current === el) close();
                        else {
                            pinned.current = true;
                            show(el);
                        }
                    }
                }}
            >
                {children}
            </span>
            <Popover.Portal>
                <Popover.Content
                    id={id}
                    onPointerEnter={cancelHide}
                    onPointerLeave={scheduleHide}
                    role="tooltip"
                    side="top"
                    sideOffset={8}
                    collisionPadding={12}
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                    onInteractOutside={(event) => {
                        const el = target(event.detail.originalEvent);
                        if (el && container.current?.contains(el))
                            event.preventDefault();
                    }}
                    className="z-[100] max-w-64 rounded-lg border bg-popover px-3 py-2 font-sans text-sm leading-relaxed text-popover-foreground shadow-md"
                    dir={arabic ? "rtl" : "ltr"}
                    lang={arabic ? "ar" : "en"}
                >
                    {rules.map((rule) => (
                        <div key={rule}>
                            {TAJWEED_RULES[rule][arabic ? 0 : 1]}
                        </div>
                    ))}
                    <Popover.Arrow className="fill-popover" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
