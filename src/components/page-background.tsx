export default function PageBackground() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-background bg-[radial-gradient(ellipse_80%_45%_at_50%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_70%)]"
        />
    );
}
