<template>
  <div class="h-full">
    <div class="flex flex-col gap-6 h-full">
      <!-- Configuration View Panel -->
      <div class="bg-white rounded-lg shadow border-none flex-1">
        <div class="bg-gray-50 border-b border-gray-100 p-4">
          <h5 class="m-0 font-semibold flex items-center justify-between">
            <div class="flex items-center">
              <CodeBracketIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
              Configuration Content
            </div>
            <div class="flex items-center space-x-2">
              <!-- Edit mode view toggle -->
              <div class="flex border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="editMode === 'editor' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="editMode = 'editor'"
                >
                  <CodeBracketSquareIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  JSON Editor
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="editMode === 'ace' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="editMode = 'ace'"
                >
                  <CodeBracketIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Raw JSON (Ace)
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="editMode === 'template' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="editMode = 'template'"
                >
                  <ClipboardDocumentIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Templates
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="editMode === 'caddyfile' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="editMode = 'caddyfile'"
                >
                  <DocumentTextIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Caddyfile
                </button>
              </div>
            </div>
          </h5>
        </div>
        
        <!-- Edit mode content -->
        <div class="p-4 border-none h-full">
          <div v-if="formError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">
            {{ formError }}
          </div>

          <!-- Duplicate entry warnings -->
          <div v-if="duplicateEntries.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-yellow-800">
            <div class="flex items-start">
              <ExclamationTriangleIcon class="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
              <div>
                <h4 class="text-sm font-medium">Potential duplicate entries detected:</h4>
                <ul class="mt-1 text-xs list-disc list-inside pl-1">
                  <li v-for="(dupe, index) in duplicateEntries" :key="index">
                    {{ dupe.message }}
                  </li>
                </ul>
                <p class="mt-1 text-xs">These entries may cause conflicts but won't prevent saving.</p>
              </div>
            </div>
          </div>

          <!-- JSON Editor Mode -->
          <div v-if="editMode === 'editor'" class="mb-4">
            <label for="jsonEditor" class="block text-sm font-medium text-tertiary mb-2">Create JSON Configuration</label>
            <div class="relative border border-gray-300 rounded-md overflow-hidden">
              <!-- Vue3 JSON Editor Component -->
              <div class="h-[500px] overflow-auto">
                <vue3-json-editor
                  v-model="jsonEditorContent"
                  :expandedOnStart="true"
                  @json-change="onJsonChange"
                  @has-error="onJsonError"
                />
              </div>
              <div v-if="jsonValidationError" class="bg-red-50 border-t border-red-200 p-2 text-xs text-red-700">
                {{ jsonValidationError }}
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Edit the JSON configuration directly. Changes will be saved when you click "Create Configuration".
            </p>
          </div>

          <!-- Ace Editor Mode -->
          <div v-if="editMode === 'ace'" class="mb-4">
            <label class="block text-sm font-medium text-tertiary mb-2">Raw JSON (Ace Editor)</label>
            <ace-editor-sub-comp
              :modelValue="aceEditorContent"
              @update:modelValue="onAceEditorInput"
              mode="json"
              theme="monokai"
              :minLines="12"
              :maxLines="40"
              :readOnly="false"
            />
            <div v-if="aceJsonError" class="bg-red-50 border-t border-red-200 p-2 text-xs text-red-700">
              {{ aceJsonError }}
            </div>
            <p class="mt-1 text-xs text-gray-500">
              Edit the raw JSON directly. Changes will be synced to the main configuration.
            </p>
          </div>
          
          <!-- Template Mode -->
          <div v-if="editMode === 'template'" class="mb-4">
            <label class="block text-sm font-medium text-tertiary mb-2">Create Configuration Using Template</label>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <!-- Template Cards Generated Dynamically -->
              <div v-for="template in availableTemplates" :key="template.id"
                class="border border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                :class="{'border-primary ring-2 ring-primary': selectedTemplate === template.id}"
                @click="selectTemplate(template.id)"
              >
                <div class="flex items-center mb-2">
                  <component :is="getIconComponent(template.icon)" class="h-5 w-5 text-tertiary mr-2" />
                  <h3 class="text-md font-semibold">{{ template.name }}</h3>
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ template.description }}</p>
                <div class="flex justify-between">
                  <span class="text-xs text-gray-500 capitalize">{{ template.complexity }}</span>
                  <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                    :class="{
                      'bg-blue-50 text-blue-700': template.category === 'http',
                      'bg-green-50 text-green-700': template.category === 'proxy',
                      'bg-purple-50 text-purple-700': template.category === 'api',
                      'bg-yellow-50 text-yellow-700': template.category === 'loadBalancing',
                      'bg-blue-50 text-blue-700': template.category === 'static',
                      'bg-gray-50 text-tertiary': template.category === 'empty'
                    }"
                  >
                    {{ template.category.charAt(0).toUpperCase() + template.category.slice(1) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Preview of selected template -->
            <div v-if="selectedTemplate" class="mt-4">
              <h3 class="text-md font-semibold mb-2">Template Preview</h3>
              <div class="border border-gray-300 rounded-md bg-gray-50 p-4 overflow-auto max-h-[400px]">
                <VueJsonPretty
                  :data="templatePreview"
                  :deep="3"
                  :show-double-quotes="true"
                  :show-line="true"
                />
              </div>
              
              <div class="flex justify-end gap-2 mt-4">
                <button 
                  @click="showTemplateCustomizationModal = true"
                  class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                  v-if="selectedTemplate && hasCustomizableForm(selectedTemplate)"
                >
                  <PencilIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                  Customize Template
                </button>
                
                <button 
                  @click="addSelectedTemplate"
                  class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  :disabled="isAddingTemplate"
                >
                  <span v-if="isAddingTemplate" class="mr-2">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  <PlusIcon class="h-4 w-4 mr-1" aria-hidden="true" v-else />
                  Use This Template
                </button>
              </div>
            </div>
          </div>

          <!-- Caddyfile Mode -->
          <div v-if="editMode === 'caddyfile'" class="mb-4">
            <div class="flex flex-col gap-4">
              <div>
                <label for="caddyfileEditor" class="block text-sm font-medium text-tertiary mb-2">Create Caddyfile Configuration</label>
                <div class="relative border border-gray-300 rounded-md overflow-hidden">
                  <textarea
                    id="caddyfileEditor"
                    v-model="caddyfileContent"
                    class="w-full p-3 font-mono text-sm h-[500px] resize-none bg-[#1e1e1e] text-white"
                    placeholder="# Enter your Caddyfile configuration here
# Example:
example.com {
    root * /var/www/html
    file_server
}"
                    @input="updateCaddyfile"
                  ></textarea>
                </div>
                <div v-if="caddyfileValidationError" 
                     class="mt-2 p-3 rounded-lg text-sm"
                     :class="caddyfileValidationError.startsWith('Warning') ? 
                             'bg-yellow-50 border border-yellow-200 text-yellow-700' : 
                             'bg-red-50 border border-red-200 text-red-700'">
                  <div class="flex">
                    <div v-if="caddyfileValidationError.startsWith('Warning')" class="mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div v-else class="mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div v-html="caddyfileValidationError.replace(/\n/g, '<br>')"></div>
                  </div>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                  <p class="mb-1"><span class="font-medium">Note:</span> The conversion process has some limitations:</p>
                  <ul class="list-disc pl-5 space-y-1">
                    <li>Environment variables (like {env.VAR}) are preserved during conversion but require proper setup on the target server</li>
                    <li>Custom modules need to be installed on the target Caddy server</li>
                    <li>Import statements may not work if the imported files are inaccessible</li>
                  </ul>
                </div>
              </div>

              <div class="flex justify-between mt-4">
                <div class="flex items-center space-x-3">
                  <button 
                    @click="loadExampleCaddyfile"
                    class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                    title="Load an example Caddyfile"
                  >
                    <DocumentIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                    Load Example
                  </button>
                  
                  <div>
                    <label for="serverSelect" class="sr-only">Select Caddy Server</label>
                    <SelectFieldComp
                      id="serverSelect"
                      v-model="selectedServerId"
                      :options="[{ value: '', label: 'Default Sandbox' }, ...(servers.map(s => ({ value: s._id, label: s.name })))]"
                      extraClass="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                
                <button 
                  @click="convertCaddyfileToJson"
                  class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  :disabled="isConverting"
                >
                  <span v-if="isConverting" class="mr-2">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  Convert & Preview
                </button>
              </div>

              <!-- Conversion Result Preview -->
              <div v-if="conversionResult" class="mt-4">
                <h3 class="text-md font-semibold mb-2">Conversion Result (Preview)</h3>
                <div class="border border-gray-300 rounded-md bg-gray-50 p-4 overflow-auto max-h-[300px]">
                  <VueJsonPretty
                    :data="conversionResult"
                    :deep="25"
                    :show-double-quotes="true"
                    :show-line="true"
                  />
                </div>
                
                <div class="flex justify-end mt-4">
                  <button 
                    @click="useConversionResult"
                    class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none"
                  >
                    <PlusIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                    Add to Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between mt-6 pt-4 border-t border-gray-200">
            <div class="flex space-x-2">
              <button 
                @click="checkForDuplicates"
                class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
              >
                <MagnifyingGlassIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                Check for Duplicates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Add Reverse Proxy Modal -->
  <modal-form-comp
    v-model="showReverseProxyModal"
    title="Add Reverse Proxy Site"
    size="lg"
    submit-text="Add to Configuration"
    :is-submit-disabled="!isReverseProxyFormValid"
    @submit="addReverseProxySite"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-500 mb-4">
        Add a new reverse proxy configuration to route traffic from a domain to your backend services.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col mb-2">
          <InputFieldComp
            v-model="proxyForm.hostname"
            label="Hostname"
            placeholder="example.com"
            extraClass="text-gray-900 placeholder:text-gray-300 text-tertiary block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <p class="mt-1 text-xs text-gray-500">The domain name for this proxy.</p>
        </div>
        <div class="flex flex-col mb-2">
          <InputFieldComp
            v-model="proxyForm.listen"
            label="Listen Address"
            placeholder=":80"
            extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <p class="mt-1 text-xs text-gray-500">Port to listen on, e.g. :80 or :443</p>
        </div>
      </div>
      
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="block text-sm font-medium text-tertiary">Backend Targets</label>
          <button 
            type="button"
            class="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-white hover:bg-secondary-dark focus:outline-none"
            @click="addBackendTarget"
          >
            <PlusIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Add Target
          </button>
        </div>
        
        <div v-for="(target, index) in proxyForm.targets" :key="index" class="flex items-center gap-2 mb-2">
          <InputFieldComp
            v-model="target.dial"
            placeholder="localhost:8080"
            extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <button 
            type="button"
            class="inline-flex items-center p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none"
            @click="removeBackendTarget(index)"
          >
            <TrashIcon class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p class="mt-1 text-xs text-gray-500">Servers that will receive proxied requests.</p>
      </div>
      
      <div class="border-t border-gray-200 pt-4">
        <h3 class="text-sm font-medium text-tertiary mb-2">Additional Options</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col mb-2">
            <InputFieldComp
              v-model="proxyForm.pathPrefix"
              label="Path Prefix (optional)"
              placeholder="/api/*"
              extraClass="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p class="mt-1 text-xs text-gray-500">Limit proxy to a specific path.</p>
          </div>
          
          <div class="flex flex-col mb-2">
            <SelectFieldComp
              v-model="proxyForm.lbPolicy"
              :options="[
                { value: '', label: 'Default (random)' },
                { value: 'round_robin', label: 'Round Robin' },
                { value: 'least_conn', label: 'Least Connections' },
                { value: 'ip_hash', label: 'IP Hash' }
              ]"
              label="Load Balancing Policy"
              extraClass="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        <div class="mt-4">
          <CheckboxFieldComp v-model="proxyForm.enableTls">Enable TLS (HTTPS)</CheckboxFieldComp>
        </div>
      </div>
    </div>
  </modal-form-comp>
  
  <!-- Template Customization Modal -->
  <modal-form-comp
    v-model="showTemplateCustomizationModal"
    :title="`Customize ${selectedTemplate ? templateService.getTemplateById(selectedTemplate)?.name : ''} Template`"
    size="lg"
    submit-text="Apply Customization"
    @submit="applyAndUseCustomizedTemplate"
  >
    <!-- Dynamic Form Based on Selected Template -->
    <div v-if="selectedTemplate && templateService.getTemplateById(selectedTemplate)" class="space-y-4">
      <template v-for="(section, sectionIndex) in templateService.getTemplateById(selectedTemplate).form.sections" :key="sectionIndex">
        <div class="border-b border-gray-200 pb-4 mb-4" v-if="section.title">
          <h3 class="text-lg font-medium text-tertiary">{{ section.title }}</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <template v-for="(field, fieldIndex) in section.fields" :key="fieldIndex">
            <!-- Only show field if it has no conditional, or its conditional evaluates to true -->
            <div v-if="!field.conditional || templateCustomization[field.conditional.field] === field.conditional.value" 
                class="flex flex-col mb-2"
                :class="{'md:col-span-2': field.type === 'textarea'}">
              <label class="block text-sm font-medium text-tertiary mb-1">{{ field.label }}</label>
              
              <!-- Text Input -->
              <input v-if="field.type === 'text'" 
                v-model="templateCustomization[field.id]" 
                type="text" 
                :placeholder="field.placeholder"
                class="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                :required="field.required"
              />
              
              <!-- Textarea -->
              <textarea v-if="field.type === 'textarea'" 
                v-model="templateCustomization[field.id]" 
                :placeholder="field.placeholder"
                rows="3"
                class="text-gray-900 placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
                :required="field.required"
              ></textarea>
              
              <!-- Select Dropdown -->
              <select v-if="field.type === 'select'" 
                v-model="templateCustomization[field.id]"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                :required="field.required"
              >
                <option v-for="option in field.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              
              <!-- Toggle -->
              <div v-if="field.type === 'toggle'" class="flex items-center">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="templateCustomization[field.id]" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-dark"></div>
                  <span class="ml-3 text-sm font-medium text-tertiary">{{ field.label }}</span>
                </label>
              </div>
              
              <!-- Description if available -->
              <p v-if="field.description" class="mt-1 text-xs text-gray-500">{{ field.description }}</p>
            </div>
          </template>
        </div>
      </template>
    </div>
  </modal-form-comp>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import aceEditorSubComp from '@/components/util/aceEditorSubComp.vue'
import InputFieldComp from '@/components/util/inputFieldComp.vue'
import SelectFieldComp from '@/components/util/selectFieldComp.vue'
import CheckboxFieldComp from '@/components/util/checkboxFieldComp.vue'
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { RouterLink, useRouter } from 'vue-router'
import { Vue3JsonEditor } from 'vue3-json-editor'
import apiService from '@/services/apiService'
import templateService from '@/services/templateService'
import ModalFormComp from '@/components/modals/modalFormComp.vue'
import LoadingSpinnerComp from '@/components/util/loadingSpinnerComp.vue'
import { useNotification } from "@kyvg/vue3-notification"
import { 
  ArrowPathIcon, 
  CodeBracketIcon,
  CodeBracketSquareIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ServerIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  FolderIcon,
  InformationCircleIcon,
  TableCellsIcon,
  ClipboardDocumentIcon,
  ArrowsRightLeftIcon,
  CircleStackIcon,
  ServerStackIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  DocumentPlusIcon
} from '@heroicons/vue/24/outline'


const emit = defineEmits(['json-content-updated', 'json-validation'])

const router = useRouter()
const configsStore = useCaddyConfigsStore()
const serversStore = useCaddyServersStore()
const servers = computed(() => serversStore.servers)

// Edit mode toggle
const editMode = ref('editor')

// Form-related refs for editing JSON
const formError = ref(null)
const jsonEditorContent = ref({
  // Default empty JSON structure for a new Caddy config
  apps: {
    http: {
      servers: {
        myserver: {
          listen: [":80"],
          routes: []
        }
      }
    }
  }
})
const jsonValidationError = ref(null)

// Ace Editor state (must be after jsonEditorContent and editMode)
const aceEditorContent = ref('')
const aceJsonError = ref(null)

// Sync Ace editor with JSON editor
watch([jsonEditorContent, editMode], ([val, mode]) => {
  if (mode === 'ace') {
    aceEditorContent.value = JSON.stringify(val, null, 2)
  }
})

function onAceEditorInput(val) {
  aceEditorContent.value = val
  if (editMode.value === 'ace') {
    try {
      const parsed = JSON.parse(val)
      jsonEditorContent.value = parsed
      emit('json-content-updated', parsed)
      aceJsonError.value = null
    } catch (e) {
      aceJsonError.value = 'Invalid JSON: ' + e.message
    }
  }
}

// Handle JSON changes from the editor
function onJsonChange(value) {
  jsonValidationError.value = null
  
  // Store the updated JSON in our local state
  jsonEditorContent.value = value
  
  // Emit the JSON content and validation status to the parent component
  emit('json-content-updated', value)
  emit('json-validation', true)
}

// Handle JSON errors from the editor
function onJsonError(error) {
  jsonValidationError.value = error ? `JSON Error: ${error.message || 'Invalid JSON'}` : null
  // Also emit validation status to parent
  emit('json-validation', !error)
}

onMounted(async () => {
  // Fetch servers for the dropdown
  if (serversStore.servers.length === 0) {
    await serversStore.fetchServers()
  }
})

// Template-related state and methods
const selectedTemplate = ref(null)
const templatePreview = ref({})
const showTemplateCustomizationModal = ref(false)
const templateCustomization = ref({
  host: 'example.com',
  listen: ':80',
  upstreams: 'localhost:8080',
  pathPrefix: '',
  loadBalancing: '',
  apiDomain: 'api.example.com',
  services: '/auth/*=auth-service:3000\n/users/*=user-service:4000\n/products/*=product-service:5000',
  enableJwt: false
})
const isAddingTemplate = ref(false)

// Get all available templates from the service
const availableTemplates = computed(() => {
  return templateService.getAllTemplates();
})

function selectTemplate(templateId) {
  selectedTemplate.value = templateId
  const template = templateService.getTemplateById(templateId)
  
  if (template) {
    templatePreview.value = template.config
    
    // Reset template customization with default values from form fields
    const customizationDefaults = {}
    
    // Process each section and field to gather default values
    if (template.form && template.form.sections) {
      template.form.sections.forEach(section => {
        if (section.fields) {
          section.fields.forEach(field => {
            // Use the placeholder as default value or empty string/false based on field type
            if (field.type === 'toggle') {
              customizationDefaults[field.id] = false
            } else if (field.type === 'select') {
              // Use the first option value or empty string
              customizationDefaults[field.id] = field.options && field.options.length > 0 
                ? field.options[0].value 
                : ''
            } else {
              customizationDefaults[field.id] = field.placeholder || ''
            }
          })
        }
      })
    }
    
    templateCustomization.value = customizationDefaults
  } else {
    templatePreview.value = {}
  }
}

function getIconComponent(iconName) {
  const icons = {
    'GlobeAltIcon': GlobeAltIcon,
    'ArrowsRightLeftIcon': ArrowsRightLeftIcon,
    'CircleStackIcon': CircleStackIcon,
    'ServerStackIcon': ServerStackIcon,
    'DocumentIcon': DocumentIcon,
    'DocumentPlusIcon': DocumentPlusIcon
  }
  
  return icons[iconName] || DocumentIcon
}

function addSelectedTemplate() {
  if (!selectedTemplate.value) return

  isAddingTemplate.value = true

  try {
    // Start with the current configuration
    const currentConfig = JSON.parse(JSON.stringify(jsonEditorContent.value))
    
    // Get the template configuration
    const template = templateService.getTemplateById(selectedTemplate.value)
    if (!template) {
      throw new Error('Template not found')
    }
    
    const templateConfig = JSON.parse(JSON.stringify(template.config))
    
    // Deep merge the template into the current config
    const mergedConfig = deepMergeConfigs(currentConfig, templateConfig)
    
    // Update the editor content with the merged configuration
    jsonEditorContent.value = mergedConfig
    
    // Emit the updated content to the parent component
    emit('json-content-updated', mergedConfig)
    emit('json-validation', true)
    
    // Show success message
    formError.value = null
    const { notify } = useNotification()
    notify({
      title: "Template Added",
      text: `Successfully added ${template.name} template to your configuration`,
      type: "success",
      duration: 3000
    })
    
    // Switch to editor mode to show the changes
    editMode.value = 'editor'
  } catch (err) {
    console.error('Error adding template:', err)
    formError.value = `Failed to add template: ${err.message}`
  } finally {
    isAddingTemplate.value = false
  }
}

// Helper function to deep merge two configuration objects
function deepMergeConfigs(target, source) {
  // Create a deep copy of the target to avoid mutating the original
  const output = JSON.parse(JSON.stringify(target));
  
  // Handle the case where either input is not an object
  if (!isObject(target) || !isObject(source)) {
    return source;
  }
  
  // Iterate through source object's properties
  Object.keys(source).forEach(key => {
    // Special handling for arrays
    if (Array.isArray(source[key])) {
      if (key === 'routes' && Array.isArray(output[key])) {
        // For routes arrays, concatenate them instead of replacing
        output[key] = [...output[key], ...source[key]];
      } else if (key === 'listen' && Array.isArray(output[key])) {
        // For listen arrays, merge without duplicates
        const combined = new Set([...output[key], ...source[key]]);
        output[key] = Array.from(combined);
      } else {
        // For other arrays, replace or add them
        output[key] = JSON.parse(JSON.stringify(source[key]));
      }
    } 
    // Check if the property exists in target and both values are objects
    else if (isObject(source[key]) && key in target && isObject(target[key])) {
      // Recursively merge nested objects
      output[key] = deepMergeConfigs(target[key], source[key]);
    } else {
      // For non-object values, or keys not in target, just copy the value
      output[key] = JSON.parse(JSON.stringify(source[key]));
    }
  });
  
  return output;
}

// Helper function to check if a value is an object
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// Function to detect potential configuration overwrites
function detectConfigurationOverwrites(currentConfig, newConfig) {
  const overwrites = [];
  
  // Check for HTTP server overwrites
  if (currentConfig?.apps?.http?.servers && newConfig?.apps?.http?.servers) {
    const currentServers = currentConfig.apps.http.servers;
    const newServers = newConfig.apps.http.servers;
    
    // Check each server in the new config
    for (const [serverName, serverConfig] of Object.entries(newServers)) {
      if (serverName in currentServers) {
        overwrites.push({
          type: 'server',
          name: serverName,
          message: `Server configuration '${serverName}' will be merged`
        });
        
        // Check for routes that might be overwritten
        if (serverConfig.routes && currentServers[serverName].routes) {
          // Look for potentially overlapping routes (same hosts/paths)
          const currentHosts = new Set();
          currentServers[serverName].routes.forEach(route => {
            if (route.match) {
              route.match.forEach(matcher => {
                if (matcher.host) {
                  matcher.host.forEach(host => currentHosts.add(host));
                }
              });
            }
          });
          
          serverConfig.routes.forEach(route => {
            if (route.match) {
              route.match.forEach(matcher => {
                if (matcher.host) {
                  matcher.host.forEach(host => {
                    if (currentHosts.has(host)) {
                      overwrites.push({
                        type: 'route',
                        name: host,
                        message: `Route for host '${host}' may be modified`
                      });
                    }
                  });
                }
              });
            }
          });
        }
      }
    }
  }
  
  // Check for admin config overwrites
  if (currentConfig?.admin && newConfig?.admin) {
    overwrites.push({
      type: 'admin',
      name: 'admin',
      message: 'Admin configuration will be updated'
    });
  }
  
  return overwrites;
}

// Caddyfile-related state and methods
const caddyfileContent = ref('')
const caddyfileValidationError = ref(null)
const isConverting = ref(false)
const conversionResult = ref(null)
const selectedServerId = ref('') // Add selected server ID state

function updateCaddyfile() {
  caddyfileValidationError.value = null
}

async function convertCaddyfileToJson() {
  if (!caddyfileContent.value.trim()) {
    caddyfileValidationError.value = 'Please enter Caddyfile content before converting'
    return
  }

  isConverting.value = true
  caddyfileValidationError.value = null

  try {
    // Build the URL with query parameters if a server is selected
    let url = '/convert/caddyfile-to-json'
    if (selectedServerId.value) {
      url += `?serverId=${encodeURIComponent(selectedServerId.value)}`
    }

    const response = await apiService.post(
      url, 
      caddyfileContent.value,
      { 
        headers: { 'Content-Type': 'text/plain' }
      }
    )
    
    if (response.data && response.data.success) {
      // Store the full response including warnings and result
      conversionResult.value = response.data.json
      
      // Show warnings if there are any
      if (response.data.json.warnings && response.data.json.warnings.length) {
        // Format warning objects into readable strings
        const warningMessages = response.data.json.warnings.map(warning => {
          if (typeof warning === 'object') {
            return `${warning.message || ''} ${warning.file ? `(in ${warning.file}` : ''}${warning.line ? ` line ${warning.line}` : ''}${warning.file ? ')' : ''}`;
          }
          return warning.toString();
        });
        
        // We don't treat warnings as errors, but display them in the UI
        caddyfileValidationError.value = `Warning: ${warningMessages.join('. ')}`;
        console.log('Caddyfile conversion warnings:', response.data.json.warnings);
      }
    } else {
      throw new Error(response.data?.error || 'Conversion failed')
    }
  } catch (error) {
    console.error('Error converting Caddyfile:', error)
    
    // Extract the specific error message from the response if available
    let errorMessage = error.message || 'Unknown error'
    
    // Check for specific API error formats
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
      
      // Provide more user-friendly messages for common errors
      if (errorMessage.includes('module not registered')) {
        // Extract module name
        const moduleMatch = errorMessage.match(/module not registered: ([^,]+)/)
        const moduleName = moduleMatch ? moduleMatch[1] : 'unknown module'
        
        errorMessage = `The Caddy server does not have the required module: ${moduleName}. 
                        This often happens with DNS providers or other plugins that need to be 
                        compiled into Caddy. The server may need a custom build with this module included.`
      } else if (errorMessage.includes('env.')) {
        // Modified approach to environment variables
        errorMessage = `Warning: Environment variables (like {env.VARIABLE}) were detected in your Caddyfile. 
                       During conversion, these cannot be resolved, but they will work when deployed to the Caddy server 
                       if the environment variables are properly set there. You can continue with the conversion, 
                       but be aware that these placeholders will remain in the converted configuration.`
      } else if (errorMessage.includes('import')) {
        errorMessage = `Import statements may not work during conversion if the imported files 
                       are not accessible to the Caddy server.`
      }
    }
    
    // For environment variable warnings, we want to allow continuing with the conversion
    if (errorMessage.includes('Warning: Environment variables')) {
      caddyfileValidationError.value = errorMessage;
      // Try to extract any JSON from the response that might still be usable
      if (error.response?.data?.json) {
        conversionResult.value = error.response.data.json;
      }
    } else {
      caddyfileValidationError.value = `Conversion error: ${errorMessage}`;
    }
  } finally {
    isConverting.value = false
  }
}

function loadExampleCaddyfile() {
  caddyfileContent.value = `example.com {
    root * /var/www/html
    file_server
  }`
}

function useConversionResult() {
  if (!conversionResult.value) return;
  
  try {
    // Start with the current configuration
    const currentConfig = JSON.parse(JSON.stringify(jsonEditorContent.value));
    
    // Unwrap the JSON if it's nested in a 'result' property
    let caddyfileConfig = conversionResult.value;
    
    // Check if the response contains a 'result' property
    if (conversionResult.value.result && typeof conversionResult.value.result === 'object') {
      caddyfileConfig = conversionResult.value.result;
    }
    
    // Detect potential overwrites before merging
    const overwrites = detectConfigurationOverwrites(currentConfig, caddyfileConfig);
    
    // Deep merge the converted Caddyfile into the current config
    const mergedConfig = deepMergeConfigs(currentConfig, caddyfileConfig);
    
    // Update the editor content with the merged configuration
    jsonEditorContent.value = mergedConfig;
    
    // Emit the updated content to the parent component
    emit('json-content-updated', mergedConfig);
    emit('json-validation', true);
    
    // Reset conversion result and switch to editor mode
    conversionResult.value = null;
    editMode.value = 'editor';
    
    // Show message about overwrites if any were detected
    if (overwrites.length > 0) {
      formError.value = null;
      // Use notification system to show warnings about overwrites
      const { notify } = useNotification();
      notify({
        title: "Configuration Merged with Overwrites",
        text: `${overwrites.length} server configurations were merged. Some settings may have been overwritten.`,
        type: "warn",
        duration: 5000
      });
    } else {
      // Show success message
      const { notify } = useNotification();
      notify({
        title: "Caddyfile Conversion Applied",
        text: "Successfully converted and added Caddyfile configuration",
        type: "success",
        duration: 3000
      });
    }
  } catch (err) {
    console.error('Error adding Caddyfile content:', err);
    formError.value = `Failed to add Caddyfile content: ${err.message}`;
  }
}

// Duplicate check
const duplicateEntries = ref([])

function checkForDuplicates() {
  // Ensure duplicateEntries is always an array
  duplicateEntries.value = []

  try {
    const config = jsonEditorContent.value;
    // Example check for duplicate hostnames
    const hostnames = new Set()
    const duplicates = []

    // Check for hosts in HTTP servers routes
    if (config?.apps?.http?.servers) {
      const servers = config.apps.http.servers;
      Object.values(servers).forEach(server => {
        if (server.routes && Array.isArray(server.routes)) {
          server.routes.forEach(route => {
            if (route.match && Array.isArray(route.match)) {
              route.match.forEach(matcher => {
                if (matcher.host && Array.isArray(matcher.host)) {
                  matcher.host.forEach(hostname => {
                    if (hostnames.has(hostname)) {
                      duplicates.push({ message: `Duplicate hostname detected: ${hostname}` })
                    } else {
                      hostnames.add(hostname)
                    }
                  })
                }
              })
            }
          })
        }
      })
    }

    duplicateEntries.value = duplicates
  } catch (err) {
    console.error('Error checking for duplicates:', err)
    const { notify } = useNotification()
    notify({
      title: "Error",
      text: `Could not check for duplicates: ${err.message}`,
      type: "error",
      duration: 3000
    })
  }
}

// Reverse Proxy Modal state and methods
const showReverseProxyModal = ref(false)
const proxyForm = ref({
  hostname: '',
  listen: '',
  targets: [{ dial: '' }],
  pathPrefix: '',
  lbPolicy: '',
  enableTls: false
})

const isReverseProxyFormValid = computed(() => {
  return proxyForm.value.hostname && proxyForm.value.listen && proxyForm.value.targets.every(target => target.dial)
})

function addBackendTarget() {
  proxyForm.value.targets.push({ dial: '' })
}

function removeBackendTarget(index) {
  proxyForm.value.targets.splice(index, 1)
}

async function addReverseProxySite() {
  const newSite = {
    match: [{ host: [proxyForm.value.hostname] }],
    handle: [{
      handler: 'reverse_proxy',
      upstreams: proxyForm.value.targets.map(target => ({ dial: target.dial })),
      ...(proxyForm.value.pathPrefix ? { match: [{ path: [proxyForm.value.pathPrefix] }] } : {}),
      ...(proxyForm.value.lbPolicy ? { load_balancing: { policy: proxyForm.value.lbPolicy } } : {}),
      ...(proxyForm.value.enableTls ? { tls: {} } : {})
    }],
    terminal: true
  }

  // Use a safe approach for a new configuration
  const updatedConfig = { ...jsonEditorContent.value }
  
  // Ensure the required structure exists
  if (!updatedConfig.apps) updatedConfig.apps = {};
  if (!updatedConfig.apps.http) updatedConfig.apps.http = {};
  if (!updatedConfig.apps.http.servers) updatedConfig.apps.http.servers = {};
  
  // Use a default server key if none exists
  const serverKey = Object.keys(updatedConfig.apps.http.servers)[0] || 'myserver';
  
  if (!updatedConfig.apps.http.servers[serverKey]) {
    updatedConfig.apps.http.servers[serverKey] = {
      listen: [proxyForm.value.listen || ':80'],
      routes: []
    };
  }
  
  // Add the new site to the routes
  if (!Array.isArray(updatedConfig.apps.http.servers[serverKey].routes)) {
    updatedConfig.apps.http.servers[serverKey].routes = [];
  }
  
  updatedConfig.apps.http.servers[serverKey].routes.push(newSite);
  
  // Update our state and emit the change
  jsonEditorContent.value = updatedConfig;
  emit('json-content-updated', updatedConfig);
  
  // Close the modal
  showReverseProxyModal.value = false;
  
  // Show success notification
  const { notify } = useNotification();
  notify({
    title: "Reverse Proxy Added",
    text: `Added reverse proxy for ${proxyForm.value.hostname}`,
    type: "success",
    duration: 3000
  });
}

function applyAndUseCustomizedTemplate() {
  try {
    if (!selectedTemplate.value) {
      throw new Error('No template selected');
    }

    // Get the template for display purposes
    const template = templateService.getTemplateById(selectedTemplate.value);

    // Use the templateService to generate the customized template
    const customizedTemplate = templateService.generateConfigFromTemplate(
      selectedTemplate.value, 
      templateCustomization.value
    );
    
    // Update the preview
    templatePreview.value = customizedTemplate;
    
    // Close the modal
    showTemplateCustomizationModal.value = false;
    
    // Add the customized template to the configuration
    const currentConfig = JSON.parse(JSON.stringify(jsonEditorContent.value));
    
    // Deep merge the customized template into the current config
    const mergedConfig = deepMergeConfigs(currentConfig, customizedTemplate);
    
    // Update the editor content with the merged configuration
    jsonEditorContent.value = mergedConfig;
    
    // Emit the updated content to the parent component
    emit('json-content-updated', mergedConfig);
    emit('json-validation', true);
    
    // Show success message
    formError.value = null;
    const { notify } = useNotification();
    notify({
      title: "Template Customized",
      text: `Successfully added customized ${template.name} template to your configuration`,
      type: "success",
      duration: 3000
    });
    
    // Switch to editor mode to show the changes
    editMode.value = 'editor';
  } catch (err) {
    console.error('Error adding customized template:', err);
    formError.value = `Failed to add customized template: ${err.message}`;
  }
}

function hasCustomizableForm(templateId) {
  const template = templateService.getTemplateById(templateId);
  return template && template.form && template.form.sections && template.form.sections.length > 0;
}
</script>

<style scoped>
/* Custom styling for vue-json-pretty */
:deep(.json-viewer) {
  font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

/* Custom styling for vue3-json-editor */
:deep(.jsoneditor) {
  border: none !important;
  height: 100%;
}

:deep(.jsoneditor-menu) {
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.jsoneditor-statusbar) {
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;
}
</style>