export const guides = {
    wird: {
        path: "/wird",
        title: ["Daily wird", "وردك اليومي"],
        steps: [
            {
                target: "wird-page",
                text: [
                    "Manage your daily wird here through My plans. Set your reading amount and review your history.",
                    "أدر وردك اليومي هنا من خلال «خططي». حدّد مقدار القراءة وراجع سجلّك.",
                ],
            },
            {
                target: "wird-read",
                text: [
                    "Go to Today to start your wird alongside your other activities. Your saved position lets you continue where you stopped.",
                    "انتقل إلى «اليوم» لبدء وردك مع بقية أنشطتك. يُحفظ موضعك لتكمل من حيث توقفت.",
                ],
            },
            {
                target: "wird-history",
                text: [
                    "Mark your wird complete in the reader to return to Today. Your history below helps you follow your consistency. This tour does not change your progress.",
                    "سجّل إتمام الورد في القارئ للعودة إلى «اليوم». يعرض السجل أدناه متابعتك اليومية. هذه الجولة لا تغيّر تقدّمك.",
                ],
            },
        ],
    },
    memorization: {
        path: "/memorization/test",
        title: ["Memorization tests", "اختبارات الحفظ"],
        steps: [
            {
                target: "test-settings",
                text: [
                    "Choose a random start, surah opening, or surah ending. Memorized hizbs come from your memorization map; you can also choose a range or surah.",
                    "اختر موضعًا عشوائيًا أو أوائل السور أو أواخرها. نستخدم الأحزاب المكتملة في خريطة الحفظ، ويمكنك اختيار مقطع أو سورة بنفسك.",
                ],
            },
            {
                target: "test-count",
                text: [
                    "Set the number of ayahs. In random-start mode, choose whether the passage may continue into the next surah.",
                    "حدّد عدد الآيات. وفي وضع الموضع العشوائي، اختر إن كنت تريد المتابعة إلى السورة التالية.",
                ],
            },
            {
                target: "test-start",
                text: [
                    "Start a test, recite from memory, then reveal one ayah or the full passage. Save difficult passages for revision; these are stored on this device.",
                    "ابدأ الاختبار وسمّع من حفظك، ثم أظهر آية أو المقطع كاملًا. احفظ المواضع الصعبة للمراجعة؛ تُحفظ هذه القائمة على هذا الجهاز.",
                ],
            },
        ],
    },
    assignments: {
        path: "/assignments",
        title: ["My assignments", "تكاليفي"],
        steps: [
            {
                target: "assignments-page",
                text: [
                    "Your halaqa assignments are grouped by meeting. If this page is empty, join a halaqa and wait for your supervisor to publish assignments.",
                    "تُرتّب تكاليف حلقتك بحسب الاجتماع. إن لم تجد تكاليف، انضم إلى حلقة وانتظر أن ينشر المشرف تكليفك.",
                ],
            },
            {
                target: "assignment-practice",
                text: [
                    "Open an assignment to practice its range. When ready, submit it for review; practicing alone does not submit it.",
                    "افتح التكليف للتدرّب على المقطع المطلوب. عندما تستعدّ، سلّمه للمراجعة؛ التدريب وحده لا يعني تسليم التكليف.",
                ],
            },
            {
                target: "assignments-page",
                text: [
                    "Follow the meeting time and your supervisor’s feedback. Work needing revision can move to the next meeting. Join and review actions are never triggered by this guide.",
                    "تابع موعد الاجتماع وملاحظات المشرف. قد يُؤجَّل ما يحتاج إلى مراجعة للاجتماع القادم. لا تنفّذ الجولة أي انضمام أو تسليم نيابة عنك.",
                ],
            },
        ],
    },
} as const;
export type GuideId = keyof typeof guides;
export function isGuideId(value: string): value is GuideId {
    return Object.hasOwn(guides, value);
}
