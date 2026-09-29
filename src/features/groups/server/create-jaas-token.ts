import "server-only";

import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";
import { env } from "@/data/env/server";

export function isJaasConfigured() {
    return Boolean(
        env.JAAS_APP_ID && env.JAAS_API_KEY_ID && env.JAAS_PRIVATE_KEY,
    );
}

export async function createJaasToken({
    roomName,
    user,
    moderator,
    expiresAt,
}: {
    roomName: string;
    user: { id: string; name: string; email: string; image?: string | null };
    moderator: boolean;
    expiresAt: Date;
}) {
    if (!env.JAAS_APP_ID || !env.JAAS_API_KEY_ID || !env.JAAS_PRIVATE_KEY) {
        throw new Error("JaaS is not configured");
    }

    const privateKey = createPrivateKey(
        env.JAAS_PRIVATE_KEY.replaceAll("\\n", "\n"),
    );
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.max(now + 60, Math.floor(expiresAt.getTime() / 1000));

    return new SignJWT({
        aud: "jitsi",
        iss: "chat",
        sub: env.JAAS_APP_ID,
        room: roomName,
        context: {
            features: {
                livestreaming: false,
                recording: false,
                transcription: false,
                "outbound-call": false,
                "sip-outbound-call": false,
                "file-upload": false,
            },
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.image ?? "",
                moderator: moderator ? "true" : "false",
            },
        },
    })
        .setProtectedHeader({
            alg: "RS256",
            typ: "JWT",
            kid: env.JAAS_API_KEY_ID,
        })
        .setNotBefore(now - 10)
        .setExpirationTime(exp)
        .sign(privateKey);
}
