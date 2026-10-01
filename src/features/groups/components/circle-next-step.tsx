"use client";
import { Compass } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { circleNextStep } from "../next-step";

export default function CircleNextStep({
    step,
}: {
    step: ReturnType<typeof circleNextStep>;
}) {
    const t = useTranslations("Groups.flow");
    const label = t("action" in step && step.action ? step.action : step.label);
    return (
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Compass aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold leading-6">
                        {t("next")}
                    </h2>
                    {(!step.href || label !== t(step.label)) && (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {t(step.label)}
                        </p>
                    )}
                </div>
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
