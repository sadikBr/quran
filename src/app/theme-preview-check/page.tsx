"use client";

import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    Settings2,
} from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanSessions } from "@/features/learning/components/weekly-plan-ui";
import HafsPresentationPreview from "@/features/quran/components/hafs-presentation-preview";
import ThemeSelector from "@/features/settings/components/theme-selector";
import type { Theme } from "@/features/settings/preferences";
import ar from "@/messages/memorization.ar.json";
import en from "@/messages/memorization.en.json";
import settingsAr from "@/messages/settings.ar.json";
import settingsEn from "@/messages/settings.en.json";

const palettes = [
    { id: "glacier", name: "Glacier", note: "Clear light. Cobalt ink." },
    { id: "saffron", name: "Saffron", note: "Golden paper. Quiet warmth." },
    { id: "citron", name: "Citron", note: "Deep olive. Luminous lime." },
] as const;

function Study({
    arabic,
    compact = false,
}: {
    arabic: boolean;
    compact?: boolean;
}) {
    return (
        <div className={compact ? "compact-sample space-y-6" : "space-y-6"}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">
                        {arabic ? "السبت، ٣ أكتوبر" : "SATURDAY, OCTOBER 3"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                        {arabic ? "وقتٌ مع القرآن" : "A moment with the Quran"}
                    </h2>
                </div>
                <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <BookOpen className="size-5" />
                </span>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex justify-between gap-3">
                    <span className="text-sm font-semibold">
                        {arabic ? "هدفك الأسبوعي" : "Your weekly intention"}
                    </span>
                    <span className="text-sm text-primary">2 / 3</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    {arabic
                        ? "خطوة صغيرة كل يوم، وأثر يبقى."
                        : "Small steps, lasting progress."}
                </p>
                <div className="my-4 h-1.5 rounded-full bg-secondary">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
                <div className="flex items-center gap-2 text-xs text-accent-foreground">
                    <span className="rounded-full bg-accent p-1">
                        <Check className="size-3" />
                    </span>
                    {arabic
                        ? "جلستان مكتملتان هذا الأسبوع"
                        : "Two sessions completed this week"}
                </div>
            </div>
            <style>{`.compact-sample ol > li { grid-template-columns: minmax(0, 1fr); gap: 0.5rem; } .compact-sample article > div > div { display: block; } .compact-sample article > div > div > div:last-child { margin-top: 1rem; }`}</style>
            <PlanSessions
                today="2026-10-03"
                emptyMessage=""
                items={[
                    {
                        id: "today",
                        scheduledDate: "2026-10-03",
                        range: arabic
                            ? "سورة الفاتحة، الآية ١ ← سورة البقرة، الآية ٢٤"
                            : "Al-Fatihah 1 → Al-Baqarah 24",
                        amount: arabic ? "ربع حزب" : "Quarter hizb",
                        state: "ready",
                        description: arabic
                            ? "تابع حفظك من حيث توقفت"
                            : "Pick up where you left off",
                        coverage: arabic
                            ? "تم حفظ ٧ من ٣١ آية"
                            : "7 of 31 ayahs memorized",
                        href: "#reading",
                        action: arabic ? "متابعة التدريب" : "Continue practice",
                    },
                    ...(!compact
                        ? [
                              {
                                  id: "later",
                                  scheduledDate: "2026-10-05",
                                  range: arabic
                                      ? "سورة البقرة، الآية ٢٥ ← الآية ٤٠"
                                      : "Al-Baqarah 25 → 40",
                                  amount: arabic ? "ربع حزب" : "Quarter hizb",
                                  state: "ready" as const,
                                  description: arabic
                                      ? "حفظ قادم"
                                      : "Upcoming memorization",
                              },
                          ]
                        : []),
                ]}
            />
            <div
                id="reading"
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                        {arabic ? "سورة الفاتحة" : "Al-Fatihah"}
                    </h3>
                    <span className="text-xs text-division">
                        {arabic ? "الجزء ١ · الحزب ١" : "Juz 1 · Hizb 1"}
                    </span>
                </div>
                <HafsPresentationPreview
                    edition="quranpedia.mushaf.11"
                    label={
                        arabic
                            ? "تلاوة بتأنٍّ وتدبّر"
                            : "Read slowly. Reflect deeply."
                    }
                />
                <div className="mt-5 flex flex-wrap gap-2">
                    <Button>
                        {arabic ? "متابعة القراءة" : "Continue reading"}
                        <ArrowRight className="size-4 rtl:rotate-180" />
                    </Button>
                    <Button variant="outline">
                        {arabic ? "استماع" : "Listen"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ThemePreviewCheck() {
    const [selected, setSelected] = useState<Theme | "gallery">("gallery");
    const [arabic, setArabic] = useState(false);
    const messages = arabic
        ? { ...ar, ...settingsAr }
        : { ...en, ...settingsEn };
    return (
        <NextIntlClientProvider
            locale={arabic ? "ar" : "en"}
            messages={messages}
            formats={{}}
            now={new Date("2026-10-03T12:00:00Z")}
            timeZone="Africa/Casablanca"
        >
            <div
                className={`theme-preview ${selected === "gallery" ? "light" : selected} absolute inset-x-0 top-0 z-50 min-h-dvh bg-background text-foreground ${arabic ? "arabic-ui" : "font-sans"}`}
                dir={arabic ? "rtl" : "ltr"}
            >
                <nav
                    aria-label="Preview"
                    className="flex flex-wrap gap-2 border-b border-border p-4"
                >
                    {(["gallery", ...palettes.map((p) => p.id)] as const).map(
                        (id) => (
                            <Button
                                key={id}
                                variant={
                                    id === selected ? "default" : "outline"
                                }
                                onClick={() => setSelected(id)}
                            >
                                {id === "gallery"
                                    ? "Gallery"
                                    : palettes.find((p) => p.id === id)?.name}
                            </Button>
                        ),
                    )}
                    <Button variant="ghost" onClick={() => setArabic(!arabic)}>
                        {arabic ? "English" : "العربية"}
                    </Button>
                </nav>
                {selected === "gallery" ? (
                    <div
                        data-testid="theme-gallery"
                        className="grid gap-5 p-5 lg:grid-cols-3"
                    >
                        {palettes.map((p) => (
                            <section
                                key={p.id}
                                className={`${p.id} overflow-hidden rounded-3xl border border-border bg-background text-foreground shadow-lg`}
                            >
                                <header className="border-b border-border bg-sidebar px-6 py-5">
                                    <p className="text-xs uppercase tracking-[.16em] text-muted-foreground">
                                        Quran ·{" "}
                                        {arabic ? "مظهر جديد" : "New theme"}
                                    </p>
                                    <h1 className="mt-2 text-3xl font-semibold text-primary">
                                        {p.name}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {p.note}
                                    </p>
                                </header>
                                <div className="p-5">
                                    <Study arabic={arabic} compact />
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="relative isolate overflow-hidden border-b border-border">
                            <div className="home-landscape-frame absolute inset-0 -z-10">
                                <span className="home-landscape-light absolute inset-0 bg-[url('/meccan-home-light-v1.webp')] bg-cover bg-center dark:hidden" />
                                <span className="home-landscape-light-shade absolute inset-0 dark:hidden" />
                                <span className="home-landscape absolute inset-0 hidden bg-[url('/meccan-surah-background-v2.webp')] bg-cover bg-center dark:block" />
                                <span className="home-landscape-shade absolute inset-0 hidden dark:block" />
                            </div>
                            <div className="app-container py-20">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {arabic
                                        ? "وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا"
                                        : "YOUR DAILY COMPANION"}
                                </p>
                                <h1 className="mt-3 text-4xl font-semibold">
                                    {arabic
                                        ? "ابدأ يومك بآية"
                                        : "Begin your day with an ayah"}
                                </h1>
                                <Button className="mt-6">
                                    {arabic ? "افتح المصحف" : "Open the Quran"}
                                </Button>
                            </div>
                        </div>
                        <div className="app-container space-y-10 py-8">
                            <Study arabic={arabic} />
                            <div className="rounded-2xl border border-border bg-card p-6">
                                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                    <CalendarDays className="size-5 text-primary" />
                                    {arabic ? "أيام دراستي" : "My study days"}
                                </h2>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        "Monday",
                                        "Tuesday",
                                        "Thursday",
                                        "Friday",
                                    ].map((d, i) => (
                                        <Button
                                            key={d}
                                            variant={
                                                i < 2 ? "default" : "outline"
                                            }
                                        >
                                            {d}
                                        </Button>
                                    ))}
                                </div>
                                <label
                                    className="mt-6 block text-sm"
                                    htmlFor="plan-title"
                                >
                                    {arabic ? "اسم الخطة" : "Plan name"}
                                </label>
                                <Input
                                    id="plan-title"
                                    className="mt-2"
                                    defaultValue={
                                        arabic
                                            ? "رحلتي مع القرآن"
                                            : "My Quran journey"
                                    }
                                />
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Button variant="secondary">
                                        {arabic
                                            ? "إعدادات الخطة"
                                            : "Plan settings"}
                                    </Button>
                                    <Button variant="destructive">
                                        {arabic ? "حذف الخطة" : "Delete plan"}
                                    </Button>
                                    <Button disabled>
                                        {arabic ? "محفوظ" : "Saved"}
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-card p-6">
                                <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                                    <Settings2 className="size-5 text-primary" />
                                    {arabic ? "مظهر التطبيق" : "Appearance"}
                                </h2>
                                <ThemeSelector
                                    value={selected}
                                    onChange={setSelected}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </NextIntlClientProvider>
    );
}
