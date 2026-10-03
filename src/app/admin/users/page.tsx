import { createTranslator } from "next-intl";
import AdminWorkspace from "@/features/admin/components/admin-workspace";
import {
    UserActivity,
    UserDirectory,
} from "@/features/admin/components/user-management";
import {
    getUserActivity,
    listManagedUsers,
    type UserFilter,
} from "@/features/admin/server/user-service";
import { requirePlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

function pageNumber(value?: string) {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 10000) : 1;
}

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        filter?: string;
        page?: string;
        activity?: string;
    }>;
}) {
    await requirePlatformAdmin();
    const params = await searchParams;
    const query =
        typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
    const filter: UserFilter =
        params.filter === "active" ||
        params.filter === "suspended" ||
        params.filter === "supervisors"
            ? params.filter
            : "all";
    const page = pageNumber(params.page);
    const activityPage = pageNumber(params.activity);
    const [preferences, data, events] = await Promise.all([
        getPreferences(),
        listManagedUsers(query, filter, page),
        getUserActivity(activityPage),
    ]);
    const t = createTranslator({
        locale: preferences.language,
        messages: await getMessages(preferences.language),
        namespace: "Admin.users",
    });
    return (
        <AdminWorkspace
            language={preferences.language}
            title={t("title")}
            description={t("description")}
        >
            <UserDirectory
                data={data}
                query={query}
                filter={filter}
                page={page}
            />
            <UserActivity
                events={events}
                page={activityPage}
                href={`/admin/users?q=${encodeURIComponent(query)}&filter=${filter}&page=${page}&activity=`}
            />
        </AdminWorkspace>
    );
}
