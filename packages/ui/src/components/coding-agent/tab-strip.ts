/**
 * Closes one tab of a strip: the ids left, and the one that takes its place if it was in front, which is the tab
 * after it, or the one before when it was last. The neighbour is null when nothing is left or the id wasn't there.
 */
export function withoutAndNeighbor(list: readonly string[], id: string): { list: string[]; neighbor: string | null } {
	const index = list.indexOf(id);
	const rest = list.filter((entry) => entry !== id);
	return { list: rest, neighbor: index < 0 ? null : (rest[index] ?? rest[index - 1] ?? null) };
}
