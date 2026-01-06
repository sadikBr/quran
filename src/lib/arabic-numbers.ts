const ARABIC_NUMBERS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function getArabicNumber(number: number): string {
    return number
        .toString()
        .split("")
        .map((i) => ARABIC_NUMBERS[+i])
        .join("");
}
