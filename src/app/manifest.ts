import type { MetadataRoute } from "next";
import { THEME_COLORS } from "@/features/settings/theme-colors";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Quran Reader",
        short_name: "Quran",
        description: "Read the Quran and keep a steady daily Wird.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#181512",
        theme_color: THEME_COLORS.dark,
        shortcuts: [
            {
                name: "Offline Quran",
                short_name: "Offline",
                description: "Read the complete Quran without internet.",
                url: "/offline",
                icons: [
                    {
                        src: "/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                ],
            },
        ],
        icons: [
            {
                src: "/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
