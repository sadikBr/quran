/* global self */

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let message;
    try {
        message = event.data.json();
    } catch {
        return;
    }

    event.waitUntil(
        self.registration.showNotification(message.title, {
            body: message.body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: message.tag ?? "quran-reminder",
            renotify: true,
            data: {
                url: message.url ?? "/",
            },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const destination = new URL(
        event.notification.data?.url ?? "/",
        self.location.origin,
    ).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                for (const client of clients) {
                    if (client.url.startsWith(self.location.origin)) {
                        client.navigate(destination);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(destination);
            }),
    );
});
