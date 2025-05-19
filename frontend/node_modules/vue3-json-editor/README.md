# vue3-json-editor 

(fork vue-json-editor - credits original: [https://github.com/dirkliu/vue-json-editor](https://github.com/dirkliu/vue-json-editor))

A json editor of vue.js

# Support
* Module ESM: Yes
* Unpkg: Yes
* CommonJS: Yes

# How to run DEMO
```sh
# install
npm install

# for vue 3.x app
npm run dev

# for vite 3.x
npm run dev_vite
```

## Component properties

v-model：bind the [json object]  
:show-btns: boolean, show the save button, default: true  
:expandedOnStart: boolean, expand the JSON editor on start for the modes 'tree', 'view', and 'form', default: false  
:mode: string, default: tree  
:lang: string, default: en  
@json-change: on json changed  
@json-save: on json save  
@has-error: on error  

# How to use

## 1. Install using npm

```
npm install vue3-json-editor --save
```

## 2. Use vue-json-editor in the vue component

```vue
<template>
  <div>
    <p>vue-json-editor</p>
    <Vue3JsonEditor
      v-model="json"
      :show-btns="true"
      :expandedOnStart="true"
      @json-change="onJsonChange"
    />
  </div>
</template>

<script>
import { defineComponent, reactive, toRefs } from 'vue'
import { Vue3JsonEditor } from 'vue3-json-editor'

export default defineComponent({
  components: {
    Vue3JsonEditor
  },
  setup () {
    function onJsonChange (value) {
      console.log('value:', value)
    }

    const state = reactive({
      json: {}
    })

    return {
      ...toRefs(state),
      onJsonChange
    }
  }
})
</script>
```

## 3. Vue Vite Example

```vue
<template>
  <Vue3JsonEditor v-model="json" :show-btns="true" @json-change="onJsonChange"/>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue'
import { Vue3JsonEditor } from '../dist/vue3-json-editor.esm'

export default defineComponent({
  name: 'App',
  components: {
    Vue3JsonEditor
  },
  setup () {
    function onJsonChange () {
      //
    }

    const state = reactive({
      json: {}
    })

    return {
      ...toRefs(state),
      onJsonChange
    }
  }
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
```