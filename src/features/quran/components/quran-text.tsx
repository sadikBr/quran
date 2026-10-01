export function getPlainQuranText(text: string) {
    return text.replace(/\uFEFF/g, "");
}

export default function QuranText({ text }: { text: string }) {
    return getPlainQuranText(text);
}
