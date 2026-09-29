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
        <section className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
            <div className="border-b border-border/60 pb-4">
                <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary">
                    {eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    {title}
                </h2>
            </div>
            <div className="divide-y divide-border/50 [&>*]:py-5 [&>*:last-child]:pb-0">
                {children}
            </div>
        </section>
    );
}
