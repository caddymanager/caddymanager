<template>
<div>
	<div class="bg-white rounded-lg shadow p-4">
		<div class="flex items-center justify-between">
			<div class="text-sm text-gray-500 font-medium">{{ title }}</div>
			<div v-if="loading" class="pl-2">
				<loading-spinner-comp :size="spinnerSize" color="white" />
			</div>
		</div>

		<div v-if="loading" class="mt-4 text-gray-400">Loading...</div>
		<div v-else>
			<div v-if="items && items.length" class="mt-3 space-y-3">
				<div v-for="(it, idx) in items" :key="idx" class="flex items-start justify-between">
					<div class="flex-1">
						<div class="text-sm text-gray-700 font-medium">{{ it.label }}</div>
						<div v-if="it.meta" class="text-xs text-gray-400">{{ it.meta }}</div>
					</div>
					<div class="ml-4 text-right">
						<!-- support a preformatted HTML value (htmlValue) for colored badges; fallback to plain text value -->
						<div v-if="it.htmlValue" class="text-sm font-semibold" v-html="it.htmlValue"></div>
						<div v-else class="text-sm text-gray-800 font-semibold">{{ it.value }}</div>
					</div>
				</div>
			</div>
			<div v-else class="mt-4 text-sm text-gray-400">{{ emptyText }}</div>
		</div>

		<div v-if="$slots.default" class="mt-3 text-xs text-gray-400">
			<slot />
		</div>
	</div>
</div>
</template>

<script setup>
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

/**
 * dashboardPanelTextComp.vue
 *
 * Purpose: Generic key/value list panel for dashboard data such as top-line stats, recent items, or configuration fields.
 *
 * Props / Data requirements:
 * - title: String (panel title)
 * - items: Array of { label: String, value: String|Number, meta?: String }
 *   Example: [{ label: 'Active Servers', value: 12, meta: 'updated 2m ago' }]
 * - loading: Boolean (show spinner state)
 * - emptyText: String (message when items is empty)
 *
 * Error modes:
 * - If items is not an array or empty, shows emptyText.
 */

const props = defineProps({
	title: { type: String, default: '' },
	items: { type: Array, default: () => [] },
	loading: { type: Boolean, default: false },
	emptyText: { type: String, default: 'No items to show' },
	size: { type: String, default: 'medium' }
})

const spinnerSize = props.size === 'large' ? 'large' : props.size === 'small' ? 'small' : 'medium'
</script>

<style scoped>
/* nothing custom yet; Tailwind handles layout */
</style>

