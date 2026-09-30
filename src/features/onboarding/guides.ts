export const guides = {
    wird: {
        path: "/wird",
        title: ["Daily wird", "وردك اليومي"],
        steps: [
            {
                target: "wird-page",
                text: [
                    "Your daily wird lives here. Set a daily amount first; if you already have a plan, this page shows today’s reading.",
                    "هنا تجد وردك اليومي. حدّد مقدار القراءة إن لم تضبطه بعد، أو تابع ورد اليوم إن كانت لديك خطة.",
                ],
            },
            {
                target: "wird-read",
                text: [
                    "Use the reading button to open your wird. Your saved position lets you continue where you stopped.",
                    "افتح الورد من زر القراءة. يُحفظ موضعك لتكمل من حيث توقفت.",
                ],
            },
            {
                target: "wird-history",
                text: [
                    "After reading, mark the wird complete. Your history below helps you follow your consistency. This tour does not change your progress.",
                    "بعد القراءة، سجّل إتمام الورد. يعرض السجل أدناه متابعتك اليومية. هذه الجولة لا تغيّر تقدّمك.",
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
                    "اختر موضعًا عشوائيًا أو أوائل السور أو أواخرها. نستخدم الأحزاب التي علّمتها في خريطة الحفظ، ويمكنك اختيار مقطع أو سورة بنفسك.",
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
