import { z } from "zod";

/** Browser push services only; never accept user-controlled servers or IPs. */
export function isAllowedPushEndpoint(value: string) {
    try {
        const url = new URL(value);
        if (
            value.length > 2048 ||
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.port ||
            url.hash
        )
            return false;
        return (
            url.hostname === "fcm.googleapis.com" ||
            url.hostname === "updates.push.services.mozilla.com" ||
            /^[a-z0-9-]+\.push\.services\.mozilla\.com$/.test(url.hostname) ||
            url.hostname === "web.push.apple.com" ||
            /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
        );
    } catch {
        return false;
    }
}

export const pushEndpointSchema = z
    .string()
    .max(2048)
    .url()
    .refine(isAllowedPushEndpoint);
export const pushSubscriptionSchema = z.object({
    endpoint: pushEndpointSchema,
    keys: z.object({
        p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
        auth: z.string().regex(/^[A-Za-z0-9_-]{22}(?:==)?$/),
    }),
});
