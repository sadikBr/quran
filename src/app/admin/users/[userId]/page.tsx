import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";
import AdminWorkspace from "@/features/admin/components/admin-workspace";
import {
    UserActivity,
    UserDetails,
} from "@/features/admin/components/user-management";
import {
    getManagedUser,
    getUserActivity,
} from "@/features/admin/server/user-service";
import { requirePlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

export default async function UserPage({
    params,
    searchParams,
}: {
    params: Promise<{ userId: string }>;
    searchParams: Promise<{ activity?: string }>;
}) {
    await requirePlatformAdmin();
    const { userId } = await params;
    const value = Number((await searchParams).activity);
    const page =
        Number.isSafeInteger(value) && value > 0 ? Math.min(value, 10000) : 1;
    const [preferences, data, events] = await Promise.all([
        getPreferences(),
        getManagedUser(userId),
        getUserActivity(page, userId),
    ]);
    if (!data) notFound();
    const t = createTranslator({
        locale: preferences.language,
        messages: await getMessages(preferences.language),
        namespace: "Admin.users",
    });
    return (
        <AdminWorkspace
            language={preferences.language}
            title={t("accountDetails")}
            description={t("accountDescription")}
        >
            <UserDetails data={data} />
            <UserActivity
                events={events}
                page={page}
                href={`/admin/users/${encodeURIComponent(userId)}?activity=`}
            />
        </AdminWorkspace>
    );
}
