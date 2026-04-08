import { error, json } from "@sveltejs/kit";
import { deleteTracking } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

const ALLOWED_TYPES = new Set(["pokemon", "raid", "egg", "quest", "invasion", "lure", "nest", "gym", "maxbattle"]);

export async function DELETE({ locals, params }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");
	if (!ALLOWED_TYPES.has(params.type)) error(400, "Unknown tracking type");

	const uid = parseInt(params.uid, 10);
	if (isNaN(uid)) error(400, "Invalid uid");

	const result = await deleteTracking(locals.user.discordId, params.type, uid);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
