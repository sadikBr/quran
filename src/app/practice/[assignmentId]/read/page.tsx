import { BookMarked } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTranslator } from "next-intl";
import AppPrimaryNav from "@/components/app-primary-nav";
import { auth } from "@/features/auth/auth";
import PracticeReader from "@/features/practice/components/practice-reader";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";
import getPracticeReaderData from "@/features/practice/server/get-practice-reader-data";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages, getTextDirection } from "@/i18n/config";
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

    const [messages, groups] = await Promise.all([
        getMessages(preferences.language),
        getPracticeReaderData(assignment, preferences),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Practice.reader",
    });
    const isArabic = preferences.language === "ar";

    return (
        <main
            lang={preferences.language}
            dir={getTextDirection(preferences.language)}
            className={cn(
                "h-dvh overflow-y-auto bg-background",
                isArabic && "arabic-ui",
            )}
        >
            <header className="sticky top-0 z-30 bg-background/92 backdrop-blur-xl">
                <div className="mx-auto flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] sm:h-[calc(5rem+env(safe-area-inset-top))] max-w-4xl items-center justify-between gap-4 px-3 sm:px-5">
                    <AppPrimaryNav />
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <BookMarked
                            aria-hidden="true"
                            className="size-4 text-primary"
                        />
                        {t(`kinds.${assignment.kind}`)}
                    </div>
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
