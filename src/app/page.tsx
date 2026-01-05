"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";

export default function Home() {
    const { data: session } = authClient.useSession();

    const signOut = () => {
        authClient.signOut();
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center">
            {session ? (
                <div className="flex flex-col gap-2">
                    <div>Logged in as {session.user.name}</div>
                    <Button variant="destructive" onClick={signOut}>
                        Sign Out
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2 items-center">
                    <Button asChild variant="link">
                        <Link href="/signUp">Sign Up</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/signIn">Sign In</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
