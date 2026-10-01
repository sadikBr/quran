const HIGHLIGHT_CLASSES = [
    "bg-primary/12",
    "dark:bg-primary/18",
    "ring-1",
    "ring-primary/40",
];
const HIGHLIGHT_DURATION = 1800;
const SETTLED_FRAME_COUNT = 4;
const MAX_SCROLL_WAIT = 4000;

export function findArabicAyah(
    ayahNumber: number,
    root: Pick<Document, "getElementById" | "querySelector"> = document,
) {
    if (!Number.isInteger(ayahNumber) || ayahNumber < 1) return null;
    return (
        root.getElementById(`ayah-${ayahNumber}`) ??
        root.querySelector<HTMLElement>(
            `.ayah[data-hafs-ayahs~="${ayahNumber}"]`,
        )
    );
}

export default function showArabicAyah(ayahNumber: number) {
    const foundAyah = findArabicAyah(ayahNumber);
    if (!foundAyah) return null;
    const targetAyah = foundAyah;

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    const initialRect = targetAyah.getBoundingClientRect();
    const wasInitiallyVisible =
        initialRect.bottom >= 0 && initialRect.top <= window.innerHeight;

    let animationFrame: number | undefined;
    let highlightTimeout: number | undefined;
    let lastTop = initialRect.top;
    let hasMoved = false;
    let settledFrames = 0;
    let highlighted = false;
    const startedAt = performance.now();

    function highlight() {
        if (highlighted) return;

        highlighted = true;
        targetAyah.classList.remove(...HIGHLIGHT_CLASSES);
        targetAyah.classList.add(...HIGHLIGHT_CLASSES);

        highlightTimeout = window.setTimeout(() => {
            targetAyah.classList.remove(...HIGHLIGHT_CLASSES);
        }, HIGHLIGHT_DURATION);
    }

    function highlightWhenScrollSettles() {
        const rect = targetAyah.getBoundingClientRect();
        const movedThisFrame = Math.abs(rect.top - lastTop) > 0.5;
        const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;

        hasMoved ||= movedThisFrame;
        settledFrames = movedThisFrame ? 0 : settledFrames + 1;
        lastTop = rect.top;

        const scrollHasSettled =
            isVisible &&
            settledFrames >= SETTLED_FRAME_COUNT &&
            (hasMoved || wasInitiallyVisible);
        const waitExpired = performance.now() - startedAt >= MAX_SCROLL_WAIT;

        if (scrollHasSettled || waitExpired) {
            highlight();
            return;
        }

        animationFrame = window.requestAnimationFrame(
            highlightWhenScrollSettles,
        );
    }

    targetAyah.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
    });

    if (prefersReducedMotion) {
        animationFrame = window.requestAnimationFrame(highlight);
    } else {
        animationFrame = window.requestAnimationFrame(
            highlightWhenScrollSettles,
        );
    }

    return () => {
        if (animationFrame !== undefined) {
            window.cancelAnimationFrame(animationFrame);
        }
        window.clearTimeout(highlightTimeout);
        targetAyah.classList.remove(...HIGHLIGHT_CLASSES);
    };
}
