import getSurahsMeta from "@/features/quran/server/get-surahs-meta";
import WeeklyReport from "@/features/retention/components/weekly-report";
import { learnerContext } from "@/features/retention/server/context";
import { getWeeklyReport } from "@/features/retention/server/report";

export default async function ReportPage({
    searchParams,
}: {
    searchParams: Promise<{ week?: string }>;
}) {
    const { userId, preferences } = await learnerContext();
    const query = await searchParams;
    const input = Number(query.week ?? 0);
    const offset =
        Number.isInteger(input) && input >= -51 && input <= 0 ? input : 0;
    const [report, surahs] = await Promise.all([
        getWeeklyReport(userId, preferences.riwayah, offset),
        getSurahsMeta(),
    ]);
    return (
        <WeeklyReport
            report={report}
            surahs={surahs.map((s) => ({
                number: s.number,
                name: s.name,
                englishName: s.englishName,
            }))}
        />
    );
}
