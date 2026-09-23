import type { ReactNode } from "react";
import QuranAudioProvider from "@/features/quran/components/quran-audio-provider";

export default function QuranLayout({
    children,
    ayah,
}: {
    children: ReactNode;
    ayah: ReactNode;
}) {
    return (
        <section className="h-dvh select-none overflow-hidden bg-background">
            <QuranAudioProvider>
                {children}
                {ayah}
            </QuranAudioProvider>
        </section>
    );
}
