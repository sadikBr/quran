"use client";

import {
    ArrowRight,
    BookMarked,
    Bookmark,
    BookOpen,
    CalendarCheck2,
    Home,
    LayoutDashboard,
    Menu,
    MoonStar,
    Search,
    Sparkles,
    UsersRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import {
    useIsAuthenticated,
    useIsPlatformAdmin,
} from "@/features/auth/account-role-provider";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const destinations = [
    {
        href: "/azkar",
        label: "adhkar",
        icon: MoonStar,
        matches: (path: string) => path === "/azkar",
    },
    {
        href: "/",
        label: "home",
        icon: Home,
        matches: (path: string) => path === "/",
    },
    {
        href: "/wird",
        label: "wird",
        icon: MoonStar,
        matches: (path: string) => path.startsWith("/wird"),
    },
    {
        href: "/practice",
        label: "practice",
        icon: BookMarked,
        matches: (path: string) => path.startsWith("/practice"),
    },
    {
        href: "/memorization",
        label: "memorization",
        icon: Sparkles,
        matches: (path: string) => path.startsWith("/memorization"),
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
    const visibleDestinations = isAdmin
        ? [
              {
                  href: "/admin",
                  label: "admin",
                  icon: LayoutDashboard,
                  matches: (path: string) => path.startsWith("/admin"),
              },
              {
                  href: "/settings",
                  label: "settings",
                  icon: UsersRound,
                  matches: (path: string) => path === "/settings",
              },
              {
                  href: "/profile",
                  label: "profile",
                  icon: Home,
                  matches: (path: string) => path === "/profile",
              },
          ]
        : isAuthenticated
          ? destinations
          : destinations.filter((destination) =>
                ["/", "/quran", "/quran/search", "/azkar"].includes(
                    destination.href,
                ),
            );
    const pathname = usePathname();
    const locale = useLocale();
    const t = useTranslations("Common.navigation");
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 640px)");
        const closeOnDesktop = () => {
            if (desktop.matches) setMobileOpen(false);
        };
        desktop.addEventListener("change", closeOnDesktop);
        return () => desktop.removeEventListener("change", closeOnDesktop);
    }, []);

    const sections = isAdmin
        ? [{ title: "overview", links: ["/admin", "/settings", "/profile"] }]
        : ([
              { title: "overview", links: ["/", "/dashboard"] },
              {
                  title: "reading",
                  links: [
                      "/quran",
                      "/quran/search",
                      "/bookmarks",
                      "/wird",
                      "/azkar",
                      "/practice",
                      "/memorization",
                  ],
              },
              { title: "together", links: ["/assignments", "/groups"] },
          ] as const);
    const mobileSections = sections
        .map((section) => ({
            ...section,
            links: section.links.filter((href) =>
                visibleDestinations.some(
                    (destination) => destination.href === href,
                ),
            ),
        }))
        .filter((section) => section.links.length > 0);

    return (
        <>
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                <Dialog.Trigger asChild>
                    <button
                        type="button"
                        aria-label={t("label")}
                        className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
                    >
                        <Menu aria-hidden="true" className="size-5" />
                        {t("menu")}
                    </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-background" />
                    <Dialog.Content
                        aria-describedby={undefined}
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        lang={locale}
                        className={cn(
                            "fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background text-foreground outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:duration-200",
                            locale === "ar" && "arabic-ui",
                        )}
                    >
                        <div className="shrink-0 border-b border-border/60 bg-primary/[0.04] px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
                            <div className="flex items-center justify-between gap-4">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BookOpen
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <Dialog.Close
                                    aria-label={t("close")}
                                    className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <X aria-hidden="true" className="size-5" />
                                </Dialog.Close>
                            </div>
                            <Dialog.Title className="mt-5 text-2xl font-semibold tracking-tight">
                                {t("menu")}
                            </Dialog.Title>
                        </div>
                        <nav
                            aria-label={t("label")}
                            className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                        >
                            {mobileSections.map((section) => (
                                <div key={section.title}>
                                    <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                                        {t(section.title)}
                                    </p>
                                    <div className="space-y-1">
                                        {section.links.map((href) => {
                                            const destination =
                                                visibleDestinations.find(
                                                    (item) =>
                                                        item.href === href,
                                                );
                                            if (!destination) return null;
                                            const Icon = destination.icon;
                                            const active =
                                                destination.matches(pathname);
                                            return (
                                                <Dialog.Close
                                                    asChild
                                                    key={href}
                                                >
                                                    <Link
                                                        href={href}
                                                        aria-current={
                                                            active
                                                                ? "page"
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            "flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                                                            active &&
                                                                "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                                                                active &&
                                                                    "bg-primary text-primary-foreground",
                                                            )}
                                                        >
                                                            <Icon
                                                                aria-hidden="true"
                                                                className="size-[1.125rem]"
                                                            />
                                                        </span>
                                                        <span className="flex-1 text-sm font-semibold">
                                                            {t(
                                                                destination.label,
                                                            )}
                                                        </span>
                                                        {active ? (
                                                            <span
                                                                className="size-1.5 shrink-0 rounded-full bg-primary"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <ArrowRight
                                                                aria-hidden="true"
                                                                className="size-4 shrink-0 text-muted-foreground/50 rtl:rotate-180"
                                                            />
                                                        )}
                                                    </Link>
                                                </Dialog.Close>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <DropdownMenu dir={locale === "ar" ? "rtl" : "ltr"}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={t("label")}
                        className="hidden min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
                    >
                        <Menu aria-hidden="true" className="size-5" />
                        {t("menu")}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2">
                    {visibleDestinations.map((destination) => {
                        const Icon = destination.icon;
                        const isCurrent = destination.matches(pathname);

                        return (
                            <DropdownMenuItem key={destination.href} asChild>
                                <Link
                                    href={destination.href}
                                    aria-current={
                                        isCurrent ? "page" : undefined
                                    }
                                    aria-label={t(destination.label)}
                                    title={t(destination.label)}
                                    className={cn(
                                        "flex min-h-11 items-center justify-start gap-3 rounded-lg px-3 text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                        isCurrent &&
                                            "bg-background text-primary shadow-sm ring-1 ring-border/45",
                                    )}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    <span className="text-sm font-semibold">
                                        {t(destination.label)}
                                    </span>
                                </Link>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
