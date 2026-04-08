import { error, json } from "@sveltejs/kit";
import { setHumanAreas } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function POST({ locals, request }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");

	const areas: string[] = await request.json();
	const result = await setHumanAreas(locals.user.discordId, areas);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
