"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/features/auth/auth-client";
import { Button } from "./ui/button";

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
