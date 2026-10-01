"use client";

async function getRegistration() {
    if (!("serviceWorker" in navigator)) return undefined;
    return navigator.serviceWorker.getRegistration("/");
}

async function clearNotifications(registration: ServiceWorkerRegistration) {
    const notifications = await registration.getNotifications();
    for (const notification of notifications) notification.close();
}

/** The server revokes delivery with the session; also clean up the device. */
export async function clearDevicePushSubscription() {
    const registration = await getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager?.getSubscription();
    await subscription?.unsubscribe();
    await clearNotifications(registration);
}

/** A browser subscription alone does not establish ownership by this account. */
export async function getOwnedPushSubscription() {
    const registration = await getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!registration || !subscription) return null;
    const response = await fetch(
        `/api/notifications/subscription?${new URLSearchParams({ endpoint: subscription.endpoint })}`,
        {
            cache: "no-store",
            credentials: "same-origin",
            signal: AbortSignal.timeout(10_000),
        },
    );
    if (!response.ok)
        throw new Error("Unable to verify notification ownership.");
    const status = await response.json();
    if (status.enabled === true) return subscription;
    await subscription.unsubscribe();
    await clearNotifications(registration);
    return null;
}
