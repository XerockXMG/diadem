<script lang="ts">
	import { onMount } from "svelte";
	import { Plus, Trash2 } from "lucide-svelte";
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
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import Metadata from "@/components/utils/Metadata.svelte";
	import { getSpawnablePokemon } from "@/lib/services/masterfile.js";
	import { mPokemon } from "@/lib/services/ingameLocale.js";
	import { resize } from "@/lib/services/assets.js";
	import { getIconPokemon } from "@/lib/services/uicons.svelte.js";
	import { getMap } from "@/lib/map/map.svelte.js";

	type MenuTab = PoracleTrackType | "settings";

	let activeTab: MenuTab = $state("pokemon");
	let showAddForm = $state(false);
	let submitting = $state(false);

	// Pokemon form
	let pokemonSearch = $state("");
	let selectedPokemon: { pokemon_id: number; form: number } | null = $state(null);
	let pokemonMinIv = $state(90);
	let pokemonDistance = $state(0);

	// Raid form
	type RaidMode = "level" | "boss";
	let raidMode: RaidMode = $state("level");
	let raidLevels = $state<number[]>([5]);
	let raidBoss: { pokemon_id: number; form: number } | null = $state(null);
	let raidBossSearch = $state("");
	let raidDistance = $state(0);

	// Quest form
	type QuestRewardType = 7 | 2 | 3 | 12 | 4;
	let questRewardType = $state<QuestRewardType>(7);
	let questPokemonSearch = $state("");
	let questPokemon: { pokemon_id: number; form: number } | null = $state(null);
	let questDistance = $state(0);

	// Invasion form
	let invasionGruntType = $state("");
	let invasionDistance = $state(0);

	// Settings tab
	let selectedAreas = $state<string[]>([]);
	let savingAreas = $state(false);
	let savingLocation = $state(false);

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

	let pokemonSearchResults = $derived.by(() => {
		const q = pokemonSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon()
			.filter((p) => mPokemon(p).toLowerCase().includes(q))
			.slice(0, 8);
	});

	let raidBossSearchResults = $derived.by(() => {
		const q = raidBossSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon()
			.filter((p) => mPokemon(p).toLowerCase().includes(q))
			.slice(0, 8);
	});

	let questPokemonSearchResults = $derived.by(() => {
		const q = questPokemonSearch.toLowerCase();
		if (!q) return [];
		return getSpawnablePokemon()
			.filter((p) => mPokemon(p).toLowerCase().includes(q))
			.slice(0, 8);
	});

	onMount(() => {
		loadPoracleTracking();
		loadGruntTypes();
	});

	function resetForm() {
		showAddForm = false;
		pokemonSearch = "";
		selectedPokemon = null;
		pokemonMinIv = 90;
		pokemonDistance = 0;
		raidMode = "level";
		raidLevels = [5];
		raidBoss = null;
		raidBossSearch = "";
		raidDistance = 0;
		questRewardType = 7;
		questPokemonSearch = "";
		questPokemon = null;
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
		if (raidLevels.includes(level)) {
			raidLevels = raidLevels.filter((l) => l !== level);
		} else {
			raidLevels = [...raidLevels, level];
		}
	}

	function toggleArea(name: string) {
		if (selectedAreas.includes(name)) {
			selectedAreas = selectedAreas.filter((a) => a !== name);
		} else {
			selectedAreas = [...selectedAreas, name];
		}
	}

	async function onDelete(type: PoracleTrackType, uid: number) {
		const ok = await deleteRule(type, uid);
		openToast(ok ? m.poracle_delete_success() : m.poracle_delete_error());
	}

	async function onSubmit() {
		submitting = true;
		let ok = false;

		if (activeTab === "pokemon") {
			if (!selectedPokemon) {
				openToast(m.poracle_select_pokemon());
				submitting = false;
				return;
			}
			const result = await trackRule("pokemon", {
				pokemon_id: selectedPokemon.pokemon_id,
				form: selectedPokemon.form,
				min_iv: pokemonMinIv,
				max_iv: 100,
				distance: pokemonDistance
			});
			ok = result.ok;
		} else if (activeTab === "raid") {
			if (raidMode === "boss") {
				if (!raidBoss) {
					openToast(m.poracle_select_pokemon());
					submitting = false;
					return;
				}
				const result = await trackRule("raid", {
					pokemon_id: raidBoss.pokemon_id,
					form: raidBoss.form,
					distance: raidDistance
				});
				ok = result.ok;
			} else {
				if (raidLevels.length === 0) {
					submitting = false;
					return;
				}
				const result = await trackRule("raid", { level: raidLevels, distance: raidDistance });
				ok = result.ok;
			}
		} else if (activeTab === "quest") {
			const rule: Record<string, unknown> = {
				reward_type: questRewardType,
				distance: questDistance
			};
			if (questRewardType === 7 && questPokemon) {
				rule.reward = questPokemon.pokemon_id;
			}
			const result = await trackRule("quest", rule);
			ok = result.ok;
		} else if (activeTab === "invasion") {
			const result = await trackRule("invasion", {
				grunt_type: invasionGruntType,
				distance: invasionDistance
			});
			ok = result.ok;
		}

		submitting = false;
		if (ok) {
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

	const TAB_LABELS: Record<MenuTab, string> = {
		pokemon: "Pokémon",
		raid: "Raids",
		quest: "Quests",
		invasion: "Invasions",
		settings: m.poracle_settings()
	};

	const ALL_TABS: MenuTab[] = [...PORACLE_TRACK_TYPES, "settings"];
</script>

<Metadata title={m.nav_poracle()} />

<Card class="py-3 px-2 flex flex-col gap-2">
	<!-- Tabs -->
	<div class="flex gap-1 flex-wrap">
		{#each ALL_TABS as tab}
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
		{#if activeTab !== "settings"}
			<button
				class="ml-auto px-2 py-1 rounded-md text-sm font-medium transition-colors
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

	<!-- Settings tab -->
	{#if activeTab === "settings"}
		{#if isHumanInfoLoading()}
			<p class="text-muted-foreground text-sm px-1">{m.poracle_loading()}</p>
		{:else if getHumanInfoError()}
			<p class="text-destructive text-sm px-1">{getHumanInfoError()}</p>
		{:else}
			<!-- Location -->
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

			<!-- Areas -->
			<div class="flex flex-col gap-1.5 rounded-md border border-border p-3 bg-muted/30">
				<p class="text-xs font-medium">{m.poracle_areas()}</p>
				<p class="text-xs text-muted-foreground">{m.poracle_areas_hint()}</p>
				{#if getAvailableAreas().length === 0}
					<p class="text-xs text-muted-foreground">{m.poracle_no_areas()}</p>
				{:else}
					<div class="flex flex-col gap-1 max-h-40 overflow-y-auto">
						{#each getAvailableAreas() as area (area.name)}
							<label class="flex items-center gap-2 cursor-pointer py-0.5">
								<input
									type="checkbox"
									class="rounded"
									checked={selectedAreas.includes(area.name.toLowerCase())}
									onchange={() => toggleArea(area.name.toLowerCase())}
								/>
								<span class="text-sm">{area.name}</span>
								{#if area.group}
									<span class="text-xs text-muted-foreground ml-auto">{area.group}</span>
								{/if}
							</label>
						{/each}
					</div>
					<Button onclick={onSaveAreas} disabled={savingAreas} size="sm" class="w-full">
						{savingAreas ? m.poracle_loading() : m.poracle_save()}
					</Button>
				{/if}
			</div>
		{/if}

	<!-- Tracking tabs -->
	{:else}
		<!-- Add form -->
		{#if showAddForm}
			<div class="flex flex-col gap-2 rounded-md border border-border p-3 bg-muted/30">
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
							<p class="text-xs text-primary mt-1">
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
										<img src={resize(getIconPokemon(p), { width: 32 })} alt={mPokemon(p)} class="w-6 h-6" />
										{mPokemon(p)}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-muted-foreground whitespace-nowrap w-16 shrink-0">{m.poracle_min_iv()} {pokemonMinIv}%</label>
						<input type="range" min="0" max="100" step="5" bind:value={pokemonMinIv} class="flex-1" />
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</label>
						<input type="number" min="0" step="100" bind:value={pokemonDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
					</div>

				{:else if activeTab === "raid"}
					<div class="flex gap-2">
						<button
							class="flex-1 py-1 rounded-md text-xs font-medium {raidMode === 'level' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
							onclick={() => (raidMode = "level")}
						>
							{m.poracle_raid_by_level()}
						</button>
						<button
							class="flex-1 py-1 rounded-md text-xs font-medium {raidMode === 'boss' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
							onclick={() => (raidMode = "boss")}
						>
							{m.poracle_raid_by_boss()}
						</button>
					</div>
					{#if raidMode === "level"}
						<div class="flex gap-1 flex-wrap">
							{#each RAID_LEVELS as level}
								<button
									class="px-2 py-1 rounded text-xs font-medium {raidLevels.includes(level) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
									onclick={() => toggleRaidLevel(level)}
								>
									{RAID_LEVEL_LABELS[level]}
								</button>
							{/each}
						</div>
					{:else}
						<div class="relative">
							<input
								type="text"
								placeholder={m.poracle_search_pokemon()}
								bind:value={raidBossSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							{#if raidBoss}
								<p class="text-xs text-primary mt-1">
									{mPokemon(raidBoss)}
									<button class="ml-1 text-muted-foreground" onclick={() => { raidBoss = null; raidBossSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if raidBossSearchResults.length > 0 && !raidBoss}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each raidBossSearchResults as p (p.pokemon_id + "-" + p.form)}
										<button
											class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { raidBoss = p; raidBossSearch = ""; }}
										>
											<img src={resize(getIconPokemon(p), { width: 32 })} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<label class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</label>
						<input type="number" min="0" step="100" bind:value={raidDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
					</div>

				{:else if activeTab === "quest"}
					<select
						bind:value={questRewardType}
						class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{#each QUEST_REWARD_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
					{#if questRewardType === 7}
						<div class="relative">
							<input
								type="text"
								placeholder={m.poracle_search_pokemon()}
								bind:value={questPokemonSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
							{#if questPokemon}
								<p class="text-xs text-primary mt-1">
									{mPokemon(questPokemon)}
									<button class="ml-1 text-muted-foreground" onclick={() => { questPokemon = null; questPokemonSearch = ""; }}>×</button>
								</p>
							{/if}
							{#if questPokemonSearchResults.length > 0 && !questPokemon}
								<div class="absolute z-10 mt-0.5 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
									{#each questPokemonSearchResults as p (p.pokemon_id + "-" + p.form)}
										<button
											class="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
											onclick={() => { questPokemon = p; questPokemonSearch = ""; }}
										>
											<img src={resize(getIconPokemon(p), { width: 32 })} alt={mPokemon(p)} class="w-6 h-6" />
											{mPokemon(p)}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<label class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</label>
						<input type="number" min="0" step="100" bind:value={questDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
					</div>

				{:else if activeTab === "invasion"}
					{@const gruntTypes = getGruntTypes()}
					<div class="flex flex-col gap-1">
						<label class="text-xs text-muted-foreground">{m.poracle_grunt_type()}</label>
						<select
							bind:value={invasionGruntType}
							class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<option value="">{m.poracle_grunt_any()}</option>
							{#each gruntTypes as gt}
								<option value={gt}>{gt.charAt(0).toUpperCase() + gt.slice(1)}</option>
							{/each}
						</select>
					</div>
					<div class="flex items-center gap-2">
						<label class="text-xs text-muted-foreground w-16 shrink-0">{m.poracle_distance()}</label>
						<input type="number" min="0" step="100" bind:value={invasionDistance}
							class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
				<div class="flex flex-col gap-1 max-h-64 overflow-y-auto">
					{#each rules as rule (rule.uid)}
						<div class="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 bg-muted/50">
							<p class="text-sm text-foreground leading-snug flex-1 min-w-0 break-words">
								{rule.description || `Rule #${rule.uid}`}
							</p>
							<button
								class="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-0.5 mt-0.5"
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
