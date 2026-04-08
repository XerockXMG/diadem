import type { PoracleAllTracking, PoracleArea, PoracleHuman, PoracleTrackingRule } from "@/lib/server/api/poracleApi";

export type PoracleTrackType = "pokemon" | "raid" | "quest" | "invasion";

export const PORACLE_TRACK_TYPES: PoracleTrackType[] = ["pokemon", "raid", "quest", "invasion"];

let trackingData: PoracleAllTracking | null = $state(null);
let isLoading = $state(false);
let loadError: string | null = $state(null);

// Grunt types (loaded once)
let gruntTypes: string[] = $state([]);
let gruntTypesLoaded = false;

// Human info / areas
let humanInfo: PoracleHuman | null = $state(null);
let availableAreas: PoracleArea[] = $state([]);
let humanInfoLoading = $state(false);
let humanInfoError: string | null = $state(null);

export function getPoracleTrackingData() {
	return trackingData;
}

export function isPoracleLoading() {
	return isLoading;
}

export function getPoracleLoadError() {
	return loadError;
}

export async function loadPoracleTracking() {
	isLoading = true;
	loadError = null;
	try {
		const resp = await fetch("/api/poracle/tracking/all");
		if (!resp.ok) {
			loadError = "Failed to load tracking rules";
			return;
		}
		trackingData = await resp.json();
	} catch {
		loadError = "Network error";
	} finally {
		isLoading = false;
	}
}

export function getTrackingRules(type: PoracleTrackType): PoracleTrackingRule[] {
	if (!trackingData) return [];
	return (trackingData[type] as PoracleTrackingRule[] | undefined) ?? [];
}

export async function trackRule(type: PoracleTrackType, rule: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
	const resp = await fetch(`/api/poracle/tracking/${type}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(rule)
	});
	if (!resp.ok) return { ok: false };
	const data = await resp.json();
	if (data.status !== "ok") return { ok: false, message: data.message };
	// Refresh tracking data
	await loadPoracleTracking();
	return { ok: true, message: data.message };
}

export async function deleteRule(type: PoracleTrackType, uid: number): Promise<boolean> {
	const resp = await fetch(`/api/poracle/tracking/${type}/${uid}`, { method: "DELETE" });
	if (!resp.ok) return false;
	const data = await resp.json();
	if (data.status !== "ok") return false;
	// Remove from local state
	if (trackingData && trackingData[type]) {
		trackingData[type] = (trackingData[type] as PoracleTrackingRule[]).filter((r) => r.uid !== uid);
	}
	return true;
}

// --- Grunt types ---

export function getGruntTypes(): string[] {
	return gruntTypes;
}

export async function loadGruntTypes() {
	if (gruntTypesLoaded) return;
	try {
		const resp = await fetch("/api/poracle/masterdata/grunts");
		if (!resp.ok) return;
		const data: Record<string, { type: string }> = await resp.json();
		const seen = new Set<string>();
		const types: string[] = [];
		for (const grunt of Object.values(data)) {
			const t = grunt.type?.toLowerCase();
			if (t && !seen.has(t)) {
				seen.add(t);
				types.push(t);
			}
		}
		gruntTypes = types.sort();
		gruntTypesLoaded = true;
	} catch {
		// ignore — grunt type selector will just not populate
	}
}

// --- Human info / areas ---

export function getHumanInfo() {
	return humanInfo;
}

export function getAvailableAreas() {
	return availableAreas;
}

export function isHumanInfoLoading() {
	return humanInfoLoading;
}

export function getHumanInfoError() {
	return humanInfoError;
}

export async function loadHumanInfo() {
	humanInfoLoading = true;
	humanInfoError = null;
	try {
		const resp = await fetch("/api/poracle/humans/me");
		if (!resp.ok) {
			humanInfoError = "Failed to load profile";
			return;
		}
		const data = await resp.json();
		humanInfo = data.human ?? null;
		availableAreas = data.areas ?? [];
	} catch {
		humanInfoError = "Network error";
	} finally {
		humanInfoLoading = false;
	}
}

export function getSelectedAreas(): string[] {
	if (!humanInfo?.area) return [];
	try {
		return JSON.parse(humanInfo.area);
	} catch {
		return [];
	}
}

export async function saveAreas(areas: string[]): Promise<boolean> {
	const resp = await fetch("/api/poracle/humans/me/setAreas", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(areas)
	});
	if (!resp.ok) return false;
	const data = await resp.json();
	if (data.status !== "ok") return false;
	// Update local state
	if (humanInfo) humanInfo = { ...humanInfo, area: JSON.stringify(areas) };
	return true;
}

export async function saveLocation(lat: number, lon: number): Promise<boolean> {
	const resp = await fetch("/api/poracle/humans/me/setLocation", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ lat, lon })
	});
	if (!resp.ok) return false;
	const data = await resp.json();
	if (data.status !== "ok") return false;
	if (humanInfo) humanInfo = { ...humanInfo, latitude: lat, longitude: lon };
	return true;
}
