export type WaitingPhase =
    | "waitingHost"
    | "closed"
    | "connection"
    | "signedOut"
    | "noAccess";
export function presenceState(
    status: number,
    data?: { hostPresent?: unknown; state?: unknown },
): WaitingPhase | "admitted" {
    if (status === 401) return "signedOut";
    if (status === 403) return "noAccess";
    if (status !== 200) return "connection";
    if (data?.state === "closed") return "closed";
    if (data?.state !== "active" || typeof data.hostPresent !== "boolean")
        return "connection";
    return data.hostPresent ? "admitted" : "waitingHost";
}
