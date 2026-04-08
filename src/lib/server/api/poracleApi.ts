import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("poracle");

async function callPoracle<T>(
	path: string,
	method: "GET" | "POST" | "DELETE",
	body?: unknown
): Promise<T | undefined> {
	const config = getServerConfig().poracle;
	if (!config) return undefined;

	const url = new URL(path, config.url);
	const start = performance.now();

	const response = await fetch(url, {
		method,
		headers: {
			"X-Poracle-Secret": config.secret,
			...(body !== undefined ? { "Content-Type": "application/json" } : {})
		},
		body: body !== undefined ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		log.error("[%s] Poracle returned bad status | %d", url.toString(), response.status);
		return undefined;
	}

	const result = await response.json();
	log.debug("[%s] Request took %fms", url.pathname, (performance.now() - start).toFixed(1));
	return result;
}

export type PoracleTrackingRule = {
	uid: number;
	description?: string;
	pokemon_id?: number;
	form?: number;
	min_iv?: number;
	max_iv?: number;
	min_cp?: number;
	max_cp?: number;
	min_level?: number;
	max_level?: number;
	atk?: number;
	def?: number;
	sta?: number;
	max_atk?: number;
	max_def?: number;
	max_sta?: number;
	gender?: number;
	size?: number;
	max_size?: number;
	pvp_ranking_league?: number;
	pvp_ranking_best?: number;
	pvp_ranking_worst?: number;
	distance?: number;
	clean?: number | boolean;
	level?: number | number[];
	reward_type?: number;
	reward?: number;
	grunt_type?: string;
	[key: string]: unknown;
};

export type PoracleAllTracking = {
	status: string;
	human?: { id: string; name: string; enabled: boolean };
	pokemon?: PoracleTrackingRule[];
	raid?: PoracleTrackingRule[];
	quest?: PoracleTrackingRule[];
	invasion?: PoracleTrackingRule[];
	egg?: PoracleTrackingRule[];
	lure?: PoracleTrackingRule[];
	nest?: PoracleTrackingRule[];
	gym?: PoracleTrackingRule[];
	maxbattle?: PoracleTrackingRule[];
	fort?: PoracleTrackingRule[];
};

export async function getTrackingAll(discordId: string): Promise<PoracleAllTracking | undefined> {
	return callPoracle(`/api/tracking/all/${discordId}?includeDescriptions=true`, "GET");
}

export async function getTracking(
	discordId: string,
	type: string
): Promise<{ status: string; [key: string]: unknown } | undefined> {
	return callPoracle(`/api/tracking/${type}/${discordId}`, "GET");
}

export async function createTracking(
	discordId: string,
	type: string,
	rules: unknown[]
): Promise<{ status: string; message?: string } | undefined> {
	return callPoracle(`/api/tracking/${type}/${discordId}?silent=true`, "POST", rules);
}

export async function deleteTracking(
	discordId: string,
	type: string,
	uid: number
): Promise<{ status: string } | undefined> {
	return callPoracle(`/api/tracking/${type}/${discordId}/byUid/${uid}`, "DELETE");
}

export async function ensureHuman(discordId: string, name: string): Promise<void> {
	const existing = await callPoracle<{ status: string }>(`/api/humans/one/${discordId}`, "GET");
	if (existing?.status === "ok") return;
	await callPoracle(`/api/humans`, "POST", {
		id: discordId,
		name,
		type: "discord:user"
	});
}

export type PoracleHuman = {
	id: string;
	name: string;
	type: string;
	enabled: boolean;
	area?: string;
	latitude?: number;
	longitude?: number;
	language?: string;
	current_profile_no?: number;
};

export type PoracleArea = {
	name: string;
	group?: string;
	description?: string;
	userSelectable?: boolean;
};

export async function getHumanInfo(discordId: string): Promise<{
	status: string;
	human?: PoracleHuman;
	areas?: PoracleArea[];
} | undefined> {
	// Get available areas and human record in parallel
	const [areasResp, humanResp] = await Promise.all([
		callPoracle<{ status: string; areas?: PoracleArea[] }>(`/api/humans/${discordId}`, "GET"),
		callPoracle<{ status: string; human?: PoracleHuman }>(`/api/humans/one/${discordId}`, "GET")
	]);
	if (!humanResp) return undefined;
	return {
		status: humanResp.status,
		human: humanResp.human,
		areas: areasResp?.areas ?? []
	};
}

export async function setHumanAreas(discordId: string, areas: string[]): Promise<{ status: string } | undefined> {
	return callPoracle(`/api/humans/${discordId}/setAreas`, "POST", areas);
}

export async function setHumanLocation(
	discordId: string,
	lat: number,
	lon: number
): Promise<{ status: string } | undefined> {
	return callPoracle(`/api/humans/${discordId}/setLocation/${lat}/${lon}`, "POST");
}

export async function getGrunts(): Promise<Record<string, { type: string; template?: string }> | undefined> {
	return callPoracle(`/api/masterdata/grunts`, "GET");
}
