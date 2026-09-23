"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
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

const formSchema = z
    .object({
        email: z.email("Email is required and must be a valid email address."),
        password: z.string().min(8, "Password must be at least 8 characters."),
        confirmPassword: z
            .string()
            .min(8, "Password must be at least 8 characters."),
        name: z.string().min(2, "Name must be at least 2 characters."),
        image: z.url("Invalid URL").or(z.literal("")),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "The passwords are not matching.",
        path: ["confirmPassword"],
    });

export default function SignUpPage() {
    const [loading, setLoading] = useState(false);

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
                    onError: (ctx) => {
                        setLoading(false);
                        toast.error("We couldn't create your account.", {
                            description:
                                ctx.error.message ||
                                "Please review your details and try again.",
                        });
                    },
                },
            );
        },
    });

    return (
        <main className="flex min-h-dvh items-center justify-center px-4 py-24 sm:px-6">
            <Card className="w-full max-w-lg gap-0 border-primary/15 bg-card/90 py-0 shadow-lg backdrop-blur-sm">
                <CardHeader className="border-b border-primary/10 px-6 pt-7 pb-6 sm:px-8">
                    <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen aria-hidden="true" className="size-5" />
                    </span>
                    <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                        BEGIN YOUR JOURNEY
                    </p>
                    <CardTitle className="text-2xl tracking-tight">
                        Create your reading space.
                    </CardTitle>
                    <CardDescription className="leading-6">
                        Save your preferences and make the Quran reader yours.
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
                            <form.Field
                                name="email"
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Email
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
                            />
                            <form.Field
                                name="password"
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Password
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
                            />
                            <form.Field
                                name="confirmPassword"
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Confirm Password
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
                            />
                            <form.Field
                                name="name"
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Full Name
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
                                                placeholder="John Doe"
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
                            />
                            <form.Field
                                name="image"
                                children={(field) => {
                                    const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                                Image URL
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
                                                placeholder="https://example.com/image.jpg"
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
                            />
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
                            Reset
                        </Button>
                        <Button type="submit" form="signup-form">
                            {loading ? "Signing Up..." : "Sign Up"}
                            <ArrowRight aria-hidden="true" />
                        </Button>
                    </Field>
                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            href="/sign-in"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
