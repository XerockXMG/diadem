<script lang="ts">
	import { onMount } from "svelte";
	import { Plus, Trash2, ChevronDown, ChevronRight, Settings } from "lucide-svelte";
	import Card from "@/components/ui/Card.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import {
		deleteRule,
		getAvailableAreas,
		getGruntTypes,
		getHumanInfo,
		getHumanInfoError,
		getPoracleLoadError,
		getSelectedAreas,
		getTrackingRules,
		isHumanInfoLoading,
		isPoracleLoading,
		loadGruntTypes,
		loadHumanInfo,
		loadPoracleTracking,
		saveAreas,
		saveLocation,
		trackRule,
		PORACLE_TRACK_TYPES,
		type PoracleTrackType
	} from "@/lib/features/poracle.svelte.js";
	import type { PoracleTrackingRule } from "@/lib/server/api/poracleApi.js";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";
	import { getSpawnablePokemon, getAllItemIds } from "@/lib/services/masterfile.js";
	import { mPokemon, mItem } from "@/lib/services/ingameLocale.js";
	import { getIconPokemon, getIconItem } from "@/lib/services/uicons.svelte.js";
	import { getMap } from "@/lib/map/map.svelte.js";

	// ---------------------------------------------------------------------------
	// Constants
	// ---------------------------------------------------------------------------

	const SIZE_LABELS = ["XXS", "XS", "M", "XL", "XXL"]; // index 0 = size value 1

	const PVP_LEAGUES = [
		{ value: 0, label: m.poracle_pvp_none() },
		{ value: 500, label: m.poracle_pvp_little() },
		{ value: 1500, label: m.poracle_pvp_great() },
		{ value: 2500, label: m.poracle_pvp_ultra() },
		{ value: 10000, label: m.poracle_pvp_master() }
	];

	const PVP_LEVEL_CAPS = [
		{ value: 0, label: m.poracle_pvp_level_all() },
		{ value: 50, label: "50" },
		{ value: 51, label: "51" }
	];

	const RAID_LEVELS = [1, 3, 4, 5, 6];
	const RAID_LEVEL_LABELS: Record<number, string> = {
		1: "★",
		3: "★★★",
		4: "★★★★",
		5: "Legendary",
		6: "Mega"
	};

	const QUEST_REWARD_OPTIONS: { value: QuestRewardType; label: string }[] = [
		{ value: 7, label: "Pokémon" },
		{ value: 2, label: m.items() },
		{ value: 3, label: m.stardust() },
		{ value: 12, label: m.mega_energy() },
		{ value: 4, label: m.candy() }
	];

	const TEAM_OPTIONS = [
		{ value: 0, label: m.poracle_team_any() },
		{ value: 1, label: m.poracle_team_mystic() },
		{ value: 2, label: m.poracle_team_valor() },
		{ value: 3, label: m.poracle_team_instinct() }
	];

	const GENDER_OPTIONS = [
		{ value: 0, label: m.poracle_gender_any() },
		{ value: 1, label: m.poracle_gender_male() },
		{ value: 2, label: m.poracle_gender_female() }
	];

	// ---------------------------------------------------------------------------
	// Tab state
	// ---------------------------------------------------------------------------

	type MenuTab = PoracleTrackType | "settings";
