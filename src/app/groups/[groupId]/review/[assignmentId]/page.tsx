import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/features/auth/auth";
import AssignmentReview from "@/features/groups/components/assignment-review";
import getAssignmentReview from "@/features/groups/server/get-assignment-review";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function AssignmentReviewPage({
    params,
}: {
    params: Promise<{ groupId: string; assignmentId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    const { groupId, assignmentId } = await params;
    const [preferences, review] = await Promise.all([
        getPreferences(),
        getAssignmentReview(groupId, assignmentId, session.user.id),
    ]);
    if (!review) notFound();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Groups.review",
    });
    const groups = await getPracticeReaderData(review.assignment, {
        ...preferences,
        showTranslation: false,
    });
    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                preferences.language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container">
                <StickyAppHeader navigation className="-mx-4 px-4" />
                <section className="py-8 sm:py-12">
                    <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            {t("meetingOnly")}
                        </p>
                        <Button asChild variant="outline">
                            <Link href={`/groups/${groupId}#meeting-overview`}>
                                {t("returnToGroup")}
                            </Link>
                        </Button>
                    </div>
                    <AssignmentReview
                        review={review}
                        readerGroups={groups}
                        pendingCount={0}
                    />
                </section>
            </div>
        </main>
    );
}
