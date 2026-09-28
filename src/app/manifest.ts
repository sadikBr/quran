import type { MetadataRoute } from "next";

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
        theme_color: "#ff6b0a",
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