const TAB_LABELS: Record<MenuTab, string> = {
		pokemon: "Pokémon",
		raid: "Raids",
		quest: "Quests",
		invasion: "Invasions",
		settings: m.poracle_settings()
	};

	let activeTab: MenuTab = $state("pokemon");
	let showAddForm = $state(false);
	let submitting = $state(false);

	// ---------------------------------------------------------------------------
	// Pokemon form state
	// ---------------------------------------------------------------------------

	let pokemonSearch = $state("");
	let selectedPokemon: { pokemon_id: number; form: number } | null = $state(null);
	// Primary
	let pokemonMinIv = $state(0);
	let pokemonMaxIv = $state(100);
	let pokemonMinLevel = $state(0);
	let pokemonMaxLevel = $state(35);
	let pokemonGender = $state(0);
	let pokemonClean = $state(false);
	let pokemonDistance = $state(0);
	// Advanced
	let showAdvanced = $state(false);
	let pokemonMinCp = $state(0);
	let pokemonMaxCp = $state(9000);
	let pokemonMinAtk = $state(0);
	let pokemonMaxAtk = $state(15);
	let pokemonMinDef = $state(0);
	let pokemonMaxDef = $state(15);
	let pokemonMinSta = $state(0);
	let pokemonMaxSta = $state(15);
	let pokemonMinSize = $state(1);
	let pokemonMaxSize = $state(5);
	let pokemonMinTime = $state(0);
	// PVP
	let showPvp = $state(false);
	let pokemonPvpLeague = $state(0);
	let pokemonPvpLevelCap = $state(0);
	let pokemonPvpMinRank = $state(1);
	let pokemonPvpMaxRank = $state(10);

	// ---------------------------------------------------------------------------
	// Raid form state
	// ---------------------------------------------------------------------------

	type RaidMode = "level" | "boss";
	let raidMode: RaidMode = $state("level");
	let raidLevels = $state<number[]>([5]);
	let raidBoss: { pokemon_id: number; form: number } | null = $state(null);
	let raidBossSearch = $state("");
	let raidTeam = $state(0);
	let raidClean = $state(false);
	let raidDistance = $state(0);

	// ---------------------------------------------------------------------------
	// Quest / Invasion form state
	// ---------------------------------------------------------------------------

	type QuestRewardType = 7 | 2 | 3 | 12 | 4;
	let questRewardType = $state<QuestRewardType>(7);
	let questPokemonSearch = $state("");
	let questPokemon: { pokemon_id: number; form: number } | null = $state(null);
	let questItemSearch = $state("");
	let questItemId: number | null = $state(null);
	let questCandySearch = $state("");
	let questCandyPokemon: { pokemon_id: number; form: number } | null = $state(null);
	let questMegaSearch = $state("");
	let questMegaPokemon: { pokemon_id: number; form: number } | null = $state(null);
	let questDistance = $state(0);

	let invasionGruntType = $state("");
	let invasionDistance = $state(0);

	// ---------------------------------------------------------------------------
	// Settings state
	// ---------------------------------------------------------------------------

	let selectedAreas = $state<string[]>([]);
	let savingAreas = $state(false);
	let savingLocation = $state(false);
	let areaSearch = $state("");

	// ---------------------------------------------------------------------------
	// Search results (derived)
	// ---------------------------------------------------------------------------

	let pokemonSearchResults = $derived.by(() => {
		const q = pokemonSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon().filter((p) => mPokemon(p).toLowerCase().includes(q)).slice(0, 8);
	});

	let raidBossSearchResults = $derived.by(() => {
		const q = raidBossSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon().filter((p) => mPokemon(p).toLowerCase().includes(q)).slice(0, 8);
	});

	let questPokemonSearchResults = $derived.by(() => {
		const q = questPokemonSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon().filter((p) => mPokemon(p).toLowerCase().includes(q)).slice(0, 8);
	});

	let questItemSearchResults = $derived.by(() => {
		const q = questItemSearch.toLowerCase();
		if (!q) return [];
		return getAllItemIds()
			.map((id) => ({ id, name: mItem(id) }))
			.filter((i) => i.name && i.name.toLowerCase().includes(q))
			.slice(0, 10);
	});

	let questCandySearchResults = $derived.by(() => {
		const q = questCandySearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon().filter((p) => mPokemon(p).toLowerCase().includes(q)).slice(0, 8);
	});

	let questMegaSearchResults = $derived.by(() => {
		const q = questMegaSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon().filter((p) => mPokemon(p).toLowerCase().includes(q)).slice(0, 8);
	});

	// ---------------------------------------------------------------------------
	// Lifecycle
	// ---------------------------------------------------------------------------

	onMount(() => {
		loadPoracleTracking();
		loadGruntTypes();
	});

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	function resetForm() {
		showAddForm = false;
		showAdvanced = false;
		showPvp = false;
		pokemonSearch = "";
		selectedPokemon = null;
		pokemonMinIv = 0;
		pokemonMaxIv = 100;
		pokemonMinLevel = 0;
		pokemonMaxLevel = 35;
		pokemonGender = 0;
		pokemonClean = false;
		pokemonDistance = 0;
		pokemonMinCp = 0;
		pokemonMaxCp = 9000;
		pokemonMinAtk = 0;
		pokemonMaxAtk = 15;
		pokemonMinDef = 0;
		pokemonMaxDef = 15;
		pokemonMinSta = 0;
		pokemonMaxSta = 15;
		pokemonMinSize = 1;
		pokemonMaxSize = 5;
		pokemonMinTime = 0;
		pokemonPvpLeague = 0;
		pokemonPvpLevelCap = 0;
		pokemonPvpMinRank = 1;
		pokemonPvpMaxRank = 10;
		raidMode = "level";
		raidLevels = [5];
		raidBoss = null;
		raidBossSearch = "";
		raidTeam = 0;
		raidClean = false;
		raidDistance = 0;
		questRewardType = 7;
		questPokemonSearch = "";
		questPokemon = null;
		questItemSearch = "";
		questItemId = null;
		questCandySearch = "";
		questCandyPokemon = null;
		questMegaSearch = "";
		questMegaPokemon = null;
		questDistance = 0;
		invasionGruntType = "";
		invasionDistance = 0;
	}

	function toggleTab(tab: MenuTab) {
		if (activeTab !== tab) {
			activeTab = tab;
			resetForm();
			if (tab === "settings") {
				loadHumanInfo().then(() => {
					selectedAreas = getSelectedAreas();
				});
			}
		}
	}

	function toggleRaidLevel(level: number) {
		raidLevels = raidLevels.includes(level)
			? raidLevels.filter((l) => l !== level)
			: [...raidLevels, level];
	}

	function toggleArea(name: string) {
		selectedAreas = selectedAreas.includes(name)
			? selectedAreas.filter((a) => a !== name)
			: [...selectedAreas, name];
	}

	async function onDelete(type: PoracleTrackType, uid: number) {
		const ok = await deleteRule(type, uid);
		openToast(ok ? m.poracle_delete_success() : m.poracle_delete_error());
	}

	async function onSubmit() {
		submitting = true;
		let result: { ok: boolean };

		if (activeTab === "pokemon") {
			if (!selectedPokemon) {
				openToast(m.poracle_select_pokemon());
				submitting = false;
				return;
			}
			const rule: Record<string, unknown> = {
				pokemon_id: selectedPokemon.pokemon_id,
				form: selectedPokemon.form,
				min_iv: pokemonMinIv,
				max_iv: pokemonMaxIv,
				min_level: pokemonMinLevel,
				max_level: pokemonMaxLevel,
				gender: pokemonGender,
				clean: pokemonClean,
				distance: pokemonDistance
			};
			// Advanced fields (only include if non-default)
			if (pokemonMinCp > 0 || pokemonMaxCp < 9000) {
				rule.min_cp = pokemonMinCp;
				rule.max_cp = pokemonMaxCp;
			}
			if (pokemonMinAtk > 0 || pokemonMaxAtk < 15) {
				rule.atk = pokemonMinAtk;
				rule.max_atk = pokemonMaxAtk;
			}
			if (pokemonMinDef > 0 || pokemonMaxDef < 15) {
				rule.def = pokemonMinDef;
				rule.max_def = pokemonMaxDef;
			}
			if (pokemonMinSta > 0 || pokemonMaxSta < 15) {
				rule.sta = pokemonMinSta;
				rule.max_sta = pokemonMaxSta;
			}
			if (pokemonMinSize > 1 || pokemonMaxSize < 5) {
				rule.size = pokemonMinSize;
				rule.max_size = pokemonMaxSize;
			}
			if (pokemonMinTime > 0) rule.min_time = pokemonMinTime;
			// PVP
			if (pokemonPvpLeague > 0) {
				rule.pvp_ranking_league = pokemonPvpLeague;
				rule.pvp_ranking_best = pokemonPvpMinRank;
				rule.pvp_ranking_worst = pokemonPvpMaxRank;
				if (pokemonPvpLevelCap > 0) rule.pvp_ranking_cap = pokemonPvpLevelCap;
			}
			result = await trackRule("pokemon", rule);
		} else if (activeTab === "raid") {
			if (raidMode === "boss") {
				if (!raidBoss) {
					openToast(m.poracle_select_pokemon());
					submitting = false;
					return;
				}
				result = await trackRule("raid", {
					pokemon_id: raidBoss.pokemon_id,
					form: raidBoss.form,
					team: raidTeam,
					clean: raidClean,
					distance: raidDistance
				});
			} else {
				if (raidLevels.length === 0) { submitting = false; return; }
				result = await trackRule("raid", {
					level: raidLevels,
					team: raidTeam,
					clean: raidClean,
					distance: raidDistance
				});
			}
		} else if (activeTab === "quest") {
			const rule: Record<string, unknown> = { reward_type: questRewardType, distance: questDistance };
			if (questRewardType === 7 && questPokemon) rule.reward = questPokemon.pokemon_id;
			else if (questRewardType === 2 && questItemId) rule.reward = questItemId;
			else if (questRewardType === 4 && questCandyPokemon) rule.reward = questCandyPokemon.pokemon_id;
			else if (questRewardType === 12 && questMegaPokemon) rule.reward = questMegaPokemon.pokemon_id;
			result = await trackRule("quest", rule);
		} else {
			result = await trackRule("invasion", { grunt_type: invasionGruntType, distance: invasionDistance });
		}

		submitting = false;
		if (result.ok) {
			openToast(m.poracle_track_success());
			resetForm();
		} else {
			openToast(m.poracle_track_error());
		}
	}

	async function onSaveAreas() {
		savingAreas = true;
		const ok = await saveAreas(selectedAreas);
		savingAreas = false;
		openToast(ok ? m.poracle_areas_saved() : m.poracle_areas_error());
	}

	async function onUseMapCenter() {
		const center = getMap()?.getCenter();
		if (!center) return;
		savingLocation = true;
		const ok = await saveLocation(center.lat, center.lng);
		savingLocation = false;
		openToast(ok ? m.poracle_location_saved() : m.poracle_location_error());
	}

	// Strip Poracle markdown bold markers from server-provided descriptions
	function stripMarkdown(s: string): string {
		return s.replace(/\*\*/g, "");
	}

	function sizeLabel(v: number): string {
		return SIZE_LABELS[(v ?? 1) - 1] ?? "M";
	}

	// Generate a complete description from raw rule data (fallback when server doesn't enrich)
	function describeRule(type: PoracleTrackType, rule: PoracleTrackingRule): string {
		if (rule.description) return stripMarkdown(rule.description);

		const parts: string[] = [];

		if (type === "pokemon") {
			const pid = rule.pokemon_id ?? 0;
			const name = pid > 0 && pid < 9000
				? mPokemon({ pokemon_id: pid, form: rule.form ?? 0 })
				: m.poracle_everything();
			parts.push(name);

			const minIv = rule.min_iv ?? -1;
			const maxIv = rule.max_iv ?? 100;
			parts.push(`iv: ${minIv}-${maxIv}%`);

			const minCp = rule.min_cp ?? 0;
			const maxCp = rule.max_cp ?? 9000;
			parts.push(`cp: ${minCp}-${maxCp}`);

			const minLvl = rule.min_level ?? 0;
			const maxLvl = rule.max_level ?? 35;
			parts.push(`level: ${minLvl}-${maxLvl}`);

			const atk = rule.atk ?? 0;
			const def = rule.def ?? 0;
			const sta = rule.sta ?? 0;
			const maxAtk = rule.max_atk ?? 15;
			const maxDef = rule.max_def ?? 15;
			const maxSta = rule.max_sta ?? 15;
			parts.push(`stats: ${atk}/${def}/${sta} - ${maxAtk}/${maxDef}/${maxSta}`);

			const minSz = rule.size ?? 1;
			const maxSz = rule.max_size ?? 5;
			parts.push(`size: ${sizeLabel(minSz)}-${sizeLabel(maxSz)}`);

		} else if (type === "raid") {
			const pid = rule.pokemon_id ?? 0;
			if (pid > 0 && pid < 9000) {
				parts.push(mPokemon({ pokemon_id: pid, form: rule.form ?? 0 }));
			} else {
				const lvl = rule.level;
				const lvlStr = Array.isArray(lvl) ? lvl.join(",") : String(lvl ?? "?");
				parts.push(`L${lvlStr} Raid`);
			}
		} else if (type === "quest") {
			const rt = rule.reward_type;
			if (rt === 7 && rule.reward) {
				parts.push(mPokemon({ pokemon_id: rule.reward }));
			} else if (rt === 2 && rule.reward) {
				parts.push(mItem(rule.reward));
			} else if (rt === 4 && rule.reward) {
				parts.push(`${mPokemon({ pokemon_id: rule.reward })} ${m.candy()}`);
			} else if (rt === 12 && rule.reward) {
				parts.push(`${mPokemon({ pokemon_id: rule.reward })} ${m.mega_energy()}`);
			} else {
				const rtLabel = QUEST_REWARD_OPTIONS.find((o) => o.value === rt)?.label;
				parts.push(rtLabel ?? "Quest");
			}
		} else if (type === "invasion") {
			const gt = rule.grunt_type;
			parts.push(gt ? (gt.charAt(0).toUpperCase() + gt.slice(1)) : m.poracle_grunt_any());
			parts.push(m.pogo_invasion());
		}

		if (rule.distance && rule.distance > 0) parts.push(`${rule.distance}m`);
		return parts.join(" | ");
	}

	// Return icon URL for a rule, or null if no meaningful icon
	function ruleIcon(type: PoracleTrackType, rule: PoracleTrackingRule): string | null {
		if (type === "pokemon" || type === "raid") {
			const pid = rule.pokemon_id ?? 0;
			if (pid > 0 && pid < 9000) return getIconPokemon({ pokemon_id: pid, form: rule.form ?? 0 });
		}
		if (type === "quest" && rule.reward_type === 7 && rule.reward) {
			return getIconPokemon({ pokemon_id: rule.reward });
		}
		return null;
	}
