import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/drizzle/db";
import { memorizationPlan, revisionPlan, userWird } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import PlansManager, {
    type BuiltinPlan,
} from "@/features/plans/components/plans-manager";
import { getRecurringState } from "@/features/plans/server/service";
import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import getPreferences from "@/features/settings/server/get-preferences";

export default async function PlansPage({
    searchParams,
}: {
    searchParams: Promise<{ create?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const userId = session.user.id;
    const [
        state,
        preferences,
        surahs,
        [memorization],
        [revision],
        [wird],
        query,
    ] = await Promise.all([
        getRecurringState(userId),
        getPreferences(),
        getSurahsMeta(),
        db
            .select({ enabled: memorizationPlan.enabled })
            .from(memorizationPlan)
            .where(eq(memorizationPlan.userId, userId)),
        db
            .select({ enabled: revisionPlan.enabled })
            .from(revisionPlan)
            .where(eq(revisionPlan.userId, userId)),
        db
            .select({ userId: userWird.userId })
            .from(userWird)
            .where(eq(userWird.userId, userId)),
        searchParams,
    ]);
    const builtins: BuiltinPlan[] = [];
    if (wird) builtins.push({ kind: "reading", enabled: true, href: "/wird" });
    if (memorization)
        builtins.push({
            kind: "memorization",
            enabled: memorization.enabled,
            href: "/memorization/plan",
        });
    if (revision)
        builtins.push({
            kind: "revision",
            enabled: revision.enabled,
            href: "/memorization/revision",
        });
    return (
        <PlansManager
            state={state}
            builtins={builtins}
            timezone={preferences.adhkarTimezone}
            surahs={surahs}
            initiallyOpen={query.create === "1"}
        />
    );
}
