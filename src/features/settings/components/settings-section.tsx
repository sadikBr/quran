export default function SettingsSection({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    const Icon = icons[id as keyof typeof icons] ?? Settings2;
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="app-card scroll-mt-28 overflow-hidden"
        >
            <SectionHeading
                id={`${id}-title`}
                title={title}
                icon={<Icon />}
                className="p-4 sm:p-5"
            />
            <div className="app-card-body divide-y divide-border/50 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                {children}
            </div>
        </section>
    );
}

import {
    Bell,
    BookOpen,
    Download,
    Headphones,
    Palette,
    Settings2,
} from "lucide-react";
import SectionHeading from "@/components/section-heading";

const icons = {
    "settings-appearance": Palette,
    "settings-reading": BookOpen,
    "settings-reminders": Bell,
    "settings-offline": Download,
    "settings-editions": Headphones,
};
