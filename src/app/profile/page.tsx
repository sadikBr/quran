import { BookOpen, UserRound } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageBackground from "@/components/page-background";
import UserMenu from "@/components/user-menu";
import { auth } from "@/features/auth/auth";
import ProfileForm from "@/features/auth/components/profile-form";

export default async function ProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    return (
        <main className="relative isolate min-h-dvh overflow-hidden bg-background">
            <PageBackground />
            <div className="mx-auto max-w-5xl px-4">
                <header className="flex h-20 items-center justify-between gap-4">
                    <Link
                        href="/"
                        className="group flex items-center gap-3 rounded-md text-sm font-semibold tracking-wide outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:-rotate-3">
                            <BookOpen aria-hidden="true" className="size-5" />
                        </span>
                        Quran Reader
                    </Link>
                    <UserMenu
                        name={session.user.name}
                        image={session.user.image}
                    />
                </header>

                <section className="py-10 sm:py-14">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <UserRound aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-primary">
                        YOUR PROFILE
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Your account details.
                    </h1>
                    <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                        Update the name and image used across your personal
                        reading space.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>
                            Member since{" "}
                            <span className="font-medium text-foreground">
                                {new Intl.DateTimeFormat(undefined, {
                                    month: "long",
                                    year: "numeric",
                                }).format(session.user.createdAt)}
                            </span>
                        </span>
                        <span
                            className={
                                session.user.emailVerified
                                    ? "text-primary"
                                    : "text-amber-600 dark:text-amber-400"
                            }
                        >
                            {session.user.emailVerified
                                ? "Email verified"
                                : "Email not verified"}
                        </span>
                    </div>
                    <ProfileForm
                        initialName={session.user.name}
                        initialImage={session.user.image ?? null}
                        initialEmail={session.user.email}
                        currentSessionToken={session.session.token}
                    />
                </section>
            </div>
        </main>
    );
}
