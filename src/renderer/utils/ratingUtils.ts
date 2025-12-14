export function normalizeRating(
    score: number | null | undefined,
    source?: string | null
): number | null {
    if (score == null) return null;

    const sourceLower = source?.toLowerCase() || "";
    if (sourceLower.includes("anilist")) {
        return score / 10;
    }
    return score;
}

export function formatRating(score: number | null | undefined, decimals: number = 1): string {
    if (score == null) return "—";
    return score.toFixed(decimals);
}

export function getDisplayRating(
    score: number | null | undefined,
    source?: string | null,
    decimals: number = 1
): string {
    const normalized = normalizeRating(score, source);
    return formatRating(normalized, decimals);
}
