export type AdhkarEntry = {
    ID: number;
    sourceId: number;
    label: { ar: string; en: string };
    ARABIC_TEXT: string;
    repeat: number | null;
    notes: string;
    countBasis: string;
    review: string | null;
    reference: string | null;
    originalText: string;
};
