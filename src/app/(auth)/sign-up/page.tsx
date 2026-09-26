"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
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

export default function SignUpPage() {
    const [loading, setLoading] = useState(false);
    const locale = useLocale();
    const t = useTranslations("Auth");
    const formSchema = z
        .object({
            email: z.email(t("validation.email")),
            password: z.string().min(8, t("validation.passwordLength")),
            confirmPassword: z.string().min(8, t("validation.passwordLength")),
            name: z.string().min(2, t("validation.nameLength")),
            image: z.url(t("validation.imageUrl")).or(z.literal("")),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("validation.passwordMismatch"),
            path: ["confirmPassword"],
        });

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
            name: "",
            image: "",
        },
        validators: {
            onSubmit: formSchema,
            onChange: formSchema,
        },
        onSubmit: async ({ value }) => {
            const { email, password, name, image } = value;
            authClient.signUp.email(
                { email, password, name, image },
                {
                    onRequest: (_ctx) => {
                        setLoading(true);
                    },
                    onSuccess: (_ctx) => {
                        window.location.assign("/dashboard");
                    },
                    onError: (_ctx) => {
                        setLoading(false);
                        toast.error(t("signUp.errorTitle"), {
                            description: t("signUp.errorDescription"),
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
            <Card className="w-full max-w-lg gap-0 border-primary/15 bg-card/90 py-0 shadow-lg backdrop-blur-sm">
                <CardHeader className="border-b border-primary/10 px-6 pt-7 pb-6 sm:px-8">
                    <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                        {t("signUp.eyebrow")}
                    </p>
                    <CardTitle className="text-2xl tracking-tight">
                        {t("signUp.title")}
                    </CardTitle>
                    <CardDescription className="leading-6">
                        {t("signUp.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6 sm:px-8">
                    <form
                        id="signup-form"
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
                                                autoComplete="off"
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
                                                autoComplete="off"
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
                            <form.Field name="confirmPassword">
                                {(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                {t("fields.confirmPassword")}
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
                                                autoComplete="off"
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
                            <form.Field name="name">
                                {(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                {t("fields.fullName")}
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
                                                placeholder={t(
                                                    "fields.namePlaceholder",
                                                )}
                                                autoComplete="off"
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
                            <form.Field name="image">
                                {(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                {t("fields.imageUrl")}
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
                                                placeholder={t(
                                                    "fields.imagePlaceholder",
                                                )}
                                                autoComplete="off"
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
                <CardFooter className="flex-col items-stretch gap-5 border-t border-primary/10 px-6 py-6 sm:px-8">
                    <Field orientation="horizontal" className="justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => form.reset()}
                        >
                            {t("actions.reset")}
                        </Button>
                        <Button type="submit" form="signup-form">
                            {loading
                                ? t("signUp.submitting")
                                : t("signUp.submit")}
                            <ArrowRight aria-hidden="true" />
                        </Button>
                    </Field>
                    <p className="text-center text-sm text-muted-foreground">
                        {t("signUp.prompt")}{" "}
                        <Link
                            href="/sign-in"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {t("signUp.promptAction")}
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
