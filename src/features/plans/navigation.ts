export type PlansView = "today" | "week" | "myPlans";

/** Legacy setup URLs remain part of My plans, including bookmarked links. */
export function plansView(pathname: string): PlansView | null {
    const path = pathname.replace(/\/$/, "");
    if (path === "/weekly") return "week";
    if (
        path === "/plans" ||
        path === "/wird" ||
        path === "/practice" ||
        path === "/memorization/plan" ||
        path === "/memorization/revision"
    )
        return "myPlans";
    if (
        path === "/plans/today" ||
        path === "/wird/read" ||
        path.startsWith("/practice/")
    )
        return "today";
    return null;
}

/** A fixed context flag: reader destinations never come from user input. */
export function todayActivityHref(href: string): string {
    if (!/^\/quran\/(surah|page)\/\d+(?:[?#]|$)/.test(href)) return href;
    const url = new URL(href, "https://quran.local");
    url.searchParams.set("from", "today");
    return `${url.pathname}${url.search}${url.hash}`;
}
