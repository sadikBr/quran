"use client";

import {
    LoaderCircle,
    LogOut,
    RotateCcw,
    ShieldCheck,
    ShieldOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { manageUser, previewUserReset } from "../server/user-actions";
import type { UserAction, UserDataSummary } from "../server/user-service";
import AdminDialog from "./admin-dialog";

export function UserDataCounts({ summary }: { summary: UserDataSummary }) {
    const t = useTranslations("Admin.users");
    return (
        <dl className="grid gap-x-5 sm:grid-cols-2">
            {Object.entries(summary).map(([key, count]) => (
                <div
                    key={key}
                    className="flex min-w-0 items-start justify-between gap-3 border-b border-border/50 py-3 text-sm"
                >
                    <dt className="min-w-0 leading-6 text-muted-foreground">
                        {t(`data.${key}`)}
                    </dt>
                    <dd className="shrink-0 rounded-md bg-primary/5 px-2 py-0.5 font-semibold tabular-nums">
                        {count}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

export default function UserControls({
    account,
    supervises,
}: {
    account: {
        id: string;
        name: string;
        email: string;
        role: string;
        suspendedAt: Date | null;
        updatedAt: Date;
    };
    supervises: boolean;
}) {
    const t = useTranslations("Admin.users");
    const router = useRouter();
    const id = useId();
    const [action, setAction] = useState<UserAction | null>(null);
    const [pending, setPending] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [reason, setReason] = useState("");
    const [preview, setPreview] =
        useState<Awaited<ReturnType<typeof previewUserReset>>>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const request = useRef(0);
    async function open(next: UserAction) {
        const revision = ++request.current;
        setAction(next);
        setConfirmation("");
        setReason("");
        setError("");
        setPreview(null);
        if (next !== "reset") return;
        setLoading(true);
        try {
            const value = await previewUserReset(account.id);
            if (request.current !== revision) return;
            setPreview(value);
            if (!value) setError(t("previewFailed"));
        } catch {
            if (request.current === revision) setError(t("previewFailed"));
        } finally {
            if (request.current === revision) setLoading(false);
        }
    }
    function close() {
        request.current++;
        setAction(null);
        setLoading(false);
    }
    async function confirm() {
        if (!action || pending || (action === "reset" && !preview)) return;
        setPending(true);
        setError("");
        try {
            const result = await manageUser({
                userId: account.id,
                action,
                confirmation,
                reason,
                expectedUpdatedAt:
                    preview?.updatedAt ?? account.updatedAt.toISOString(),
            });
            if (!result.success) {
                setError(t(`errors.${result.reason}`));
                if (result.reason === "stale") {
                    close();
                    toast.error(t("errors.stale"));
                    router.refresh();
                }
                return;
            }
            close();
            toast.success(t(`success.${action}`));
            router.refresh();
        } catch {
            setError(t("errors.failed"));
        } finally {
            setPending(false);
        }
    }
    const protectedAccount = account.role === "admin";
    const options = [
        { key: "sign_out" as const, icon: LogOut, disabled: protectedAccount },
        {
            key: account.suspendedAt
                ? ("reactivate" as const)
                : ("suspend" as const),
            icon: account.suspendedAt ? ShieldCheck : ShieldOff,
            disabled: protectedAccount || (supervises && !account.suspendedAt),
        },
        {
            key: "reset" as const,
            icon: RotateCcw,
            disabled: protectedAccount || supervises,
        },
    ];
    return (
        <section className="app-card overflow-hidden">
            <div className="border-b border-border/60 p-4 sm:p-5">
                <h2 className="flex items-center gap-2 font-semibold">
                    <ShieldCheck
                        aria-hidden="true"
                        className="size-5 text-primary"
                    />
                    {t("actionsTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("actionsHint")}
                </p>
            </div>
            <div className="divide-y divide-border/50 px-4 sm:px-5">
                {options.map(({ key, icon: Icon, disabled }) => (
                    <div key={key} className="space-y-2 py-4">
                        <Button
                            variant="outline"
                            disabled={disabled || pending}
                            onClick={() => open(key)}
                            className={`h-auto min-h-11 w-full justify-start whitespace-normal py-2.5 text-start ${key === "reset" ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
                        >
                            <Icon aria-hidden="true" className="shrink-0" />
                            {t(key)}
                        </Button>
                        <p className="text-sm leading-6 text-muted-foreground">
                            {t(`${key}Hint`)}
                        </p>
                    </div>
                ))}
            </div>
            {(protectedAccount || supervises) && (
                <p className="border-t border-border/60 bg-primary/5 p-4 text-sm leading-7 text-muted-foreground sm:p-5">
                    {t(protectedAccount ? "protected" : "supervisorHint")}
                </p>
            )}
            <AdminDialog
                open={action !== null}
                onClose={close}
                pending={pending}
                title={
                    action ? t(`${action}Title`, { name: account.name }) : ""
                }
                description={
                    action
                        ? t(
                              action === "reset"
                                  ? "resetDescription"
                                  : `${action}Hint`,
                          )
                        : ""
                }
                footer={
                    <>
                        <Button
                            variant="outline"
                            disabled={pending}
                            onClick={close}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            variant={
                                action === "reset" || action === "suspend"
                                    ? "destructive"
                                    : "default"
                            }
                            onClick={confirm}
                            disabled={
                                pending ||
                                loading ||
                                reason.trim().length < 3 ||
                                (action === "reset" &&
                                    (!preview ||
                                        confirmation.trim().toLowerCase() !==
                                            account.email.toLowerCase()))
                            }
                        >
                            {pending && (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="size-4 animate-spin"
                                />
                            )}
                            {t(pending ? "working" : (action ?? "reset"))}
                        </Button>
                    </>
                }
            >
                <div className="space-y-5" aria-busy={pending || loading}>
                    <p className="rounded-xl border border-border/60 bg-muted/30 p-3">
                        <strong className="block break-words">
                            {account.name}
                        </strong>
                        <bdi className="mt-1 block break-all text-left text-sm rtl:text-right text-muted-foreground">
                            {account.email}
                        </bdi>
                    </p>
                    {action === "reset" && (
                        <>
                            <section aria-live="polite">
                                <h3 className="text-sm font-semibold">
                                    {t("previewTitle")}
                                </h3>
                                {loading ? (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {t("previewLoading")}
                                    </p>
                                ) : (
                                    preview && (
                                        <UserDataCounts
                                            summary={preview.summary}
                                        />
                                    )
                                )}
                            </section>
                            <div className="rounded-xl bg-primary/5 p-3 text-sm leading-7">
                                <h3 className="font-semibold">
                                    {t("keepTitle")}
                                </h3>
                                <p className="mt-1 text-muted-foreground">
                                    {t("keepHint")}
                                </p>
                                {account.suspendedAt && (
                                    <p className="mt-2 font-medium">
                                        {t("suspendedResetHint")}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${id}-email`}>
                                    {t("emailConfirmation")}
                                </Label>
                                <bdi className="block break-all text-left text-sm rtl:text-right text-muted-foreground">
                                    {account.email}
                                </bdi>
                                <Input
                                    id={`${id}-email`}
                                    value={confirmation}
                                    onChange={(e) =>
                                        setConfirmation(e.target.value)
                                    }
                                    disabled={pending}
                                    autoComplete="off"
                                    spellCheck={false}
                                    dir="ltr"
                                    className="h-11"
                                />
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor={`${id}-reason`}>{t("reason")}</Label>
                        <Textarea
                            id={`${id}-reason`}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={pending}
                            minLength={3}
                            maxLength={500}
                            rows={3}
                            placeholder={t("reasonPlaceholder")}
                            aria-describedby={`${id}-reason-hint`}
                            dir="auto"
                        />
                        <p
                            id={`${id}-reason-hint`}
                            className="text-xs leading-6 text-muted-foreground"
                        >
                            {t("reasonHint")}
                        </p>
                    </div>
                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive"
                        >
                            {error}
                        </p>
                    )}
                </div>
            </AdminDialog>
        </section>
    );
}
