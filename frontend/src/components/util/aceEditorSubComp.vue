<template>
  <!-- Simple Ace Editor container -->
  <div class="w-full h-full">
    <div ref="editor" class="w-full h-full"></div>
  </div>
</template>

<script setup>

import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/ext-language_tools'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/worker-json'
import 'ace-builds/src-noconflict/worker-yaml'

// Set worker paths for Ace (required for linting/autocomplete)
ace.config.set('basePath', '/node_modules/ace-builds/src-noconflict/')
ace.config.set('workerPath', '/node_modules/ace-builds/src-noconflict/')

// Props for basic editor configuration
const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'json', validator: v => ['yaml', 'json'].includes(v) },
  theme: { type: String, default: 'monokai' },
  readOnly: { type: Boolean, default: false },
  minLines: { type: Number, default: 8 },
  maxLines: { type: Number, default: 30 },
})

const emit = defineEmits(['update:modelValue', 'change'])
const editor = ref(null)
let aceEditor = null

onMounted(() => {
  aceEditor = ace.edit(editor.value)
  aceEditor.setTheme(`ace/theme/${props.theme}`)
  aceEditor.session.setMode(`ace/mode/${props.mode}`)
  aceEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    minLines: props.minLines,
    maxLines: props.maxLines,
    readOnly: props.readOnly,
  })
  aceEditor.setValue(props.modelValue || '', -1)
  aceEditor.$blockScrolling = Infinity // Suppress scrolling warning
  aceEditor.on('change', () => {
    const value = aceEditor.getValue()
    emit('update:modelValue', value)
    emit('change', value)
  })
})

// Sync external modelValue changes to Ace
watch(() => props.modelValue, (val) => {
  if (aceEditor && aceEditor.getValue() !== val) {
    aceEditor.setValue(val || '', -1)
  }
})
// Sync mode changes
watch(() => props.mode, (mode) => {
  if (aceEditor) aceEditor.session.setMode(`ace/mode/${mode}`)
})
// Sync theme changes
watch(() => props.theme, (theme) => {
  if (aceEditor) aceEditor.setTheme(`ace/theme/${theme}`)
})
// Sync readOnly changes
watch(() => props.readOnly, (ro) => {
  if (aceEditor) aceEditor.setReadOnly(ro)
})

onBeforeUnmount(() => {
  if (aceEditor) {
    aceEditor.destroy()
    aceEditor = null
  }
})
</script>

<style scoped>
</style>
