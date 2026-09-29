import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const pathname = new URL(request.url).pathname;
    const isProtected =
        [
            "/dashboard",
            "/profile",
            "/settings",
            "/assignments",
            "/weekly",
        ].includes(pathname) || pathname.startsWith("/wird");

    if (session && !isProtected) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!session && isProtected) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard",
        "/profile",
        "/settings",
        "/assignments",
        "/weekly",
        "/wird/:path*",
        "/sign-in",
        "/sign-up",
    ],
};
