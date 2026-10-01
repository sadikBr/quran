"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, BookOpen, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/features/auth/auth-client";
import { safeReturnTo } from "@/features/auth/return-to";

export default function SignInPage() {
    const returnTo = safeReturnTo(useSearchParams().get("returnTo"));
    const [loading, setLoading] = useState(false);
    const locale = useLocale();
    const t = useTranslations("Auth");
    const formSchema = z.object({
        email: z.email(t("validation.email")),
        password: z.string().min(8, t("validation.passwordLength")),
    });

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        validators: {
            onSubmit: formSchema,
        },
        onSubmit: async ({ value }) => {
            const { email, password } = value;
            authClient.signIn.email(
                { email, password },
                {
                    onRequest: (_ctx) => {
                        setLoading(true);
                    },
                    onSuccess: (_ctx) => {
                        window.location.assign(returnTo);
                    },
                    onError: (_ctx) => {
                        setLoading(false);
                        toast.error(t("signIn.errorTitle"), {
                            description: t("signIn.errorDescription"),
                        });
                    },
                },
            );
        },
    });

    return (
        <main
            lang={locale}
            dir={locale === "ar" ? "rtl" : "ltr"}
            className="flex min-h-dvh items-center justify-center px-4 py-24 sm:px-6"
        >
            <Card className="w-full max-w-md gap-0 overflow-hidden py-0">
                <CardHeader className="border-b border-border/50 p-5 sm:p-6">
                    <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                        {t("signIn.eyebrow")}
                    </p>
                    <CardTitle>
                        <h1 className="text-2xl leading-tight tracking-tight">
                            {t("signIn.title")}
                        </h1>
                    </CardTitle>
                    <CardDescription className="leading-6">
                        {t("signIn.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                    <form
                        id="signin-form"
                        aria-busy={loading}
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                    >
                        <FieldGroup>
                            <form.Field name="email">
                                {(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                {t("fields.email")}
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                aria-invalid={isInvalid}
                                                placeholder="example@example.com"
                                                autoComplete="email"
                                                inputMode="email"
                                            />
                                            {isInvalid && (
                                                <FieldError
                                                    errors={
                                                        field.state.meta.errors
                                                    }
                                                />
                                            )}
                                        </Field>
                                    );
                                }}
                            </form.Field>
                            <form.Field name="password">
                                {(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                {t("fields.password")}
                                            </FieldLabel>
                                            <Input
                                                type="password"
                                                id={field.name}
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                aria-invalid={isInvalid}
                                                placeholder="********"
                                                autoComplete="current-password"
                                            />
                                            {isInvalid && (
                                                <FieldError
                                                    errors={
                                                        field.state.meta.errors
                                                    }
                                                />
                                            )}
                                        </Field>
                                    );
                                }}
                            </form.Field>
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-5 border-t border-border/50 bg-muted/20 p-5 sm:p-6">
                    <Field orientation="horizontal" className="justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading}
                            onClick={() => form.reset()}
                        >
                            {t("actions.reset")}
                        </Button>
                        <Button
                            type="submit"
                            form="signin-form"
                            disabled={loading}
                        >
                            {loading && (
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="size-4 animate-spin"
                                />
                            )}
                            {loading
                                ? t("signIn.submitting")
                                : t("signIn.submit")}
                            {!loading && <ArrowRight aria-hidden="true" />}
                        </Button>
                    </Field>
                    <p className="text-center text-sm text-muted-foreground">
                        {t("signIn.prompt")}{" "}
                        <Link
                            href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {t("signIn.promptAction")}
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
