import { sql } from "drizzle-orm";

// Keep real database queries, transactions and locks while advancing the study day.
export function databaseClock() {
    let now = null;
    return {
        set(value) {
            now = value;
        },
        sql: new Proxy(sql, {
            apply(target, thisArg, args) {
                const [parts] = args;
                if (now && parts.length === 1) {
                    if (parts[0] === "select clock_timestamp() as now")
                        return sql`select ${now.toISOString()}::timestamptz as now`;
                    if (parts[0] === "clock_timestamp()")
                        return sql`${now.toISOString()}::timestamptz`;
                }
                return Reflect.apply(target, thisArg, args);
            },
        }),
    };
}
