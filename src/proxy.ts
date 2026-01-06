import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const isProtected = request.url.includes("dashboard");

    if (session && !isProtected) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!session && isProtected) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard", "/sign-in", "/sign-up"],
};
