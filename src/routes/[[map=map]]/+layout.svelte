<script lang="ts">
	import Toast from "@/components/ui/Toast.svelte";
	import { getIsToastOpen } from "@/lib/ui/toasts.svelte.js";
	import { getIsLoading, load } from "@/lib/services/initialLoad.svelte.js";
	import Loading from "@/components/ui/Loading.svelte";
	import { onMount } from "svelte";
	import Metadata from "@/components/utils/Metadata.svelte";
	import Modal from "@/components/ui/modal/Modal.svelte";
	import { getSelectOptions } from "@/lib/ui/modal.svelte";

	let { children } = $props();

	onMount(() => load().then());
</script>

<svelte:head>
	<Metadata />
</svelte:head>

<Modal modalType="select">
	<div
		style="width: min(calc(100vw - 1rem), 32rem);"
		class="py-4 px-3 flex flex-col gap-0.5 bg-popover text-popover-foreground border rounded-md"
	>
		{@render getSelectOptions()?.()}
	</div>
</Modal>

{#if getIsLoading()}
	<Loading />
{/if}

{#if getIsToastOpen()}
	<Toast />
{/if}

{@render children?.()}
