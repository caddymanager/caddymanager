<template>
    <div>
        <div class="bg-white rounded-lg shadow p-4 flex flex-col">
            <div class="flex items-start">
                <div class="flex-1">
                    <div class="text-sm text-gray-500 font-medium">{{ title }}</div>
                    <div v-if="loading" class="mt-4 flex items-center">
                        <loading-spinner-comp :size="spinnerSize" color="gradient" caption="Loading..." />
                    </div>
                    <div v-else class="mt-4 flex items-baseline space-x-3">
                        <div :class="valueClass">{{ formattedValue }}</div>

                        <div v-if="hasDelta" :class="deltaClass" class="text-sm font-medium px-2 py-1 rounded">
                            <span v-if="delta > 0">▲</span>
                            <span v-else-if="delta < 0">▼</span>
                            {{ Math.abs(delta) }}{{ deltaSuffix }}
                        </div>
                    </div>
                </div>

                <div v-if="sparklineData && sparklineData.length" class="w-28 h-10 ml-4 flex-shrink-0">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="w-full h-full">
                        <polyline :points="polylinePoints" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>
            </div>

            <div v-if="$slots.default" class="mt-3 text-xs text-gray-400">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'

/**
 * dashboardPanelNumberComp.vue
 *
 * Purpose: Reusable statistic panel that highlights a single numeric value and an optional delta and sparkline.
 *
 * Props / Data requirements (shape and notes):
 * - title: String (short label shown above the value)
 * - value: String|Number (displayed as primary metric)
 * - delta: Number (optional, positive or negative to indicate change)
 * - deltaSuffix: String (optional suffix for delta, e.g. "%")
 * - sparklineData: Array<Number> (optional small array of recent values for inline sparkline)
 * - loading: Boolean (shows loading spinner when true)
 * - size: String (optional: 'small'|'medium'|'large' controls text sizing)
 *
 * Error modes:
 * - If value is null/undefined, shows 'N/A'.
 * - If sparklineData contains non-numbers it will silently ignore them.
 */

const props = defineProps({
	title: { type: String, default: '' },
	value: { type: [String, Number], default: 'N/A' },
	delta: { type: Number, default: null },
	deltaSuffix: { type: String, default: '' },
	sparklineData: { type: Array, default: () => [] },
	loading: { type: Boolean, default: false },
	size: { type: String, default: 'medium', validator: v => ['small', 'medium', 'large'].includes(v) }
})

const spinnerSize = computed(() => (props.size === 'large' ? 'large' : props.size === 'small' ? 'small' : 'medium'))

const formattedValue = computed(() => (props.value === null || props.value === undefined ? 'N/A' : props.value))

const hasDelta = computed(() => props.delta !== null && props.delta !== undefined)

const valueClass = computed(() => {
	switch (props.size) {
		case 'small': return 'text-2xl font-semibold text-gray-800'
		case 'large': return 'text-4xl font-extrabold text-gray-800'
		default: return 'text-3xl font-bold text-gray-800'
	}
})

const deltaClass = computed(() => {
	if (!hasDelta.value) return ''
	return props.delta > 0 ? 'bg-green-100 text-green-700' : props.delta < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
})

// Simple sparkline conversion: normalize data to svg coords (0..100 x, 0..30 y)
const polylinePoints = computed(() => {
	const data = (props.sparklineData || []).filter(n => typeof n === 'number')
	if (!data.length) return ''
	const max = Math.max(...data)
	const min = Math.min(...data)
	const range = max - min || 1
	return data.map((v, i) => {
		const x = (i / (data.length - 1)) * 100
		const y = 30 - ((v - min) / range) * 30
		return `${x},${y}`
	}).join(' ')
})
</script>

<style scoped>
/* minor adjustments */
</style>

