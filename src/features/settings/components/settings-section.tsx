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
        <section className="grid gap-7 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
            <div className="relative self-start pl-5 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-gradient-to-b before:from-primary before:via-primary/30 before:to-transparent">
                <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary">
                    {eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    {title}
                </h2>
            </div>
            <div className="space-y-8">{children}</div>
        </section>
    );
}
