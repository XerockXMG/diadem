import { POKEMON_MIN_RANK } from "@/lib/constants";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import * as m from "@/lib/paraglide/messages";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import type { MasterPokemon } from "@/lib/types/masterfile";
import { getMasterPokemon } from "@/lib/services/masterfile";

export const pokemonSizes = {
	1: "XXS",
	2: "XS",
	3: "M",
	4: "XL",
	5: "XXL"
};

const typeNames = new Map([
	[1, "normal"],
	[2, "fighting"],
	[3, "flying"],
	[4, "poison"],
	[5, "ground"],
	[6, "rock"],
	[7, "bug"],
	[8, "ghost"],
	[9, "steel"],
	[10, "fire"],
	[11, "water"],
	[12, "grass"],
	[13, "electric"],
	[14, "psychic"],
	[15, "ice"],
	[16, "dragon"],
	[17, "dark"],
	[18, "fairy"]
]);

export function hasTimer(data: {
	expire_timestamp: number | null | undefined;
	expire_timestamp_verified: number | boolean | null | undefined;
}) {
	return data.expire_timestamp && data.expire_timestamp_verified;
}

export function getBestRank(data: PokemonData, league: "little" | "great" | "ultra") {
	const ranks = data.pvp?.[league]?.map(l => l.rank) ?? [0]
	const best = Math.min(...ranks)
	if (!Number.isInteger(best)) return 0
	return best
}

function showPvp(bestRank: number, filterAttribute: "pvpRankLittle" | "pvpRankGreat" | "pvpRankUltra") {
	const always = bestRank > 0 && bestRank <= POKEMON_MIN_RANK;
	if (always) return true;

	const filters = getUserSettings().filters.pokemon.filters.filter((f) => f.enabled);
	for (const filter of filters) {
		if (filter[filterAttribute]) {
			if (bestRank >= filter[filterAttribute].min && bestRank <= filter[filterAttribute].max) {
				return true;
			}
		}
	}
	return false;
}

export function showLittle(data: PokemonData) {
	const bestRank = getBestRank(data, "little")
	return showPvp(bestRank, "pvpRankLittle")
}

export function showGreat(data: PokemonData) {
	const bestRank = getBestRank(data, "great");
	return showPvp(bestRank, "pvpRankGreat");
}

export function showUltra(data: PokemonData) {
	const bestRank = getBestRank(data, "ultra");
	return showPvp(bestRank, "pvpRankUltra");
}

export function getPokemonSize(size: number) {
	return pokemonSizes[size] ?? "?";
}

export function getGenderLabel(gender: number) {
	if (gender === 1) {
		return m.pokemon_gender_male();
	} else if (gender === 2) {
		return m.pokemon_gender_female();
	} else {
		return m.pokemon_gender_neutral();
	}
}

export function getRarityLabel(count: number, totalSpawns: number) {
	if (totalSpawns === 0) return m.rarity_legendary();
	const ratio = count / totalSpawns;
	if (ratio > 0.01) return m.rarity_common();
	if (ratio > 0.001) return m.rarity_uncommon();
	if (ratio > 0.0001) return m.rarity_rare();
	if (ratio > 0.00001) return m.rarity_very_rare();
	if (ratio > 0.000001) return m.rarity_extremely_rare();
	return m.rarity_legendary();
}

export function typeIdToText(typeId: number | undefined) {
	if (!typeId) return "normal"
	return typeNames.get(typeId) ?? "normal"
}

export function masterPokemonToTypeText(masterPokemon: MasterPokemon) {
	return typeIdToText(masterPokemon?.types?.[1] ?? masterPokemon?.types?.[0]);
}

export function getNormalizedForm(pokemonId: number | undefined | null, formId: number | undefined | null) {
	if (!pokemonId) return formId ?? 0

	const masterPokemon = getMasterPokemon(pokemonId);
	if (masterPokemon && masterPokemon.defaultFormId && masterPokemon.defaultFormId === formId) {
		formId = 0;
	}

	return formId ?? 0
}
