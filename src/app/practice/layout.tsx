import type { ReactNode } from "react";
import QuranAudioProvider from "@/features/quran/components/quran-audio-shell";

export default function PracticeLayout({
    children,
    ayah,
}: {
    children: ReactNode;
    ayah: ReactNode;
}) {
    return (
        <QuranAudioProvider>
            {children}
            {ayah}
        </QuranAudioProvider>
    );
}
