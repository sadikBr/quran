import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";

export const learnerContext = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (await isPlatformAdmin(session.user.id)) redirect("/admin");
    return { userId: session.user.id, preferences: await getPreferences() };
});
