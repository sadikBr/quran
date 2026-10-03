export function clearResetAccountDrafts(
    storage: Storage,
    userId: string,
    resetAt: string,
) {
    const marker = `quran:data-reset:${userId}`;
    if (storage.getItem(marker) === resetAt) return;
    const prefixes = [
        `random-start:${userId}:`,
        `quran:wird-draft:v1:${userId}:`,
    ];
    const remove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (
            key &&
            prefixes.some((prefix) => key.startsWith(prefix)) &&
            !key.endsWith(`:${resetAt}`)
        )
            remove.push(key);
    }
    for (const key of remove) storage.removeItem(key);
    storage.setItem(marker, resetAt);
}
