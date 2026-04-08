import { error, json } from "@sveltejs/kit";
import { ensureHuman, getHumanInfo } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function GET({ locals }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");

	await ensureHuman(locals.user.discordId, locals.user.discordId);
	const result = await getHumanInfo(locals.user.discordId);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
