"use client";

import {
    AlertTriangle,
    Camera,
    KeyRound,
    Laptop,
    Save,
    Smartphone,
    UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "../auth-client";

function getInitials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "U"
    );
}

type UserSession = {
    token: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    createdAt: Date | string;
};

function formatSessionDate(date: Date | string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(date));
}

function getSessionDevice(userAgent?: string | null) {
    if (!userAgent) return "Unknown device";

    const browser = userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Edg")
          ? "Microsoft Edge"
          : userAgent.includes("Chrome")
            ? "Chrome"
            : userAgent.includes("Safari")
              ? "Safari"
              : "Web browser";
    const operatingSystem = userAgent.includes("Windows")
        ? "Windows"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Android")
            ? "Android"
            : userAgent.includes("iPhone") || userAgent.includes("iPad")
              ? "iOS"
              : userAgent.includes("Linux")
                ? "Linux"
                : null;

    return operatingSystem ? `${browser} on ${operatingSystem}` : browser;
}

export default function ProfileForm({
    initialName,
    initialImage,
    initialEmail,
    currentSessionToken,
}: {
    initialName: string;
    initialImage: string | null;
    initialEmail: string;
    currentSessionToken: string;
}) {
    const [name, setName] = useState(initialName);
    const [image, setImage] = useState(initialImage ?? "");
    const [email, setEmail] = useState(initialEmail);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [revokingToken, setRevokingToken] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadSessions() {
            const { data, error } = await authClient.listSessions();

            if (error) {
                toast.error("We could not load your active sessions");
            } else {
                setSessions((data ?? []) as UserSession[]);
            }

            setIsLoadingSessions(false);
        }

        void loadSessions();
    }, []);

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            toast.error("Please enter your name");
            return;
        }

        setIsSavingProfile(true);

        const { error } = await authClient.updateUser({
            name: trimmedName,
            image: image.trim() || null,
        });

        setIsSavingProfile(false);

        if (error) {
            toast.error(error.message || "We could not update your profile");
            return;
        }

        toast.success("Profile updated");
    }

    function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
        const [file] = Array.from(event.target.files ?? []);

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file");
            return;
        }

        if (file.size > 1_000_000) {
            toast.error("Please choose an image smaller than 1 MB");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                setImage(reader.result);
            }
        };
        reader.onerror = () => {
            toast.error("We could not read that image");
        };
        reader.readAsDataURL(file);
    }

    async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const newEmail = email.trim().toLowerCase();

        if (newEmail === initialEmail) {
            toast.message("That is already your current email address");
            return;
        }

        setIsSavingEmail(true);
        const { error } = await authClient.changeEmail({ newEmail });
        setIsSavingEmail(false);

        if (error) {
            toast.error(error.message || "We could not update your email");
            return;
        }

        toast.success("Email address updated");
    }

    async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (newPassword.length < 8) {
            toast.error("Your new password must contain at least 8 characters");
            return;
        }

        setIsSavingPassword(true);
        const { error } = await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        });
        setIsSavingPassword(false);

        if (error) {
            toast.error(error.message || "We could not update your password");
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        toast.success("Password updated. Other sessions were signed out.");
    }

    async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (deleteConfirmation !== "DELETE") {
            toast.error('Type "DELETE" to confirm account deletion');
            return;
        }

        setIsDeleting(true);
        const { error } = await authClient.deleteUser({
            password: deletePassword,
            callbackURL: "/",
        });
        setIsDeleting(false);

        if (error) {
            toast.error(error.message || "We could not delete your account");
            return;
        }

        window.location.assign("/");
    }

    async function revokeSession(token: string) {
        setRevokingToken(token);
        const { error } = await authClient.revokeSession({ token });
        setRevokingToken(null);

        if (error) {
            toast.error(error.message || "We could not revoke that session");
            return;
        }

        setSessions((currentSessions) =>
            currentSessions.filter((session) => session.token !== token),
        );
        toast.success("Session signed out");
    }

    return (
        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(12rem,0.55fr)_minmax(0,1.45fr)]">
            <aside className="lg:sticky lg:top-10 lg:self-start">
                <div>
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="group relative shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Choose profile image"
                    >
                        <Avatar className="size-24 border-2 border-primary/20">
                            {image.trim() && <AvatarImage src={image} alt="" />}
                            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <Camera aria-hidden="true" className="size-4" />
                            <span className="sr-only">
                                Choose profile image
                            </span>
                        </span>
                    </button>
                    <Input
                        ref={imageInputRef}
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                    />
                    <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-primary">
                        ACCOUNT PROFILE
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                        {name}
                    </p>
                    <p className="mt-1 break-all text-sm leading-6 text-muted-foreground">
                        {email}
                    </p>
                    <p className="mt-6 border-t border-primary/15 pt-4 text-sm leading-6 text-muted-foreground">
                        Click the image to change it. Your details are private
                        to your reading space.
                    </p>
                </div>
            </aside>

            <div>
                <section className="border-b border-primary/15 pb-12">
                    <div className="flex items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <UserRound
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h2 className="font-semibold text-foreground">
                                    Personal details
                                </h2>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Choose how your identity appears in Quran
                                Reader.
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={handleProfileSubmit}
                        className="mt-8 grid gap-6 sm:grid-cols-2"
                    >
                        <div className="grid content-start gap-2">
                            <Label htmlFor="name">Display name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                autoComplete="name"
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <p className="text-sm leading-none font-medium">
                                Profile image
                            </p>
                            {image.startsWith("data:image/") ? (
                                <div className="flex min-h-9 items-center justify-between gap-3 border-b border-primary/20 py-1 text-sm">
                                    <span className="text-muted-foreground">
                                        Image uploaded from your device
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setImage("")}
                                        className="shrink-0 font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <Input
                                    id="profile-image"
                                    type="url"
                                    value={image}
                                    onChange={(event) =>
                                        setImage(event.target.value)
                                    }
                                    placeholder="https://example.com/photo.jpg"
                                    autoComplete="url"
                                />
                            )}
                            <p className="text-xs leading-5 text-muted-foreground">
                                Click your avatar to upload an image, or paste
                                an image URL here.
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={isSavingProfile}>
                                <Save aria-hidden="true" />
                                {isSavingProfile ? "Saving…" : "Save details"}
                            </Button>
                        </div>
                    </form>
                </section>

                <section className="border-b border-primary/15 py-12">
                    <div>
                        <h2 className="font-semibold text-foreground">
                            Account access
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            Keep your contact details and password up to date.
                        </p>
                    </div>
                    <div className="mt-8 space-y-8">
                        <form
                            onSubmit={handleEmailSubmit}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    autoComplete="email"
                                    aria-label="Email address"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={isSavingEmail}
                            >
                                {isSavingEmail ? "Updating…" : "Update email"}
                            </Button>
                        </form>

                        <div className="border-t border-primary/15 pt-8">
                            <div className="flex items-center gap-2">
                                <KeyRound
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h3 className="font-semibold text-foreground">
                                    Password
                                </h3>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Use a strong, unique password. Updating it signs
                                out your other sessions.
                            </p>
                            <form
                                onSubmit={handlePasswordSubmit}
                                className="mt-6 grid gap-4 sm:grid-cols-2"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="current-password">
                                        Current password
                                    </Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) =>
                                            setCurrentPassword(
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-password">
                                        New password
                                    </Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) =>
                                            setNewPassword(event.target.value)
                                        }
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={isSavingPassword}
                                    >
                                        {isSavingPassword
                                            ? "Updating…"
                                            : "Update password"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="border-b border-primary/15 py-12">
                    <div className="flex items-start gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Smartphone
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h2 className="font-semibold text-foreground">
                                    Active sessions
                                </h2>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Review where your account is signed in and
                                remove sessions you do not recognize.
                            </p>
                        </div>
                    </div>
                    <div className="relative mt-8">
                        <span
                            aria-hidden="true"
                            className="absolute top-5 bottom-5 left-[3.5px] w-px bg-primary/20"
                        />
                        {isLoadingSessions ? (
                            <p className="text-sm text-muted-foreground">
                                Loading active sessions…
                            </p>
                        ) : sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No active sessions found.
                            </p>
                        ) : (
                            sessions.map((session) => {
                                const isCurrentSession =
                                    session.token === currentSessionToken;

                                return (
                                    <div
                                        key={session.token}
                                        className="relative flex flex-wrap items-center gap-4 pb-8 pl-8 last:pb-1"
                                    >
                                        <span className="absolute top-4 left-0 size-2 rounded-full bg-primary ring-4 ring-background" />
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Laptop
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-foreground">
                                                {getSessionDevice(
                                                    session.userAgent,
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                                {isCurrentSession
                                                    ? "This device · "
                                                    : "Signed in · "}
                                                {formatSessionDate(
                                                    session.createdAt,
                                                )}
                                            </p>
                                        </div>
                                        {isCurrentSession ? (
                                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                                Current
                                            </span>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    revokeSession(session.token)
                                                }
                                                disabled={
                                                    revokingToken ===
                                                    session.token
                                                }
                                            >
                                                {revokingToken === session.token
                                                    ? "Signing out…"
                                                    : "Sign out"}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="mt-12 border-s-2 border-destructive/70 bg-destructive/5 py-6 pe-6 ps-5 sm:py-7 sm:pe-7 sm:ps-6">
                    <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive text-white">
                            <AlertTriangle
                                aria-hidden="true"
                                className="size-4"
                            />
                        </span>
                        <div>
                            <h2 className="font-semibold text-destructive">
                                Delete account
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                This permanently removes your profile,
                                preferences, and saved reading progress. This
                                cannot be undone.
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={handleDeleteAccount}
                        className="mt-6 grid gap-4"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="delete-password">
                                Current password
                            </Label>
                            <Input
                                id="delete-password"
                                type="password"
                                value={deletePassword}
                                onChange={(event) =>
                                    setDeletePassword(event.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="delete-confirmation">
                                Type DELETE to confirm
                            </Label>
                            <Input
                                id="delete-confirmation"
                                value={deleteConfirmation}
                                onChange={(event) =>
                                    setDeleteConfirmation(event.target.value)
                                }
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={isDeleting}
                            >
                                {isDeleting
                                    ? "Deleting account…"
                                    : "Permanently delete account"}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