</script>

<Metadata title={m.nav_poracle()} />

<Card class="py-3 px-2 flex flex-col gap-2">
	<!-- Tabs + controls -->
	<div class="flex gap-1 items-start">
		<!-- Type tabs (wrap if needed) -->
		<div class="flex gap-1 flex-wrap flex-1">
			{#each PORACLE_TRACK_TYPES as tab}
				<button
					class="px-3 py-1 rounded-md text-sm font-medium transition-colors
						{activeTab === tab
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
					onclick={() => toggleTab(tab)}
				>
					{TAB_LABELS[tab]}
				</button>
			{/each}
		</div>
		<!-- Right column: gear above plus -->
		<div class="flex flex-col gap-1 shrink-0">
			<button
				class="p-1.5 rounded-md transition-colors
					{activeTab === 'settings'
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
				onclick={() => toggleTab('settings')}
				aria-label={m.poracle_settings()}
			>
				<Settings size={16} />
			</button>
			{#if activeTab !== "settings"}
				<button
					class="p-1.5 rounded-md transition-colors
						{showAddForm
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground hover:bg-accent'}"
					onclick={() => (showAddForm = !showAddForm)}
					aria-label={m.create_new()}
				>
					<Plus size={16} />
				</button>
			{/if}
		</div>
	</div>

	<!-- ======= SETTINGS TAB ======= -->
	{#if activeTab === "settings"}
		{#if isHumanInfoLoading()}
			<p class="text-muted-foreground text-sm px-1">{m.poracle_loading()}</p>
		{:else if getHumanInfoError()}
			<p class="text-destructive text-sm px-1">{getHumanInfoError()}</p>
		{:else}
			<div class="flex flex-col gap-1.5 rounded-md border border-border p-3 bg-muted/30">
				<p class="text-xs font-medium">{m.poracle_location()}</p>
				<p class="text-xs text-muted-foreground">{m.poracle_location_hint()}</p>
				{#if getHumanInfo()?.latitude != null && getHumanInfo()?.longitude != null}
					<p class="text-xs text-foreground font-mono">
						{getHumanInfo()!.latitude!.toFixed(5)}, {getHumanInfo()!.longitude!.toFixed(5)}
					</p>
				{/if}
				<Button onclick={onUseMapCenter} disabled={savingLocation} size="sm" variant="outline">
					{savingLocation ? m.poracle_loading() : m.poracle_use_map_center()}
				</Button>
			</div>

			<div class="flex flex-col gap-1.5 rounded-md border border-border p-3 bg-muted/30">
				<p class="text-xs font-medium">{m.poracle_areas()}</p>
				<p class="text-xs text-muted-foreground">{m.poracle_areas_hint()}</p>
				{#if getAvailableAreas().length === 0}
					<p class="text-xs text-muted-foreground">{m.poracle_no_areas()}</p>
				{:else}
					{@const filteredAreas = areaSearch
						? getAvailableAreas().filter((a) =>
								a.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
								(a.group ?? "").toLowerCase().includes(areaSearch.toLowerCase()))
						: getAvailableAreas()}
					<input
						type="text"
						placeholder="Search areas..."
						bind:value={areaSearch}
						class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
					<div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
						{#if filteredAreas.length === 0}
							<p class="text-xs text-muted-foreground py-1">No areas match</p>
						{:else}
							{#each filteredAreas as area (area.name)}
								<label class="flex items-center gap-2 cursor-pointer py-0.5">
									<input
										type="checkbox"
										checked={selectedAreas.includes(area.name.toLowerCase())}
										onchange={() => toggleArea(area.name.toLowerCase())}
									/>
									<span class="text-sm">{area.name}</span>
									{#if area.group}
										<span class="text-xs text-muted-foreground ml-auto">{area.group}</span>
									{/if}
								</label>
							{/each}
						{/if}
					</div>
					<Button onclick={onSaveAreas} disabled={savingAreas} size="sm" class="w-full">
						{savingAreas ? m.poracle_loading() : m.poracle_save()}
					</Button>
				{/if}
			</div>
		{/if}

	<!-- ======= TRACKING TABS ======= -->
	{:else}
		{#if showAddForm}
			<div class="flex flex-col gap-2 rounded-md border border-border p-3 bg-muted/30">

				<!-- ---- POKEMON FORM ---- -->
				{#if activeTab === "pokemon"}
					<!-- Pokemon search -->
					<div class="relative">
						<input
							type="text"
							placeholder={m.poracle_search_pokemon()}
							bind:value={pokemonSearch}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
						{#if selectedPokemon}
							<p class="text-xs text-primary mt-1 flex items-center gap-1">
								<img src={getIconPokemon(selectedPokemon)} alt={mPokemon(selectedPokemon)} class="w-5 h-5" />
								{mPokemon(selectedPokemon)}
								<button class="ml-1 text-muted-foreground" onclick={() => { selectedPokemon = null; pokemonSearch = ""; }}>×</button>
							</p>
						{/if}
						{#if pokemonSearchResults.length > 0 && !selectedPokemon}
							<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
								{#each pokemonSearchResults as p (p.pokemon_id + "-" + p.form)}
									<button
										class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
										onclick={() => { selectedPokemon = p; pokemonSearch = ""; }}
									>
										<img src={getIconPokemon(p)} alt={mPokemon(p)} class="w-6 h-6" />
										{mPokemon(p)}
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Primary fields -->
					<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
						<!-- IV range -->
						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted-foreground">{m.poracle_iv_range()}</span>
							<div class="flex items-center gap-1">
								<input type="number" min="-1" max="100" bind:value={pokemonMinIv}
									class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
								<span class="text-xs text-muted-foreground shrink-0">–</span>
								<input type="number" min="0" max="100" bind:value={pokemonMaxIv}
									class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
								<span class="text-xs text-muted-foreground shrink-0">%</span>
							</div>
						</div>
						<!-- Level range -->
						<div class="flex flex-col gap-1">
							<span class="text-xs text-muted-foreground">{m.poracle_level_range()}</span>
							<div class="flex items-center gap-1">
								<input type="number" min="0" max="55" bind:value={pokemonMinLevel}
									class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
								<span class="text-xs text-muted-foreground shrink-0">–</span>
								<input type="number" min="0" max="55" bind:value={pokemonMaxLevel}
									class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							</div>
						</div>
					</div>

					<!-- Gender + Clean -->
					<div class="flex items-center gap-3">
						<span class="text-xs text-muted-foreground">{m.poracle_gender()}</span>
						<div class="flex gap-1">
							{#each GENDER_OPTIONS as g}
								<button
									class="px-2 py-0.5 rounded text-xs font-medium transition-colors {pokemonGender === g.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
									onclick={() => (pokemonGender = g.value)}
								>{g.label}</button>
							{/each}
						</div>
						<label class="flex items-center gap-1.5 ml-auto cursor-pointer">
							<input type="checkbox" bind:checked={pokemonClean} />
							<span class="text-xs text-muted-foreground">{m.poracle_clean()}</span>
						</label>
					</div>

					<!-- Distance -->
					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</span>
						<input type="number" min="0" step="100" bind:value={pokemonDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
						<span class="text-xs text-muted-foreground">m</span>
					</div>

					<!-- Advanced collapsible -->
					<button
						class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						onclick={() => (showAdvanced = !showAdvanced)}
					>
						{#if showAdvanced}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						{m.poracle_advanced()}
					</button>
					{#if showAdvanced}
						<div class="flex flex-col gap-1.5 pl-1 border-l-2 border-border">
							<div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
								<!-- CP -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_cp()}</span>
									<div class="flex items-center gap-1">
										<input type="number" min="0" bind:value={pokemonMinCp}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
										<span class="text-xs text-muted-foreground shrink-0">–</span>
										<input type="number" min="0" bind:value={pokemonMaxCp}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
									</div>
								</div>
								<!-- ATK -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_attack()}</span>
									<div class="flex items-center gap-1">
										<input type="number" min="0" max="15" bind:value={pokemonMinAtk}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
										<span class="text-xs text-muted-foreground shrink-0">–</span>
										<input type="number" min="0" max="15" bind:value={pokemonMaxAtk}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
									</div>
								</div>
								<!-- DEF -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_defense()}</span>
									<div class="flex items-center gap-1">
										<input type="number" min="0" max="15" bind:value={pokemonMinDef}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
										<span class="text-xs text-muted-foreground shrink-0">–</span>
										<input type="number" min="0" max="15" bind:value={pokemonMaxDef}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
									</div>
								</div>
								<!-- STA -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_stamina()}</span>
									<div class="flex items-center gap-1">
										<input type="number" min="0" max="15" bind:value={pokemonMinSta}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
										<span class="text-xs text-muted-foreground shrink-0">–</span>
										<input type="number" min="0" max="15" bind:value={pokemonMaxSta}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
									</div>
								</div>
								<!-- Size -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_size()}</span>
									<div class="flex items-center gap-1">
										<select bind:value={pokemonMinSize}
											class="flex-1 rounded-md border border-input bg-background px-1 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
											{#each SIZE_LABELS as label, i}
												<option value={i + 1}>{label}</option>
											{/each}
										</select>
										<span class="text-xs text-muted-foreground shrink-0">–</span>
										<select bind:value={pokemonMaxSize}
											class="flex-1 rounded-md border border-input bg-background px-1 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
											{#each SIZE_LABELS as label, i}
												<option value={i + 1}>{label}</option>
											{/each}
										</select>
									</div>
								</div>
								<!-- Min Time -->
								<div class="flex flex-col gap-1">
									<span class="text-xs text-muted-foreground">{m.poracle_min_time()}</span>
									<div class="flex items-center gap-1">
										<input type="number" min="0" step="60" bind:value={pokemonMinTime}
											class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
										<span class="text-xs text-muted-foreground shrink-0">s</span>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- PVP collapsible -->
					<button
						class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						onclick={() => (showPvp = !showPvp)}
					>
						{#if showPvp}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						{m.poracle_pvp()}
					</button>
					{#if showPvp}
						<div class="flex flex-col gap-1.5 pl-1 border-l-2 border-border">
							<!-- League -->
							<div class="flex items-center gap-2">
								<span class="text-xs text-muted-foreground w-12 shrink-0">{m.poracle_pvp_league()}</span>
								<select bind:value={pokemonPvpLeague}
									class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
									{#each PVP_LEAGUES as l}
										<option value={l.value}>{l.label}</option>
									{/each}
								</select>
							</div>
							{#if pokemonPvpLeague > 0}
								<!-- Level cap -->
								<div class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground w-12 shrink-0">{m.poracle_pvp_level()}</span>
									<div class="flex gap-1">
										{#each PVP_LEVEL_CAPS as lc}
											<button
												class="px-2 py-0.5 rounded text-xs font-medium transition-colors {pokemonPvpLevelCap === lc.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
												onclick={() => (pokemonPvpLevelCap = lc.value)}
											>{lc.label}</button>
										{/each}
									</div>
								</div>
								<!-- Rank range -->
								<div class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground w-12 shrink-0">{m.poracle_pvp_rank()}</span>
									<input type="number" min="1" max="4096" bind:value={pokemonPvpMinRank}
										class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
									<span class="text-xs text-muted-foreground shrink-0">–</span>
									<input type="number" min="1" max="4096" bind:value={pokemonPvpMaxRank}
										class="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
								</div>
							{/if}
						</div>
					{/if}

				<!-- ---- RAID FORM ---- -->
				{:else if activeTab === "raid"}
					<div class="flex gap-2">
						<button
							class="flex-1 py-1 rounded-md text-xs font-medium {raidMode === 'level' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
							onclick={() => (raidMode = "level")}
						>{m.poracle_raid_by_level()}</button>
						<button
							class="flex-1 py-1 rounded-md text-xs font-medium {raidMode === 'boss' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
							onclick={() => (raidMode = "boss")}
						>{m.poracle_raid_by_boss()}</button>
					</div>
					{#if raidMode === "level"}
						<div class="flex gap-1 flex-wrap">
							{#each RAID_LEVELS as level}
								<button
									class="px-2 py-1 rounded text-xs font-medium {raidLevels.includes(level) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
									onclick={() => toggleRaidLevel(level)}
								>{RAID_LEVEL_LABELS[level]}</button>
							{/each}
						</div>
					{:else}
						<div class="relative">
							<input type="text" placeholder={m.poracle_search_pokemon()} bind:value={raidBossSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							{#if raidBoss}
								<p class="text-xs text-primary mt-1 flex items-center gap-1">
									<img src={getIconPokemon(raidBoss)} alt={mPokemon(raidBoss)} class="w-5 h-5" />
									{mPokemon(raidBoss)}
									<button class="ml-1 text-muted-foreground" onclick={() => { raidBoss = null; raidBossSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if raidBossSearchResults.length > 0 && !raidBoss}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each raidBossSearchResults as p (p.pokemon_id + "-" + p.form)}
										<button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { raidBoss = p; raidBossSearch = ""; }}>
											<img src={getIconPokemon(p)} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-xs text-muted-foreground">{m.poracle_team()}</span>
						{#each TEAM_OPTIONS as t}
							<button
								class="px-2 py-0.5 rounded text-xs font-medium transition-colors {raidTeam === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
								onclick={() => (raidTeam = t.value)}
							>{t.label}</button>
						{/each}
						<label class="flex items-center gap-1.5 ml-auto cursor-pointer">
							<input type="checkbox" bind:checked={raidClean} />
							<span class="text-xs text-muted-foreground">{m.poracle_clean()}</span>
						</label>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</span>
						<input type="number" min="0" step="100" bind:value={raidDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
						<span class="text-xs text-muted-foreground">m</span>
					</div>

				<!-- ---- QUEST FORM ---- -->
				{:else if activeTab === "quest"}
					<select bind:value={questRewardType}
						class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						{#each QUEST_REWARD_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>

					<!-- Pokémon reward -->
					{#if questRewardType === 7}
						<div class="relative">
							<input type="text" placeholder={m.poracle_search_pokemon()} bind:value={questPokemonSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							{#if questPokemon}
								<p class="text-xs text-primary mt-1 flex items-center gap-1">
									<img src={getIconPokemon(questPokemon)} alt={mPokemon(questPokemon)} class="w-5 h-5" />
									{mPokemon(questPokemon)}
									<button class="ml-1 text-muted-foreground" onclick={() => { questPokemon = null; questPokemonSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if questPokemonSearchResults.length > 0 && !questPokemon}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each questPokemonSearchResults as p (p.pokemon_id + "-" + p.form)}
										<button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { questPokemon = p; questPokemonSearch = ""; }}>
											<img src={getIconPokemon(p)} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>

					<!-- Item reward -->
					{:else if questRewardType === 2}
						<div class="relative">
							<input type="text" placeholder="Search items..." bind:value={questItemSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							{#if questItemId}
								<p class="text-xs text-primary mt-1 flex items-center gap-1">
									<img src={getIconItem(questItemId)} alt={mItem(questItemId)} class="w-5 h-5" />
									{mItem(questItemId)}
									<button class="ml-1 text-muted-foreground" onclick={() => { questItemId = null; questItemSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if questItemSearchResults.length > 0 && !questItemId}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each questItemSearchResults as item (item.id)}
										<button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { questItemId = item.id; questItemSearch = ""; }}>
											<img src={getIconItem(item.id)} alt={item.name} class="w-6 h-6" />
											{item.name}
										</button>
									{/each}
								</div>
							{/if}
						</div>

					<!-- Candy reward -->
					{:else if questRewardType === 4}
						<div class="relative">
							<input type="text" placeholder={m.poracle_search_pokemon()} bind:value={questCandySearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							{#if questCandyPokemon}
								<p class="text-xs text-primary mt-1 flex items-center gap-1">
									<img src={getIconPokemon(questCandyPokemon)} alt={mPokemon(questCandyPokemon)} class="w-5 h-5" />
									{mPokemon(questCandyPokemon)}
									<button class="ml-1 text-muted-foreground" onclick={() => { questCandyPokemon = null; questCandySearch = ""; }}>×</button>
								</p>
							{/if}
							{#if questCandySearchResults.length > 0 && !questCandyPokemon}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each questCandySearchResults as p (p.pokemon_id + "-" + p.form)}
										<button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { questCandyPokemon = p; questCandySearch = ""; }}>
											<img src={getIconPokemon(p)} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>

					<!-- Mega Energy reward -->
					{:else if questRewardType === 12}
						<div class="relative">
							<input type="text" placeholder={m.poracle_search_pokemon()} bind:value={questMegaSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
							{#if questMegaPokemon}
								<p class="text-xs text-primary mt-1 flex items-center gap-1">
									<img src={getIconPokemon(questMegaPokemon)} alt={mPokemon(questMegaPokemon)} class="w-5 h-5" />
									{mPokemon(questMegaPokemon)}
									<button class="ml-1 text-muted-foreground" onclick={() => { questMegaPokemon = null; questMegaSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if questMegaSearchResults.length > 0 && !questMegaPokemon}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each questMegaSearchResults as p (p.pokemon_id + "-" + p.form)}
										<button class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { questMegaPokemon = p; questMegaSearch = ""; }}>
											<img src={getIconPokemon(p)} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</span>
						<input type="number" min="0" step="100" bind:value={questDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
						<span class="text-xs text-muted-foreground">m</span>
					</div>

				<!-- ---- INVASION FORM ---- -->
				{:else if activeTab === "invasion"}
					{@const gruntTypes = getGruntTypes()}
					<label for="invasion-grunt-type" class="text-xs text-muted-foreground">{m.poracle_grunt_type()}</label>
					<select id="invasion-grunt-type" bind:value={invasionGruntType}
						class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<option value="">{m.poracle_grunt_any()}</option>
						{#each gruntTypes as gt}
							<option value={gt}>{gt.charAt(0).toUpperCase() + gt.slice(1)}</option>
						{/each}
					</select>
					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</span>
						<input type="number" min="0" step="100" bind:value={invasionDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
						<span class="text-xs text-muted-foreground">m</span>
					</div>
				{/if}

				<p class="text-xs text-muted-foreground">{m.poracle_distance_hint()}</p>
				<Button onclick={onSubmit} disabled={submitting} size="sm" class="w-full">
					{submitting ? m.poracle_loading() : m.poracle_track()}
				</Button>
			</div>
		{/if}

		<!-- Rules list -->
		{#if isPoracleLoading()}
			<p class="text-muted-foreground text-sm px-1">{m.poracle_loading()}</p>
		{:else if getPoracleLoadError()}
			<p class="text-destructive text-sm px-1">{getPoracleLoadError()}</p>
		{:else}
			{@const rules = getTrackingRules(activeTab as PoracleTrackType)}
			{#if rules.length === 0}
				<p class="text-muted-foreground text-sm px-1">{m.poracle_no_rules()}</p>
			{:else}
				<div class="flex flex-col gap-1 max-h-72 overflow-y-auto">
					{#each rules as rule (rule.uid)}
						{@const icon = ruleIcon(activeTab as PoracleTrackType, rule)}
						<div class="flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/50">
							{#if icon}
								<img src={icon} alt="" class="w-7 h-7 shrink-0" />
							{:else}
								<div class="w-7 h-7 shrink-0 flex items-center justify-center text-muted-foreground text-lg leading-none">?</div>
							{/if}
							<p class="text-xs text-foreground leading-snug flex-1 min-w-0 break-words font-mono">
								{describeRule(activeTab as PoracleTrackType, rule)}
							</p>
							<button
								class="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-0.5"
								onclick={() => onDelete(activeTab as PoracleTrackType, rule.uid)}
								aria-label={m.delete()}
							>
								<Trash2 size={14} />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</Card>
