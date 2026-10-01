import { cn } from "@/lib/utils";

export default function SectionNav({
    label,
    items,
    className,
}: {
    label: string;
    items: { id: string; label: string }[];
    className?: string;
}) {
    return (
        <nav
            aria-label={label}
            className={cn("flex flex-wrap gap-2", className)}
        >
            {items.map((item) => (
                <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="inline-flex min-h-11 items-center rounded-xl border border-border/60 bg-card px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {item.label}
                </a>
            ))}
        </nav>
    );
}
