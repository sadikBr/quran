"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
    const { data: session, isPending, error } = authClient.useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const signUp = () => {
        authClient.signUp.email(
            {
                email: `brahimsadik98+${Math.floor(Math.random() * 1000)}@gmail.com`,
                password: "password",
                name: "Brahim SADIK",
                image: "",
            },
            {
                onRequest: (_ctx) => {
                    setLoading(true);
                },
                onSuccess: (_ctx) => {
                    setLoading(false);
                    router.push("/dashboard");
                },
                onError: (ctx) => {
                    alert(JSON.stringify(ctx.error));
                },
            },
        );
    };

    const signIn = () => {
        authClient.signIn.email(
            {
                email: "brahimsadik98@gmail.com",
                password: "password",
            },
            {
                onRequest: (_ctx) => {
                    setLoading(true);
                },
                onSuccess: (_ctx) => {
                    setLoading(false);
                    router.push("/dashboard");
                },
                onError: (ctx) => {
                    alert(JSON.stringify(ctx.error));
                },
            },
        );
    };

    const logout = () => {
        authClient.signOut();
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center">
            {isPending ? (
                <div>Loading...</div>
            ) : error ? (
                <div>Error: {error.message}</div>
            ) : session ? (
                <div className="flex flex-col gap-2">
                    <div>Logged In as {session.user.name}</div>
                    <Button variant="destructive" onClick={logout}>
                        Logout
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2 items-center">
                    <Button variant="outline" onClick={signUp}>
                        {loading ? "Signing Up..." : "Sign Up"}
                    </Button>
                    <Button variant="outline" onClick={signIn}>
                        {loading ? "Signing In..." : "SignIn"}
                    </Button>
                </div>
            )}
        </div>
    );
}
