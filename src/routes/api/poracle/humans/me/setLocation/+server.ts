import { error, json } from "@sveltejs/kit";
import { setHumanLocation } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function POST({ locals, request }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");

	const { lat, lon }: { lat: number; lon: number } = await request.json();
	const result = await setHumanLocation(locals.user.discordId, lat, lon);
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
