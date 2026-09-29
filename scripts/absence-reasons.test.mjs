import { expect, test } from "bun:test";
import {
    ABSENCE_REASONS,
    formatAbsenceReason,
    parseAbsenceReason,
} from "../src/features/groups/absence-reasons";

test("common reasons round-trip with optional details in both languages", () => {
    for (const reason of ABSENCE_REASONS) {
        for (const locale of ["ar", "en"]) {
            for (const details of ["", "Additional explanation"]) {
                expect(
                    parseAbsenceReason(
                        formatAbsenceReason(reason.id, details, locale),
                    ),
                ).toEqual({ reason: reason.id, details });
            }
        }
    }
});
test("legacy and custom explanations are preserved", () => {
    expect(parseAbsenceReason("My old explanation")).toEqual({
        reason: "custom",
        details: "My old explanation",
    });
    expect(formatAbsenceReason("custom", "  My reason  ", "ar")).toBe(
        "My reason",
    );
    expect(formatAbsenceReason("custom", "  ", "en")).toBe("");
    expect(parseAbsenceReason(null)).toEqual({ reason: "", details: "" });
});
