"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { circleNextStep } from "../next-step";

export default function CircleNextStep(
    props: Parameters<typeof circleNextStep>[0],
) {
    const t = useTranslations("Groups.flow");
    const step = circleNextStep(props);
    const label = t("action" in step && step.action ? step.action : step.label);
    return (
        <section className="mt-5 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-xs text-muted-foreground">{t("next")}</p>
                <p className="mt-1 text-sm font-medium">{t(step.label)}</p>
            </div>
            {step.href && (
                <Button asChild className="min-h-11 shrink-0 rounded-xl">
                    {step.href.includes("#") ? (
                        <a href={step.href}>{label}</a>
                    ) : (
                        <Link href={step.href}>{label}</Link>
                    )}
                </Button>
            )}
        </section>
    );
}
