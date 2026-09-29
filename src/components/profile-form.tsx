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
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "../features/auth/auth-client";

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

function formatSessionDate(date: Date | string, locale: string) {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(date));
}

export default function ProfileForm({
    initialName,
    initialImage,
    initialEmail,
    currentSessionToken,
    canDeleteAccount = true,
}: {
    initialName: string;
    initialImage: string | null;
    initialEmail: string;
    currentSessionToken: string;
    canDeleteAccount?: boolean;
}) {
    const t = useTranslations("Profile");
    const locale = useLocale();
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

    function getSessionDevice(userAgent?: string | null) {
        if (!userAgent) return t("devices.unknown");

        const browser = userAgent.includes("Firefox")
            ? "Firefox"
            : userAgent.includes("Edg")
              ? "Microsoft Edge"
              : userAgent.includes("Chrome")
                ? "Chrome"
                : userAgent.includes("Safari")
                  ? "Safari"
                  : t("devices.webBrowser");
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

        return operatingSystem
            ? t("devices.browserOnSystem", {
                  browser,
                  system: operatingSystem,
              })
            : browser;
    }

    useEffect(() => {
        async function loadSessions() {
            const { data, error } = await authClient.listSessions();

            if (error) {
                toast.error(t("feedback.sessionsLoadFailed"));
            } else {
                setSessions((data ?? []) as UserSession[]);
            }

            setIsLoadingSessions(false);
        }

        void loadSessions();
    }, [t]);

    async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            toast.error(t("feedback.nameRequired"));
            return;
        }

        setIsSavingProfile(true);

        const { error } = await authClient.updateUser({
            name: trimmedName,
            image: image.trim() || null,
        });

        setIsSavingProfile(false);

        if (error) {
            toast.error(t("feedback.profileUpdateFailed"));
            return;
        }

        toast.success(t("feedback.profileUpdated"));
    }

    function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
        const [file] = Array.from(event.target.files ?? []);

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error(t("feedback.imageFileRequired"));
            return;
        }

        if (file.size > 1_000_000) {
            toast.error(t("feedback.imageTooLarge"));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                setImage(reader.result);
            }
        };
        reader.onerror = () => {
            toast.error(t("feedback.imageReadFailed"));
        };
        reader.readAsDataURL(file);
    }

    async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const newEmail = email.trim().toLowerCase();

        if (newEmail === initialEmail) {
            toast.message(t("feedback.emailUnchanged"));
            return;
        }

        setIsSavingEmail(true);
        const { error } = await authClient.changeEmail({ newEmail });
        setIsSavingEmail(false);

        if (error) {
            toast.error(t("feedback.emailUpdateFailed"));
            return;
        }

        toast.success(t("feedback.emailUpdated"));
    }

    async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (newPassword.length < 8) {
            toast.error(t("feedback.passwordTooShort"));
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
            toast.error(t("feedback.passwordUpdateFailed"));
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        toast.success(t("feedback.passwordUpdated"));
    }

    async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (deleteConfirmation !== "DELETE") {
            toast.error(t("feedback.deleteConfirmationRequired"));
            return;
        }

        setIsDeleting(true);
        const { error } = await authClient.deleteUser({
            password: deletePassword,
            callbackURL: "/",
        });
        setIsDeleting(false);

        if (error) {
            toast.error(t("feedback.deleteFailed"));
            return;
        }

        window.location.assign("/");
    }

    async function revokeSession(token: string) {
        setRevokingToken(token);
        const { error } = await authClient.revokeSession({ token });
        setRevokingToken(null);

        if (error) {
            toast.error(t("feedback.sessionRevokeFailed"));
            return;
        }

        setSessions((currentSessions) =>
            currentSessions.filter((session) => session.token !== token),
        );
        toast.success(t("feedback.sessionRevoked"));
    }

    return (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(12rem,0.55fr)_minmax(0,1.45fr)]">
            <aside className="rounded-2xl border border-border/70 bg-card/70 p-5 lg:sticky lg:top-24 lg:self-start">
                <div>
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="group relative shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={t("aside.chooseImage")}
                    >
                        <Avatar className="size-20 border-2 border-primary/20">
                            {image.trim() && <AvatarImage src={image} alt="" />}
                            <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                            <Camera aria-hidden="true" className="size-4" />
                            <span className="sr-only">
                                {t("aside.chooseImage")}
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
                    <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-primary">
                        {t("aside.eyebrow")}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                        {name}
                    </p>
                    <p className="mt-1 break-all text-sm leading-6 text-muted-foreground">
                        {email}
                    </p>
                    <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
                        {t("aside.description")}
                    </p>
                </div>
            </aside>

            <div>
                <section className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
                    <div className="flex items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <UserRound
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h2 className="font-semibold text-foreground">
                                    {t("personal.title")}
                                </h2>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("personal.description")}
                            </p>
                        </div>
                    </div>
                    <form
                        onSubmit={handleProfileSubmit}
                        className="mt-5 grid gap-4 sm:grid-cols-2"
                    >
                        <div className="grid content-start gap-2">
                            <Label htmlFor="name">
                                {t("personal.displayName")}
                            </Label>
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
                                {t("personal.profileImage")}
                            </p>
                            {image.startsWith("data:image/") ? (
                                <div className="flex min-h-9 items-center justify-between gap-3 border-b border-primary/20 py-1 text-sm">
                                    <span className="text-muted-foreground">
                                        {t("personal.imageUploaded")}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setImage("")}
                                        className="shrink-0 font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {t("personal.removeImage")}
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
                                    placeholder={t(
                                        "personal.imageUrlPlaceholder",
                                    )}
                                    autoComplete="url"
                                />
                            )}
                            <p className="text-xs leading-5 text-muted-foreground">
                                {t("personal.imageHelp")}
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <Button type="submit" disabled={isSavingProfile}>
                                <Save aria-hidden="true" />
                                {isSavingProfile
                                    ? t("personal.saving")
                                    : t("personal.save")}
                            </Button>
                        </div>
                    </form>
                </section>

                <section className="mt-5 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
                    <div>
                        <h2 className="font-semibold text-foreground">
                            {t("access.title")}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {t("access.description")}
                        </p>
                    </div>
                    <div className="mt-5 space-y-5">
                        <form
                            onSubmit={handleEmailSubmit}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    {t("access.email")}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    autoComplete="email"
                                    aria-label={t("access.email")}
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={isSavingEmail}
                            >
                                {isSavingEmail
                                    ? t("access.updating")
                                    : t("access.updateEmail")}
                            </Button>
                        </form>

                        <div className="border-t border-border/60 pt-5">
                            <div className="flex items-center gap-2">
                                <KeyRound
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h3 className="font-semibold text-foreground">
                                    {t("access.passwordTitle")}
                                </h3>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("access.passwordDescription")}
                            </p>
                            <form
                                onSubmit={handlePasswordSubmit}
                                className="mt-6 grid gap-4 sm:grid-cols-2"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="current-password">
                                        {t("access.currentPassword")}
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
                                        {t("access.newPassword")}
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
                                            ? t("access.updating")
                                            : t("access.updatePassword")}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="mt-5 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Smartphone
                                    aria-hidden="true"
                                    className="size-4 text-primary"
                                />
                                <h2 className="font-semibold text-foreground">
                                    {t("sessions.title")}
                                </h2>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {t("sessions.description")}
                            </p>
                        </div>
                    </div>
                    <div className="relative mt-5">
                        <span aria-hidden="true" className="hidden" />
                        {isLoadingSessions ? (
                            <p className="text-sm text-muted-foreground">
                                {t("sessions.loading")}
                            </p>
                        ) : sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t("sessions.empty")}
                            </p>
                        ) : (
                            sessions.map((session) => {
                                const isCurrentSession =
                                    session.token === currentSessionToken;

                                return (
                                    <div
                                        key={session.token}
                                        className="relative mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/50 p-3 last:mb-0"
                                    >
                                        <span className="hidden" />
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
                                                {t(
                                                    isCurrentSession
                                                        ? "sessions.currentDetails"
                                                        : "sessions.otherDetails",
                                                    {
                                                        date: formatSessionDate(
                                                            session.createdAt,
                                                            locale,
                                                        ),
                                                    },
                                                )}
                                            </p>
                                        </div>
                                        {isCurrentSession ? (
                                            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                                {t("sessions.current")}
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
                                                    ? t("sessions.signingOut")
                                                    : t("sessions.signOut")}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {
                    <section className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive text-white">
                                <AlertTriangle
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </span>
                            <div>
                                <h2 className="font-semibold text-destructive">
                                    {t("delete.title")}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {t("delete.description")}
                                </p>
                            </div>
                        </div>
                        {!canDeleteAccount ? (
                            <p className="mt-4 rounded-xl border border-border/60 bg-background/50 p-4 text-sm leading-7 text-muted-foreground">
                                {t("delete.restricted")}
                            </p>
                        ) : (
                            <form
                                onSubmit={handleDeleteAccount}
                                className="mt-6 grid gap-4"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="delete-password">
                                        {t("delete.currentPassword")}
                                    </Label>
                                    <Input
                                        id="delete-password"
                                        type="password"
                                        value={deletePassword}
                                        onChange={(event) =>
                                            setDeletePassword(
                                                event.target.value,
                                            )
                                        }
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="delete-confirmation">
                                        {t("delete.confirmation")}
                                    </Label>
                                    <Input
                                        id="delete-confirmation"
                                        value={deleteConfirmation}
                                        onChange={(event) =>
                                            setDeleteConfirmation(
                                                event.target.value,
                                            )
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
                                            ? t("delete.deleting")
                                            : t("delete.submit")}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </section>
                }
            </div>
        </div>
    );
}
