export default function SettingsSection({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                {eyebrow}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
                {title}
            </h2>
            <div className="mt-6 space-y-7">{children}</div>
        </section>
    );
}
