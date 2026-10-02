import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppLogo from "@/components/app-logo";
import AppPrimaryNav from "@/components/app-primary-nav";
import { auth } from "@/features/auth/auth";
import PracticeReader from "@/features/practice/components/practice-reader";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getPreferences from "@/features/settings/server/get-preferences";
import { getTextDirection } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default async function PracticeReaderPage({
    params,
}: {
    params: Promise<{ assignmentId: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const { assignmentId } = await params;
    const [preferences, assignment] = await Promise.all([
        getPreferences(),
        getPracticeAssignment(session.user.id, assignmentId),
    ]);
    if (!assignment) redirect("/practice");

    const groups = await getPracticeReaderData(assignment, preferences);
    const isArabic = preferences.language === "ar";

    return (
        <main
            data-quran-scroll-container
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "h-dvh overflow-y-auto bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 bg-background/92 backdrop-blur-xl">
                <div className="app-container flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] items-center justify-between gap-4">
                    <AppPrimaryNav />
                    <AppLogo />
                </div>
            </header>

            <PracticeReader
                key={assignment.id}
                assignment={assignment}
                groups={groups}
                showTranslation={preferences.showTranslation}
                continuousRecitation={preferences.continuousRecitation}
            />
        </main>
    );
}
