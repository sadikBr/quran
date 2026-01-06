"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
    const router = useRouter();

    const signOut = () => {
        authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/");
                },
            },
        });
    };

    return (
        <Button variant="destructive" onClick={signOut}>
            Sign Out
        </Button>
    );
}
