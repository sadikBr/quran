import {
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    TriangleAlert,
    UserCheck,
} from "lucide-react";
import type { MemberProgressSummary as MemberProgressSummaryData } from "@/features/groups/server/get-member-progress-summaries";
import { cn } from "@/lib/utils";

interface MemberProgressSummaryProps {
    summary: MemberProgressSummaryData;
    locale: string;
    labels: {
        title: string;
        completed: string;
        active: string;
        awaitingReview: string;
        attendance: string;
        noAttendance: string;
        attendanceDetail: string;
        absenceStreak: string;
        noAbsenceStreak: string;
        excusedAbsences: string;
    };
}

export default function MemberProgressSummary({
    summary,
    locale,
    labels,
}: MemberProgressSummaryProps) {
    const number = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 0,
    });
    const completionRate = summary.assignmentCompletionRate ?? 0;

    return (
        <section className="border-b border-border/50 bg-primary/[0.025] px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center gap-2">
                <ClipboardCheck
                    aria-hidden="true"
                    className="size-4 text-primary"
                />
                <h4 className="text-xs font-semibold tracking-wide text-foreground">
                    {labels.title}
                </h4>
                {summary.awaitingReview > 0 && (
                    <span className="ms-auto inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[0.7rem] font-semibold text-primary">
                        <Clock3 aria-hidden="true" className="size-3" />
                        {labels.awaitingReview}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <div className="rounded-xl bg-background/75 p-3 ring-1 ring-border/45">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2
                            aria-hidden="true"
                            className="size-3.5 text-primary"
                        />
                        <span className="text-[0.7rem] font-medium">
                            {labels.completed}
                        </span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                        <strong className="text-lg leading-none">
                            {number.format(summary.completedAssignments)}
                            <span className="text-xs font-normal text-muted-foreground">
                                /{number.format(summary.totalAssignments)}
                            </span>
                        </strong>
                        {summary.assignmentCompletionRate !== null && (
                            <span className="text-[0.68rem] text-muted-foreground">
                                {percent.format(completionRate / 100)}
                            </span>
                        )}
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-xl bg-background/75 p-3 ring-1 ring-border/45">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock3
                            aria-hidden="true"
                            className="size-3.5 text-primary"
                        />
                        <span className="text-[0.7rem] font-medium">
                            {labels.active}
                        </span>
                    </div>
                    <strong className="mt-2 block text-lg leading-none">
                        {number.format(summary.activeAssignments)}
                    </strong>
                </div>

                <div className="rounded-xl bg-background/75 p-3 ring-1 ring-border/45">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCheck
                            aria-hidden="true"
                            className="size-3.5 text-primary"
                        />
                        <span className="text-[0.7rem] font-medium">
                            {labels.attendance}
                        </span>
                    </div>
                    <strong className="mt-2 block text-lg leading-none">
                        {summary.attendanceRate === null
                            ? "—"
                            : percent.format(summary.attendanceRate / 100)}
                    </strong>
                    <p className="mt-1 text-[0.68rem] text-muted-foreground">
                        {summary.countedMeetings > 0
                            ? labels.attendanceDetail
                            : labels.noAttendance}
                    </p>
                </div>

                <div
                    className={cn(
                        "rounded-xl bg-background/75 p-3 ring-1 ring-border/45",
                        summary.unacceptedAbsenceStreak > 0 &&
                            "bg-destructive/[0.045] ring-destructive/15",
                    )}
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <TriangleAlert
                            aria-hidden="true"
                            className={cn(
                                "size-3.5 text-primary",
                                summary.unacceptedAbsenceStreak > 0 &&
                                    "text-destructive",
                            )}
                        />
                        <span className="text-[0.7rem] font-medium">
                            {labels.absenceStreak}
                        </span>
                    </div>
                    <strong
                        className={cn(
                            "mt-2 block text-lg leading-none",
                            summary.unacceptedAbsenceStreak > 0 &&
                                "text-destructive",
                        )}
                    >
                        {summary.unacceptedAbsenceStreak > 0
                            ? `${number.format(summary.unacceptedAbsenceStreak)}/3`
                            : labels.noAbsenceStreak}
                    </strong>
                    {summary.excusedAbsences > 0 && (
                        <p className="mt-1 text-[0.68rem] text-muted-foreground">
                            {labels.excusedAbsences}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
