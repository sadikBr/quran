import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Palette } from "lucide-react";

export default function PreferenceCard({
    icon: Icon,
    title,
    description,
    label,
    value,
}: {
    icon: typeof Palette;
    title: string;
    description: string;
    label: string;
    value: string;
}) {
    return (
        <Card className="gap-4 bg-card/80">
            <CardHeader className="px-5">
                <span className="mb-1 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="leading-6">
                    {description}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
                <div className="rounded-md border bg-background/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                        {value}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
