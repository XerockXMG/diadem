<script lang="ts">
	import Modal from "@/components/ui/modal/Modal.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { closeModal } from "@/lib/ui/modal.svelte.js";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte.js";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes.js";
	import { trackRule } from "@/lib/features/poracle.svelte.js";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import type { GymData } from "@/lib/types/mapObjectData/gym";
	import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
	import { mPokemon } from "@/lib/services/ingameLocale.js";

	type TrackTarget =
		| { kind: "pokemon"; pokemon_id: number; form: number; label: string }
		| { kind: "raid_boss"; pokemon_id: number; form: number; label: string }
		| { kind: "raid_level"; level: number; label: string }
		| { kind: "quest"; reward_type: number; reward: number; label: string }
		| { kind: "invasion"; label: string };

	let distance = $state(0);
	let submitting = $state(false);

	let target: TrackTarget | null = $derived.by(() => {
		const data = getCurrentSelectedData();
		if (!data) return null;

		if (data.type === MapObjectType.POKEMON) {
			const p = data as PokemonData;
			return {
				kind: "pokemon",
				pokemon_id: p.pokemon_id,
				form: p.form ?? 0,
				label: mPokemon(p)
			};
		}

		if (data.type === MapObjectType.GYM) {
			const g = data as GymData;
			const now = Date.now() / 1000;
			const hasActiveBoss =
				g.raid_pokemon_id && g.raid_end_timestamp && g.raid_end_timestamp > now;
			if (hasActiveBoss) {
				return {
					kind: "raid_boss",
					pokemon_id: g.raid_pokemon_id!,
					form: g.raid_pokemon_form ?? 0,
					label: mPokemon({ pokemon_id: g.raid_pokemon_id!, form: g.raid_pokemon_form })
				};
			}
			const hasActiveEgg =
				g.raid_level && g.raid_end_timestamp && g.raid_end_timestamp > now;
			if (hasActiveEgg) {
				return { kind: "raid_level", level: g.raid_level!, label: `Level ${g.raid_level}` };
			}
			return null;
		}

		if (data.type === MapObjectType.POKESTOP) {
			const ps = data as PokestopData;
			// Prefer quest, then invasion
			if (ps.quests && ps.quests.length > 0) {
				const quest = ps.quests[0];
				const reward = quest.reward;
				if (reward.type === 7) {
					return {
						kind: "quest",
						reward_type: 7,
						reward: (reward.info as any).pokemon_id ?? 0,
						label: mPokemon({ pokemon_id: (reward.info as any).pokemon_id })
					};
				}
				if (reward.type === 2) {
					return {
						kind: "quest",
						reward_type: 2,
						reward: (reward.info as any).item_id ?? 0,
						label: m.items()
					};
				}
				if (reward.type === 3) {
					return {
						kind: "quest",
						reward_type: 3,
						reward: 0,
						label: m.stardust()
					};
				}
				if (reward.type === 12) {
					return {
						kind: "quest",
						reward_type: 12,
						reward: (reward.info as any).pokemon_id ?? 0,
						label: m.mega_energy()
					};
				}
				if (reward.type === 4) {
					return {
						kind: "quest",
						reward_type: 4,
						reward: (reward.info as any).pokemon_id ?? 0,
						label: m.candy()
					};
				}
				return {
					kind: "quest",
					reward_type: reward.type,
					reward: 0,
					label: m.pogo_quest()
				};
			}
			if (ps.incident && ps.incident.length > 0) {
				return { kind: "invasion", label: m.pogo_invasion() };
			}
			return null;
		}

		return null;
	});

	function buildRule(): Record<string, unknown> | null {
		if (!target) return null;
		const base = { distance };
		switch (target.kind) {
			case "pokemon":
				return { ...base, pokemon_id: target.pokemon_id, form: target.form, min_iv: -1, max_iv: 100 };
			case "raid_boss":
				return { ...base, pokemon_id: target.pokemon_id, form: target.form };
			case "raid_level":
				return { ...base, level: target.level };
			case "quest":
				return { ...base, reward_type: target.reward_type, reward: target.reward };
			case "invasion":
				return { ...base, grunt_type: "" };
		}
	}

	function getTrackType(): "pokemon" | "raid" | "quest" | "invasion" | null {
		if (!target) return null;
		switch (target.kind) {
			case "pokemon": return "pokemon";
			case "raid_boss":
			case "raid_level": return "raid";
			case "quest": return "quest";
			case "invasion": return "invasion";
		}
	}

	async function submit() {
		const rule = buildRule();
		const type = getTrackType();
		if (!rule || !type) return;
		submitting = true;
		const result = await trackRule(type, rule);
		submitting = false;
		if (result.ok) {
			openToast(m.poracle_track_success());
			closeModal("poracleTrack");
		} else {
			openToast(m.poracle_track_error());
		}
	}

	function getModalTitle(): string {
		if (!target) return m.poracle_track();
		switch (target.kind) {
			case "pokemon": return m.poracle_track_pokemon();
			case "raid_boss":
			case "raid_level": return m.poracle_track_raid();
			case "quest": return m.poracle_track_quest();
			case "invasion": return m.poracle_track_invasion();
		}
	}
</script>

<Modal
	modalType="poracleTrack"
	class="w-[calc(100%-1rem)] max-w-sm flex flex-col pb-4 pt-3"
>
	{#snippet title()}
		<p class="pb-2 font-semibold text-base px-4">{getModalTitle()}</p>
	{/snippet}

	<div class="px-4 flex flex-col gap-4">
		{#if target}
			<p class="text-muted-foreground text-sm">
				{#if target.kind === "pokemon"}
					{m.poracle_track_pokemon()}: <strong>{target.label}</strong>
				{:else if target.kind === "raid_boss"}
					{m.poracle_track_raid()}: <strong>{target.label}</strong>
				{:else if target.kind === "raid_level"}
					{m.poracle_track_raid()}: <strong>{target.label}</strong>
				{:else if target.kind === "quest"}
					{m.poracle_track_quest()}: <strong>{target.label}</strong>
				{:else if target.kind === "invasion"}
					{m.poracle_track_invasion()}: <strong>{m.any()}</strong>
				{/if}
			</p>

			<div class="flex flex-col gap-1">
				<label class="text-sm font-medium" for="poracle-distance">
					{m.poracle_distance()}
				</label>
				<input
					id="poracle-distance"
					type="number"
					min="0"
					step="100"
					bind:value={distance}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
				<p class="text-xs text-muted-foreground">{m.poracle_distance_hint()}</p>
			</div>

			<Button onclick={submit} disabled={submitting} class="w-full">
				{submitting ? m.poracle_loading() : m.poracle_track()}
			</Button>
		{:else}
			<p class="text-muted-foreground text-sm">{m.poracle_nothing_to_track()}</p>
		{/if}
	</div>
</Modal>
