import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import PageBackground from "@/components/page-background";
import PageHeading from "@/components/page-heading";
import StickyAppHeader from "@/components/sticky-app-header";
import { cn } from "@/lib/utils";

export default function AdminWorkspace({
    language,
    title,
    description,
    children,
}: {
    language: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <main
            lang={language}
            dir={language === "ar" ? "rtl" : "ltr"}
            className={cn(
                "relative isolate min-h-dvh overflow-x-clip bg-background",
                language === "ar" && "arabic-ui",
            )}
        >
            <PageBackground />
            <div className="app-container">
                <StickyAppHeader
                    navigation
                    className="-mx-4 px-4 sm:-mx-6 sm:px-6"
                />
                <div className="pb-12 pt-5 sm:pb-16 sm:pt-8">
                    <PageHeading
                        title={title}
                        description={description}
                        icon={<ShieldCheck />}
                    />
                    <div className="mt-6 min-w-0 space-y-6 sm:mt-8 sm:space-y-8">
                        {children}
                    </div>
                </div>
            </div>
        </main>
    );
}
