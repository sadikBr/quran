import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { isPlatformAdmin } from "@/features/auth/permissions";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    const pathname = new URL(request.url).pathname;
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";
    const isProtected = !isAuthPage && pathname !== "/";
    const isAdmin = session ? await isPlatformAdmin(session.user.id) : false;

    if (session && isAuthPage) {
        return NextResponse.redirect(
            new URL(isAdmin ? "/admin" : "/", request.url),
        );
    }
    if (
        isAdmin &&
        !["/admin", "/settings", "/profile"].some(
            (prefix) =>
                pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
    ) {
        return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (session && !isAdmin && pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (!session && isProtected) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/admin/:path*",
        "/groups/:path*",
        "/practice/:path*",
        "/memorization/:path*",
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
