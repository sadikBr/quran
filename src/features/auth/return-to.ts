/** Only allow local app destinations, never external or auth-loop redirects. */
export function safeReturnTo(value: string | null | undefined): string {
    if (
        !value ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        value.includes("\\") ||
        Array.from(value).some((character) => character.charCodeAt(0) <= 32)
    )
        return "/dashboard";
    try {
        const url = new URL(value, "https://app.invalid");
        if (
            url.origin !== "https://app.invalid" ||
            /^\/sign-(in|up)(\/|$)/.test(url.pathname)
        )
            return "/dashboard";
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return "/dashboard";
    }
}
