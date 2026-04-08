<script lang="ts">
	import { isPopupExpanded, togglePopupExpanded } from "@/lib/ui/expandedPopups.js";
	import { Bell, Eye, EyeClosed, Navigation, Share2 } from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";

	import { getCurrentPath } from "@/lib/mapObjects/interact";
	import { backupShareUrl, canBackupShare } from "@/lib/utils/device";
	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { getLocale } from "@/lib/paraglide/runtime";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures.js";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes.js";
	import { openModal } from "@/lib/ui/modal.svelte.js";
	import { getConfig } from "@/lib/services/config/config.js";
	import type { GymData } from "@/lib/types/mapObjectData/gym";
	import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";

	let {
		lat,
		lon
	}: {
		lat: number;
		lon: number;
	} = $props();

	function getShareUrl() {
		return window.location.origin + getCurrentPath() + "?lang=" + getLocale();
	}

	function showPoracleButton(): boolean {
		if (!isSupportedFeature("poracle")) return false;
		if (!getConfig().tools.poracle) return false;
		if (!getUserDetails().details) return false;
		const data = getCurrentSelectedData();
		if (!data) return false;
		if (data.type === MapObjectType.POKEMON) return true;
		if (data.type === MapObjectType.GYM) {
			const g = data as GymData;
			const now = Date.now() / 1000;
			return !!(g.raid_end_timestamp && g.raid_end_timestamp > now);
		}
		if (data.type === MapObjectType.POKESTOP) {
			const ps = data as PokestopData;
			return (ps.quests?.length > 0) || (ps.incident?.length > 0);
		}
		return false;
	}
</script>

<div class="flex flex-wrap px-4 gap-1.5 mt-4">
	<Button size="default" onclick={() => togglePopupExpanded(getCurrentSelectedData()?.type)}>
		{#if isPopupExpanded(getCurrentSelectedData()?.type)}
			<EyeClosed size="18" />
			<span class="@max-[304px]:hidden">
				{m.popup_hide_details()}
			</span>
		{:else}
			<Eye size="18" />
			<span class="@max-[304px]:hidden">
				{m.popup_show_details()}
			</span>
		{/if}
	</Button>
	<Button
		size="default"
		variant="outline"
		tag="a"
		href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
		target="_blank"
	>
		<Navigation size="18" />
		<span class="@max-[364px]:hidden">
			{m.popup_navigate()}
		</span>
	</Button>

	{#if canBackupShare({ url: getShareUrl() })}
		<Button variant="outline" tag="button" onclick={() => backupShareUrl(getShareUrl())}>
			<Share2 size="18" />
			<span class="@max-[406px]:hidden">
				{m.popup_share()}
			</span>
		</Button>
	{/if}

	{#if showPoracleButton()}
		<Button variant="outline" tag="button" onclick={() => openModal("poracleTrack")}>
			<Bell size="18" />
			<span class="@max-[448px]:hidden">
				{m.poracle_track()}
			</span>
		</Button>
	{/if}
</div>
