"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import joinGroup from "../server/join-group";

export default function GroupForms({
    initialInviteCode = "",
}: {
    initialInviteCode?: string;
}) {
    const t = useTranslations("Groups");
    const router = useRouter();
    const [pending, setPending] = useState(false);
    async function join(formData: FormData) {
        setPending(true);
        try {
            const result = await joinGroup({
                inviteCode: formData.get("inviteCode"),
            });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "not_found"
                            ? "join.notFound"
                            : "join.error",
                    ),
                );
                return;
            }
            toast.success(t("join.success"));
            router.push(`/groups/${result.groupId}`);
            router.refresh();
        } catch {
            toast.error(t("join.error"));
        } finally {
            setPending(false);
        }
    }
    return (
        <section className="mt-10 rounded-2xl border border-border/60 bg-card/45 p-5 sm:p-7">
            <h2 className="text-lg font-semibold">{t("join.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
                {t("join.description")}
            </p>
            <form
                action={join}
                aria-busy={pending}
                className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"
            >
                <div className="flex-1 space-y-2">
                    <Label htmlFor="invite-code">{t("join.code")}</Label>
                    <Input
                        id="invite-code"
                        name="inviteCode"
                        required
                        maxLength={30}
                        disabled={pending}
                        defaultValue={initialInviteCode}
                        placeholder={t("join.codePlaceholder")}
                        autoCapitalize="characters"
                        dir="ltr"
                        className="h-11 font-mono uppercase"
                    />
                </div>
                <Button disabled={pending} className="h-11">
                    {t(pending ? "join.submitting" : "join.submit")}
                </Button>
            </form>
        </section>
    );
}
