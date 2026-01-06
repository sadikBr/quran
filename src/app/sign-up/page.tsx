"use client";

import { useForm } from "@tanstack/react-form";
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
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    const router = useRouter();
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
                        router.push("/dashboard");
                    },
                    onError: (ctx) => {
                        console.log(ctx.error);
                        toast(
                            "Something went wrong. You submitted the following values:",
                            {
                                description: (
                                    <pre className="mt-2 overflow-x-auto rounded-md p-4">
                                        <code>
                                            {JSON.stringify(value, null, 2)}
                                        </code>
                                    </pre>
                                ),
                                position: "top-left",
                                classNames: {
                                    content: "flex flex-col gap-2",
                                },
                                style: {
                                    "--border-radius":
                                        "calc(var(--radius)  + 4px)",
                                } as React.CSSProperties,
                            },
                        );
                    },
                },
            );
        },
    });

    return (
        <div className="w-screen h-screen flex items-center justify-center">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>Create a New Account</CardTitle>
                    <CardDescription>
                        Want to start reading and memorizing the Quran? Join us
                        and track your progress!
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                <CardFooter>
                    <Field orientation="horizontal">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => form.reset()}
                        >
                            Reset
                        </Button>
                        <Button type="submit" form="signup-form">
                            {loading ? "Signing Up..." : "Sign Up"}
                        </Button>
                    </Field>
                </CardFooter>
            </Card>
        </div>
    );
}
