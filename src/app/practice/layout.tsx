import type { ReactNode } from "react";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";

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
