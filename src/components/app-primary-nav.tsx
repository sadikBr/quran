"use client";

import {
    Bookmark,
    BookOpen,
    CalendarCheck2,
    CalendarDays,
    Home,
    LayoutDashboard,
    LoaderCircle,
    LogOut,
    Menu,
    MoonStar,
    Palette,
    Search,
    Settings,
    Sparkles,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import {
    useIsAuthenticated,
    useIsPlatformAdmin,
} from "@/features/auth/account-role-provider";
import { plansView } from "@/features/plans/navigation";
import { cn } from "@/lib/utils";
import useAccountMenuActions from "./use-account-menu-actions";

const destinations = [
    {
        href: "/plans/today",
        label: "plans",
        icon: CalendarDays,
        matches: (path: string) => plansView(path) !== null,
    },
    {
        href: "/guide",
        label: "guide",
        icon: BookOpen,
        matches: (path: string) => path === "/guide",
    },
    {
        href: "/azkar",
        label: "adhkar",
        icon: MoonStar,
        matches: (path: string) =>
            path === "/azkar" || path.startsWith("/azkar/"),
    },
    {
        href: "/",
        label: "home",
        icon: Home,
        matches: (path: string) => path === "/",
    },
    {
        href: "/memorization",
        label: "memorization",
        icon: Sparkles,
        matches: (path: string) =>
            path.startsWith("/memorization") && plansView(path) === null,
    },
    {
        href: "/dashboard",
        label: "dashboard",
        icon: LayoutDashboard,
        matches: (pathname: string) => pathname === "/dashboard",
    },
    {
        href: "/quran",
        label: "quran",
        icon: BookOpen,
        matches: (pathname: string) =>
            (pathname.startsWith("/quran") &&
                !pathname.startsWith("/quran/search")) ||
            pathname === "/offline",
    },
    {
        href: "/quran/search",
        label: "search",
        icon: Search,
        matches: (pathname: string) =>
            pathname.replace(/\/$/, "") === "/quran/search",
    },
    {
        href: "/bookmarks",
        label: "bookmarks",
        icon: Bookmark,
        matches: (path: string) => path === "/bookmarks",
    },
    {
        href: "/assignments",
        label: "assignments",
        icon: CalendarCheck2,
        matches: (pathname: string) =>
            pathname.startsWith("/assignments") ||
            (pathname.startsWith("/groups/") &&
                (pathname.includes("/plan") || pathname.includes("/review/"))),
    },
    {
        href: "/groups",
        label: "groups",
        icon: UsersRound,
        matches: (pathname: string) =>
            pathname.startsWith("/groups") &&
            !pathname.endsWith("/plan") &&
            !pathname.includes("/review/"),
    },
] as const;

export default function AppPrimaryNav() {
    const isAdmin = useIsPlatformAdmin();
    const isAuthenticated = useIsAuthenticated();
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations("Common.navigation");
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const { appearanceDialog, openAppearance, signOut, isSigningOut } =
        useAccountMenuActions(() => trigger.current?.focus());
    const [openingAppearance, setOpeningAppearance] = useState(false);
    const available = [
        ...destinations,
        {
            href: "/admin",
            label: "admin",
            icon: LayoutDashboard,
            matches: (path: string) => path.startsWith("/admin"),
        },
        {
            href: "/profile",
            label: "profile",
            icon: UserRound,
            matches: (path: string) => path === "/profile",
        },
        {
            href: "/settings",
            label: "settings",
            icon: Settings,
            matches: (path: string) => path === "/settings",
        },
        {
            href: "/sign-in",
            label: "signIn",
            icon: UserRound,
            matches: (path: string) => path === "/sign-in",
        },
        {
            href: "/sign-up",
            label: "signUp",
            icon: UsersRound,
            matches: (path: string) => path === "/sign-up",
        },
    ];
    // A single ordered model and rendering path for every header and screen size.
    const sections = isAdmin
        ? [{ title: "overview", links: ["/admin"] }]
        : [
              {
                  title: "overview",
                  links: isAuthenticated
                      ? ["/", "/dashboard", "/guide"]
                      : ["/"],
              },
              {
                  title: "reading",
                  links: isAuthenticated
                      ? [
                            "/quran",
                            "/quran/search",
                            "/bookmarks",
                            "/azkar",
                            "/plans/today",
                            "/memorization",
                        ]
                      : ["/quran", "/quran/search", "/azkar"],
              },
              ...(isAuthenticated
                  ? [{ title: "together", links: ["/assignments", "/groups"] }]
                  : []),
          ];
    const row =
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
    function showAppearance() {
        setOpeningAppearance(true);
        setOpen(false);
    }
    return (
        <>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Trigger asChild>
                    <button
                        ref={trigger}
                        type="button"
                        aria-label={t("label")}
                        className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Menu aria-hidden="true" className="size-5" />
                        {t("menu")}
                    </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" />
                    <Dialog.Content
                        aria-describedby={undefined}
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        lang={locale}
                        onCloseAutoFocus={(event) => {
                            if (openingAppearance) {
                                event.preventDefault();
                                setOpeningAppearance(false);
                                openAppearance();
                            }
                        }}
                        className={cn(
                            "fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background text-foreground shadow-xl outline-none sm:inset-auto sm:start-6 sm:top-20 sm:h-auto sm:max-h-[calc(100svh-6rem)] sm:w-80 sm:rounded-2xl sm:border",
                            locale === "ar" && "arabic-ui",
                        )}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                            <Dialog.Title className="text-lg font-semibold">
                                {t("menu")}
                            </Dialog.Title>
                            <Dialog.Close
                                aria-label={t("close")}
                                className="flex size-11 items-center justify-center rounded-xl hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </Dialog.Close>
                        </div>
                        <nav
                            aria-label={t("label")}
                            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
                        >
                            {sections.map((section) => (
                                <div key={section.title}>
                                    <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                                        {t(section.title)}
                                    </p>
                                    {section.links.map((href) => {
                                        const destination = available.find(
                                            (item) => item.href === href,
                                        );
                                        if (!destination) return null;
                                        const Icon = destination.icon;
                                        const active =
                                            destination.matches(pathname);
                                        return (
                                            <Dialog.Close asChild key={href}>
                                                <Link
                                                    href={href}
                                                    aria-current={
                                                        active
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    className={cn(
                                                        row,
                                                        active &&
                                                            "bg-primary/10 text-primary",
                                                    )}
                                                >
                                                    <Icon
                                                        className="size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="flex-1">
                                                        {t(destination.label)}
                                                    </span>
                                                    {active && (
                                                        <span
                                                            className="size-1.5 rounded-full bg-primary"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </Link>
                                            </Dialog.Close>
                                        );
                                    })}
                                </div>
                            ))}
                            <div className="border-t pt-3">
                                <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                                    {t("account")}
                                </p>
                                {isAuthenticated && (
                                    <button
                                        type="button"
                                        className={row}
                                        onClick={showAppearance}
                                    >
                                        <Palette
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        {t("appearance")}
                                    </button>
                                )}
                                {(isAuthenticated
                                    ? ["/profile", "/settings"]
                                    : ["/sign-in", "/sign-up"]
                                ).map((href) => {
                                    const destination = available.find(
                                        (item) => item.href === href,
                                    );
                                    if (!destination) return null;
                                    const Icon = destination.icon;
                                    const active =
                                        destination.matches(pathname);
                                    return (
                                        <Dialog.Close asChild key={href}>
                                            <Link
                                                href={href}
                                                className={cn(
                                                    row,
                                                    active &&
                                                        "bg-primary/10 text-primary",
                                                )}
                                                aria-current={
                                                    active ? "page" : undefined
                                                }
                                            >
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                                {t(destination.label)}
                                            </Link>
                                        </Dialog.Close>
                                    );
                                })}
                                {isAuthenticated && (
                                    <button
                                        type="button"
                                        disabled={isSigningOut}
                                        onClick={signOut}
                                        className={cn(
                                            row,
                                            "mt-2 text-destructive disabled:opacity-50",
                                        )}
                                    >
                                        {isSigningOut ? (
                                            <LoaderCircle
                                                className="size-4 animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <LogOut
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {t("signOut")}
                                    </button>
                                )}
                            </div>
                        </nav>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            {appearanceDialog}
        </>
    );
}
