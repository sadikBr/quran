export function incrementRepetition(count: number, target: number | null) {
    const next = target === null ? count + 1 : Math.min(count + 1, target);
    return { count: next, complete: target !== null && next >= target };
}
