import { error, json } from "@sveltejs/kit";
import { createTracking, ensureHuman, getTracking } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

const ALLOWED_TYPES = new Set(["pokemon", "raid", "egg", "quest", "invasion", "lure", "nest", "gym", "maxbattle"]);

export async function GET({ locals, params }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");
	if (!ALLOWED_TYPES.has(params.type)) error(400, "Unknown tracking type");

	const result = await getTracking(locals.user.discordId, params.type);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}

export async function POST({ locals, params, request }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");
	if (!ALLOWED_TYPES.has(params.type)) error(400, "Unknown tracking type");

	await ensureHuman(locals.user.discordId, locals.user.discordId);
	const rules = await request.json();
	const result = await createTracking(locals.user.discordId, params.type, Array.isArray(rules) ? rules : [rules]);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
