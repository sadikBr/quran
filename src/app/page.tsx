import { Button } from "@/components/ui/button";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import SignOutButton from "@/components/signout-button";

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    return (
        <div className="w-screen h-screen flex items-center justify-center">
            {session ? (
                <div className="flex flex-col gap-2">
                    <div>Logged in as {session.user.name}</div>
                    <SignOutButton />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 items-center">
                        <Button asChild variant="link">
                            <Link href="/sign-up">Sign Up</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/sign-in">Sign In</Link>
                        </Button>
                    </div>
                    <Button asChild variant="secondary">
                        <Link href="/quran">Start Reading</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
