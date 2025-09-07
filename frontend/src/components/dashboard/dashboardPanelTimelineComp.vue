<template>
    <div>
    <div class="bg-white rounded-lg shadow p-4 timeline-root">
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500 font-medium">{{ title }}</div>
                <div v-if="loading"><loading-spinner-comp :size="spinnerSize" color="white" /></div>
            </div>

            <div v-if="loading" class="mt-4 text-gray-400">Loading events...</div>

                <div v-else>
                        <div v-if="events && events.length" class="mt-4 space-y-4" :style="scrollStyle">
                            <div v-for="(ev, idx) in events" :key="ev.id || idx" class="flex items-start">
                        <div class="flex-shrink-0 mt-1">
                            <div :class="['w-3 h-3 rounded-full', eventColor(ev.type)]"></div>
                            <div v-if="idx !== events.length - 1" class="w-px h-full bg-gray-200 mt-2" style="height: 48px;"></div>
                        </div>

                        <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-800 cursor-pointer" @click="$emit('select', ev)">{{ ev.title }}</div>
                                    <div class="text-xs text-gray-400">{{ formatDate(ev.timestamp) }}</div>
                                    <div v-if="ev.description" class="mt-1 text-sm text-gray-600">
                                                <div class="description-clamp">{{ truncate(ev.description, 200) }}</div>
                                                <button class="text-indigo-500 text-xs mt-1" @click.stop="$emit('select', ev)">View details</button>
                                            </div>
                        </div>
                    </div>
                </div>
                <div v-else class="mt-4 text-sm text-gray-400">No events to display</div>
            </div>

            <div v-if="$slots.default" class="mt-3 text-xs text-gray-400">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup>
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import { computed } from 'vue'

/**
 * dashboardPanelTimelineComp.vue
 *
 * Purpose: Vertical timeline/shoutbox for recent events, audit logs or activity feed.
 *
 * Props / Data requirements:
 * - title: String (panel heading)
 * - events: Array of objects: { timestamp: String|Number|Date, title: String, description?: String, type?: String }
 *   - timestamp should be ISO string or epoch; formatDate will attempt to display a friendly local string.
 *   - type can be used to change the event dot color (e.g., 'info', 'warning', 'error', 'success').
 * - loading: Boolean (show loading spinner)
 *
 * Error modes:
 * - Missing/invalid timestamp will render as-is.
 */

const props = defineProps({
    title: { type: String, default: '' },
    events: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    size: { type: String, default: 'medium' },
    maxHeight: { type: [String, Number], default: '320px' }
})

const spinnerSize = props.size === 'large' ? 'large' : props.size === 'small' ? 'small' : 'medium'

const scrollStyle = computed(() => ({
    maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
    overflowY: 'auto',
    overflowX: 'hidden'
}))

function truncate(text, n) {
    if (text === null || text === undefined) return ''
    if (typeof text !== 'string') {
        try { text = typeof text === 'object' ? JSON.stringify(text) : String(text) } catch (e) { text = String(text) }
    }
    if (text.length <= n) return text
    return text.slice(0, n) + '...'
}

// stringify helper kept if needed later
function stringify(text) {
    if (text === null || text === undefined) return ''
    if (typeof text === 'string') return text
    try { return typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text) } catch (e) { return String(text) }
}

function formatDate(ts) {
	if (!ts) return 'N/A'
	const d = new Date(ts)
	return isNaN(d) ? String(ts) : d.toLocaleString()
}

function eventColor(type) {
	switch (type) {
		case 'warning': return 'bg-yellow-400'
		case 'error': return 'bg-red-400'
		case 'success': return 'bg-green-400'
		default: return 'bg-indigo-500'
	}
}
</script>

<style scoped>
/* ensure the vertical connector aligns nicely */
.description-clamp {
    display: -webkit-box;
    display: box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    box-orient: vertical;
    overflow: hidden;
    /* ensure long words wrap and don't cause horizontal scroll */
    word-wrap: break-word;
    overflow-wrap: anywhere;
}
/* root guard to prevent panel-level horizontal overflow */
.timeline-root { overflow-x: hidden; }
</style>

