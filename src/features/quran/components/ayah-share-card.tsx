"use client";

import {
    ArrowLeft,
    BookOpenText,
    Check,
    Clipboard,
    Download,
    LoaderCircle,
    Palette,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getArabicNumber } from "@/lib/arabic-numbers";

type CardTheme = "night" | "parchment" | "emerald";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const THEMES: Record<
    CardTheme,
    {
        background: string;
        surface: string;
        foreground: string;
        muted: string;
        accent: string;
    }
> = {
    night: {
        background: "#191613",
        surface: "#241f1a",
        foreground: "#fffaf4",
        muted: "#b9aaa0",
        accent: "#ff7417",
    },
    parchment: {
        background: "#f4eadb",
        surface: "#eadbc6",
        foreground: "#49372d",
        muted: "#806b5d",
        accent: "#b95718",
    },
    emerald: {
        background: "#123630",
        surface: "#19473f",
        foreground: "#fffaf0",
        muted: "#b8cec7",
        accent: "#e2ad55",
    },
};

function roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
}

function drawBookMark(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    color: string,
) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(centerX, centerY + 11);
    context.lineTo(centerX, centerY - 9);
    context.bezierCurveTo(
        centerX - 7,
        centerY - 14,
        centerX - 15,
        centerY - 14,
        centerX - 20,
        centerY - 10,
    );
    context.lineTo(centerX - 20, centerY + 9);
    context.bezierCurveTo(
        centerX - 12,
        centerY + 6,
        centerX - 6,
        centerY + 7,
        centerX,
        centerY + 11,
    );
    context.bezierCurveTo(
        centerX + 6,
        centerY + 7,
        centerX + 12,
        centerY + 6,
        centerX + 20,
        centerY + 9,
    );
    context.lineTo(centerX + 20, centerY - 10);
    context.bezierCurveTo(
        centerX + 15,
        centerY - 14,
        centerX + 7,
        centerY - 14,
        centerX,
        centerY - 9,
    );
    context.stroke();
    context.restore();
}

function wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
) {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function fittedLines(
    context: CanvasRenderingContext2D,
    text: string,
    fontFamily: string,
    fontWeight: number,
    initialSize: number,
    minimumSize: number,
    maxWidth: number,
    maxHeight: number,
    lineHeightFactor: number,
) {
    let fontSize = initialSize;
    let lines: string[] = [];
    while (fontSize >= minimumSize) {
        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        lines = wrapText(context, text, maxWidth);
        if (lines.length * fontSize * lineHeightFactor <= maxHeight) break;
        fontSize -= 2;
    }
    return { lines, fontSize, lineHeight: fontSize * lineHeightFactor };
}

async function canvasBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Unable to create image."));
        }, "image/png");
    });
}

