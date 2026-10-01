import { visibleDocuments } from './access';
import type { AssistantAnswer, AssistantRequest, DataRoomsData } from './types';

/**
 * Answers from the scripted replies, the way a retrieval-backed assistant
 * should: it only cites documents the person can open in the room, and if
 * none of a reply's sources are open to them it says it found nothing rather
 * than leaking the answer.
 */
export function answerFromScript(data: DataRoomsData, request: AssistantRequest): AssistantAnswer {
	const script = data.assistant;
	const fallback = { text: script?.fallback ?? 'I couldn’t find that in the documents you can open in this room.', citations: [] };
	if (!script) return fallback;
	const prompt = request.prompt.toLowerCase();
	const open = new Set(visibleDocuments(data, request.viewerId, request.roomId).map((document) => document.id));
	const scored = script.replies
		.map((reply) => ({ reply, score: reply.match.filter((word) => prompt.includes(word.toLowerCase())).length }))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score);
	for (const { reply } of scored) {
		const citations = reply.citations.filter((citation) => open.has(citation.documentId));
		if (citations.length) return { text: reply.text, citations };
	}
	return fallback;
}
