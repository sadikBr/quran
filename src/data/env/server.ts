import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

export const env = createEnv({
    server: {
        DB_NAME: z.string().min(1),
        DB_HOST: z.string().min(1),
        DB_USER: z.string().min(1),
        DB_PASSWORD: z.string().min(1),
        DB_PORT: z.string().min(1),
        PRODUCTION_URLS: z.string().min(1),
        VAPID_PUBLIC_KEY: z.string().min(1).optional(),
        VAPID_PRIVATE_KEY: z.string().min(1).optional(),
        CRON_SECRET: z.string().min(16).optional(),
        JAAS_APP_ID: z.string().min(1).optional(),
        JAAS_API_KEY_ID: z.string().min(1).optional(),
        JAAS_PRIVATE_KEY: z.string().min(1).optional(),
    },
    createFinalSchema: (env) => {
        return z.object(env).transform((values) => {
            const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, ...rest } =
                values;
            return {
                ...rest,
                DATABASE_URL: `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${encodeURIComponent(DB_NAME)}`,
            };
        });
    },
    emptyStringAsUndefined: true,
    experimental__runtimeEnv: process.env,
});
