/** Readiness confirms preparation, independently of the saved reading cursor. */
export function preparedAyahs(
    status: string,
    total: number,
    savedCount: number,
) {
    if (status === "submitted" || status === "completed") return total;
    return Math.min(total, Math.max(0, savedCount));
}
