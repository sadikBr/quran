import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const isProtected = request.url.includes("settings");

    if (session && !isProtected) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!session && isProtected) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/settings", "/sign-in", "/sign-up"],
};
