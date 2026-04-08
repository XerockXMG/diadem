import { error, json } from "@sveltejs/kit";
import { getGrunts } from "@/lib/server/api/poracleApi";
import { getServerConfig } from "@/lib/services/config/config.server";

export async function GET({ locals }) {
	if (!getServerConfig().poracle) error(404, "Poracle not configured");
	if (!locals.user) error(401, "Not logged in");

	const result = await getGrunts();
	if (!result) error(502, "Poracle unavailable");
	return json(result);
}
