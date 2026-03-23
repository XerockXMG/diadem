<script lang="ts">
	import Metadata from "@/components/utils/Metadata.svelte";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { browser } from "$app/environment";
	import type { PageProps } from "./$types";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { type MapData } from "@/lib/mapObjects/mapObjectTypes";
	import { getConfig } from "@/lib/services/config/config";

	let { data }: PageProps = $props();

	let title: string = $derived(getShareTitle(data as MapData));
</script>

{#if !browser && data}
	<Metadata
		title={title}
		image={getConfig().general.url + `/${data.type}/${data.id}/thumbnail.png`}
	/>
{/if}

<RedirectFlash goal={title} />