export default function AyahShareCard({
    arabicText,
    translationText,
    translationEditionName,
    surahName,
    surahNumber,
    ayahNumber,
    riwayah,
    onBack,
}: {
    arabicText: string;
    translationText: string;
    translationEditionName: string;
    surahName: string;
    surahNumber: number;
    ayahNumber: number;
    riwayah: "hafs" | "warsh";
    onBack: () => void;
}) {
    const t = useTranslations("Reader.actions");
    const locale = useLocale();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [theme, setTheme] = useState<CardTheme>("night");
    const [showTranslation, setShowTranslation] = useState(true);
    const [showBranding, setShowBranding] = useState(true);
    const [isRendering, setIsRendering] = useState(true);
    const [isCopying, setIsCopying] = useState(false);
    const [renderFailed, setRenderFailed] = useState(false);
    const renderVersion = useRef(0);
    const palette = THEMES[theme];
    const ayahReference = t("shareAyahReference", {
        ayah: String(ayahNumber),
    });

    const drawCard = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const version = ++renderVersion.current;
        setIsRendering(true);
        setRenderFailed(false);

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        const quranFont = riwayah === "warsh" ? "Uthmanic Warsh" : "Amiri";
        const bodyStyles = getComputedStyle(document.body);
        const uiFont =
            bodyStyles.getPropertyValue("--font-sans").trim() || "sans-serif";
        const serifFont =
            bodyStyles.getPropertyValue("--font-serif").trim() || "serif";
        const arabicUiFont =
            bodyStyles.getPropertyValue("--font-arabic-ui").trim() ||
            "sans-serif";
        await Promise.allSettled([
            document.fonts.load(`400 64px "${quranFont}"`),
            document.fonts.load('400 92px "Surah"'),
            document.fonts.load(`600 30px ${uiFont}`),
            document.fonts.load(`400 28px ${serifFont}`),
            document.fonts.load(`600 27px ${arabicUiFont}`),
        ]);
        if (version !== renderVersion.current) return;
        canvas.width = CARD_WIDTH;
        canvas.height = CARD_HEIGHT;

        context.fillStyle = palette.background;
        context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        const glow = context.createRadialGradient(930, 70, 20, 930, 70, 430);
        glow.addColorStop(0, `${palette.accent}35`);
        glow.addColorStop(1, `${palette.accent}00`);
        context.fillStyle = glow;
        context.fillRect(500, 0, 580, 500);

        context.fillStyle = palette.surface;
        roundedRect(context, 60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120, 42);

        context.strokeStyle = `${palette.accent}66`;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(235, 142);
        context.lineTo(365, 142);
        context.moveTo(715, 142);
        context.lineTo(845, 142);
        context.stroke();

        context.direction = "rtl";
        context.textAlign = "center";
        context.fillStyle = palette.accent;
        context.font = '400 92px "Surah"';
        context.fillText(getArabicNumber(surahNumber), CARD_WIDTH / 2, 169);

        context.direction = locale === "ar" ? "rtl" : "ltr";
        context.fillStyle = palette.muted;
        context.font = `600 22px ${locale === "ar" ? arabicUiFont : uiFont}`;
        context.fillText(ayahReference, CARD_WIDTH / 2, 207);

        const contentBottom = showBranding ? 1165 : 1230;
        const arabicTop = 235;
        const dividerY = showTranslation
            ? Math.min(755, contentBottom - 365)
            : contentBottom;
        const arabicBottom = showTranslation ? dividerY - 34 : contentBottom;
        const arabicAreaHeight = arabicBottom - arabicTop;

        context.direction = "rtl";
        context.textAlign = "center";
        context.fillStyle = palette.foreground;
        const arabic = fittedLines(
            context,
            arabicText,
            `"${quranFont}"`,
            400,
            showTranslation ? 67 : 76,
            22,
            850,
            arabicAreaHeight,
            1.65,
        );
        const arabicHeight = arabic.lines.length * arabic.lineHeight;
        let arabicY =
            arabicTop + (arabicAreaHeight - arabicHeight) / 2 + arabic.fontSize;
        context.font = `400 ${arabic.fontSize}px "${quranFont}"`;
        for (const line of arabic.lines) {
            context.fillText(line, CARD_WIDTH / 2, arabicY);
            arabicY += arabic.lineHeight;
        }

        if (showTranslation) {
            context.strokeStyle = `${palette.accent}55`;
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(210, dividerY);
            context.lineTo(870, dividerY);
            context.stroke();
            context.fillStyle = palette.accent;
            context.beginPath();
            context.arc(CARD_WIDTH / 2, dividerY, 5, 0, Math.PI * 2);
            context.fill();

            const translationTop = dividerY + 62;
            const translationAreaHeight = Math.max(
                150,
                contentBottom - translationTop - 48,
            );
            context.direction = "ltr";
            context.textAlign = "center";
            context.fillStyle = palette.muted;
            const translation = fittedLines(
                context,
                translationText,
                serifFont,
                400,
                34,
                16,
                820,
                translationAreaHeight,
                1.5,
            );
            const translationHeight =
                translation.lines.length * translation.lineHeight;
            let translationY =
                translationTop +
                Math.max(0, (translationAreaHeight - translationHeight) / 2) +
                translation.fontSize;
            context.font = `400 ${translation.fontSize}px ${serifFont}`;
            for (const line of translation.lines) {
                context.fillText(line, CARD_WIDTH / 2, translationY);
                translationY += translation.lineHeight;
            }

            context.font = `500 20px ${uiFont}`;
            context.fillStyle = `${palette.muted}cc`;
            context.fillText(
                translationEditionName,
                CARD_WIDTH / 2,
                Math.min(translationY + 18, contentBottom + 5),
            );
        }

        if (showBranding) {
            const isArabic = locale === "ar";
            const brandText = t("shareBrand");
            const brandFont = isArabic ? arabicUiFont : uiFont;
            context.font = `600 21px ${brandFont}`;
            const textWidth = context.measureText(brandText).width;
            const iconWidth = 42;
            const gap = 16;
            const horizontalPadding = 28;
            const contentWidth = textWidth + iconWidth + gap;
            const badgeWidth = contentWidth + horizontalPadding * 2;
            const badgeX = (CARD_WIDTH - badgeWidth) / 2;
            const badgeY = 1198;
            const badgeHeight = 64;
            const contentStart = (CARD_WIDTH - contentWidth) / 2;
            const iconX = isArabic
                ? contentStart + textWidth + gap + iconWidth / 2
                : contentStart + iconWidth / 2;
            const textX = isArabic
                ? contentStart + textWidth
                : contentStart + iconWidth + gap;

            context.fillStyle = `${palette.accent}12`;
            roundedRect(
                context,
                badgeX,
                badgeY,
                badgeWidth,
                badgeHeight,
                badgeHeight / 2,
            );
            context.strokeStyle = `${palette.accent}40`;
            context.lineWidth = 1.5;
            context.beginPath();
            context.roundRect(
                badgeX,
                badgeY,
                badgeWidth,
                badgeHeight,
                badgeHeight / 2,
            );
            context.stroke();

            drawBookMark(
                context,
                iconX,
                badgeY + badgeHeight / 2,
                palette.accent,
            );

            context.direction = isArabic ? "rtl" : "ltr";
            context.textAlign = isArabic ? "right" : "left";
            context.fillStyle = palette.foreground;
            context.font = `600 21px ${brandFont}`;
            context.fillText(brandText, textX, badgeY + 40);
        }

        setIsRendering(false);
    }, [
        arabicText,
        locale,
        palette,
        ayahReference,
        riwayah,
        showBranding,
        showTranslation,
        surahNumber,
        t,
        translationEditionName,
        translationText,
    ]);

    useEffect(() => {
        drawCard().catch(() => {
            setRenderFailed(true);
            setIsRendering(false);
        });
        return () => {
            renderVersion.current += 1;
        };
    }, [drawCard]);

    async function copyImage() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsCopying(true);
        try {
            const blob = await canvasBlob(canvas);
            if (!navigator.clipboard?.write || !("ClipboardItem" in window)) {
                throw new Error("Image clipboard is unavailable.");
            }
            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
            ]);
            toast.success(t("shareCopied"));
        } catch {
            toast.error(t("shareCopyFailed"));
        } finally {
            setIsCopying(false);
        }
    }

    function downloadImage() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `quran-${surahName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${ayahNumber}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success(t("shareDownloaded"));
    }

    return (
        <div className="pb-1">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 pe-12 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft className="size-4 rtl:rotate-180" />
                {t("back")}
            </button>

            <header className="mt-4 pe-9">
                <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                    {t("shareCardEyebrow")}
                </p>
                <h1
                    id="ayah-actions-title"
                    tabIndex={-1}
                    className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                >
                    {t("shareCardTitle")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("shareCardDescription")}
                </p>
            </header>

            <div className="mt-5 overflow-hidden rounded-2xl bg-muted/40 p-2 ring-1 ring-border/50">
                <div className="relative mx-auto w-full max-w-[min(16rem,42dvh)] overflow-hidden rounded-xl shadow-sm">
                    <canvas
                        ref={canvasRef}
                        aria-label={t("sharePreview")}
                        className="block aspect-4/5 w-full bg-muted"
                    />
                    {isRendering && (
                        <div className="absolute inset-0 grid place-items-center bg-background/65 backdrop-blur-sm">
                            <LoaderCircle className="size-6 animate-spin text-primary" />
                        </div>
                    )}
                </div>
            </div>

            {renderFailed && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {t("shareRenderFailed")}
                </p>
            )}
            <div className="mt-4 rounded-xl border border-border/60 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Palette className="size-4 text-primary" />
                    {t("shareStyle")}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["night", "parchment", "emerald"] as const).map(
                        (option) => (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={theme === option}
                                onClick={() => setTheme(option)}
                                className={`flex min-h-11 flex-wrap items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    theme === option
                                        ? "bg-primary/10 text-primary ring-primary/25"
                                        : "bg-background/70 text-muted-foreground ring-border/50 hover:text-foreground"
                                }`}
                            >
                                <span
                                    className="size-3.5 rounded-full ring-1 ring-black/10"
                                    style={{
                                        background: THEMES[option].background,
                                    }}
                                />
                                {t(`shareThemes.${option}`)}
                            </button>
                        ),
                    )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        aria-pressed={showTranslation}
                        onClick={() => setShowTranslation((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl bg-background/70 px-3.5 py-3 text-sm ring-1 ring-border/50 transition-colors hover:bg-background"
                    >
                        <span className="flex items-center gap-2">
                            <BookOpenText className="size-4 text-primary" />
                            {t("shareTranslation")}
                        </span>
                        <span
                            className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                                showTranslation
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {showTranslation && <Check className="size-3.5" />}
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={showBranding}
                        onClick={() => setShowBranding((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl bg-background/70 px-3.5 py-3 text-sm ring-1 ring-border/50 transition-colors hover:bg-background"
                    >
                        <span>{t("shareBranding")}</span>
                        <span
                            className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                                showBranding
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {showBranding && <Check className="size-3.5" />}
                        </span>
                    </button>
                </div>
            </div>

            <div className="sticky -bottom-4 mt-4 grid grid-cols-1 gap-2 border-t border-border/60 bg-background py-3 min-[360px]:grid-cols-2 sm:-bottom-7">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isRendering || isCopying || renderFailed}
                    onClick={copyImage}
                    className="min-h-11 rounded-xl"
                >
                    {isCopying ? (
                        <LoaderCircle className="animate-spin" />
                    ) : (
                        <Clipboard />
                    )}
                    {t("copyShareCard")}
                </Button>
                <Button
                    type="button"
                    disabled={isRendering || renderFailed}
                    onClick={downloadImage}
                    className="min-h-11 rounded-xl"
                >
                    <Download />
                    {t("downloadShareCard")}
                </Button>
            </div>
        </div>
    );
}
