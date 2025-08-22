<template>
  <div class="h-full">
    <div v-if="isLoading" class="flex justify-center items-center h-[300px]">
      <LoadingSpinnerComp 
        caption="Loading configuration data..."
        color="gradient"
        size="medium"
        text-color="text-gray-500"
      />
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
      {{ error }}
    </div>
    
    <div v-else-if="config" class="flex flex-col gap-6 h-full">
      <!-- Configuration View Panel -->
      <div class="bg-white rounded-lg shadow border-none flex-1">
        <div class="bg-gray-50 border-b border-gray-100 p-4">
          <h5 class="m-0 font-semibold flex items-center justify-between">
            <div class="flex items-center">
              <CodeBracketIcon class="h-5 w-5 mr-2 text-tertiary" aria-hidden="true" />
              {{ isEditMode ? 'Edit Configuration Content' : 'Configuration Content' }}
            </div>
            <div class="flex items-center space-x-2">
              <!-- View mode toggle - only show in view mode -->
              <div v-if="!isEditMode" class="flex border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="viewMode === 'structured' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="viewMode = 'structured'"
                >
                  <TableCellsIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  Structured
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs flex items-center focus:outline-none"
                  :class="viewMode === 'json' ? 'bg-secondary text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'"
                  @click="viewMode = 'json'"
                >
                  <CodeBracketSquareIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                  JSON
                </button>
              </div>
              
              <!-- Edit mode view toggle -->
              <div v-if="isEditMode" class="flex border border-gray-200 rounded-lg shadow-xs overflow-hidden">
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
                  <CodeBracketSquareIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
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
              
              <button 
                v-if="!isEditMode"
                @click="refreshConfig"
                class="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <ArrowPathIcon class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Refresh
              </button>
            </div>
          </h5>
        </div>
        
        <!-- Edit mode content -->
        <div v-if="isEditMode" class="p-4 border-none h-full">
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
            <label for="jsonEditor" class="block text-sm font-medium text-tertiary mb-2">Edit JSON Configuration</label>
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
              Edit the JSON configuration directly. Changes will be saved when you click "Save Changes".
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
              blur="xl"
              rounded="lg"
              opacity="strong"
              variant="primary"
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
            <label class="block text-sm font-medium text-tertiary mb-2">Add Configuration Using Template</label>
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
                <label for="caddyfileEditor" class="block text-sm font-medium text-tertiary mb-2">Edit Caddyfile Configuration</label>
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
                    <select
                      id="serverSelect"
                      v-model="selectedServerId"
                      class="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6"
                    >
                      <option value="">Default Sandbox</option>
                      <option v-for="server in servers" :key="server._id" :value="server._id">
                        {{ server.name }}
                      </option>
                    </select>
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
        
        <!-- View mode content -->
        <div v-else class="p-4 border-none overflow-auto">
          <!-- Structured View Mode -->
          <div v-if="viewMode === 'structured' && configContent" class="h-full">
            <!-- Structured view for Caddy config -->
            <div v-if="hasSiteDefinitions" class="mb-6">
              <h3 class="text-md font-semibold text-tertiary mb-3">Sites</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(site, index) in parsedSites" :key="index" 
                     class="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-base font-medium text-secondary">
                      <GlobeAltIcon class="inline-block h-4 w-4 mr-1 text-tertiary" aria-hidden="true" />
                      {{ site.hostnames.join(', ') }}
                    </h4>
                    <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {{ site.type }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    <div class="flex items-start mb-1">
                      <div class="font-medium text-tertiary w-20">Proxy to:</div>
                      <div>{{ site.upstreamTargets.join(', ') }}</div>
                    </div>
                    <div v-if="site.listen && site.listen.length" class="flex items-start mb-1">
                      <div class="font-medium text-tertiary w-20">Listen on:</div>
                      <div>{{ site.listen.join(', ') }}</div>
                    </div>
                    <div v-if="site.options && Object.keys(site.options).length" class="flex items-start mt-2">
                      <div class="font-medium text-tertiary w-20">Options:</div>
                      <div>
                        <div v-for="(value, key) in site.options" :key="key" class="text-xs text-gray-600">
                          <span class="font-medium">{{ key }}:</span> {{ value }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="hasListenAddresses" class="my-6">
              <h3 class="text-md font-semibold text-tertiary mb-3">Listen Addresses</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="(address, i) in parsedListenAddresses" :key="i" 
                  class="inline-flex items-center rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                  {{ address }}
                </span>
              </div>
            </div>
            
            <div v-if="hasAdminConfig" class="my-6">
              <h3 class="text-md font-semibold text-tertiary mb-3">Admin Configuration</h3>
              <div class="bg-gray-50 rounded-md p-3">
                <div class="flex items-center mb-2">
                  <ShieldCheckIcon class="h-5 w-5 text-tertiary mr-2" />
                  <span class="font-medium text-tertiary">Admin Endpoint</span>
                </div>
                <div class="pl-7 text-sm">
                  <div class="mb-1"><span class="font-medium text-tertiary">Listen:</span> {{ parsedAdminConfig.listen || 'Default' }}</div>
                  <div v-if="parsedAdminConfig.enforce_origin">
                    <span class="font-medium text-tertiary">Enforce Origin:</span> {{ parsedAdminConfig.enforce_origin }}
                  </div>
                  <div v-if="parsedAdminConfig.origins && parsedAdminConfig.origins.length">
                    <span class="font-medium text-tertiary">Allowed Origins:</span> {{ parsedAdminConfig.origins.join(', ') }}
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="hasLoggingConfig" class="my-6">
              <h3 class="text-md font-semibold text-tertiary mb-3">Logging Configuration</h3>
              <div v-for="(log, name) in parsedLoggingConfig" :key="name" 
                   class="bg-gray-50 rounded-md p-3 mb-2">
                <div class="flex items-center mb-2">
                  <DocumentTextIcon class="h-5 w-5 text-tertiary mr-2" />
                  <span class="font-medium text-tertiary">{{ name }}</span>
                </div>
                <div class="pl-7 text-sm">
                  <div class="mb-1"><span class="font-medium text-tertiary">Level:</span> {{ log.level }}</div>
                  <div v-if="log.output" class="mb-1">
                    <span class="font-medium text-tertiary">Output:</span> {{ log.output }}
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="hasStorageConfig" class="my-6">
              <h3 class="text-md font-semibold text-tertiary mb-3">Storage Configuration</h3>
              <div class="bg-gray-50 rounded-md p-3">
                <div class="flex items-center mb-2">
                  <FolderIcon class="h-5 w-5 text-tertiary mr-2" />
                  <span class="font-medium text-tertiary">Storage Settings</span>
                </div>
                <div class="pl-7 text-sm">
                  <div v-if="parsedStorageConfig.module" class="mb-1">
                    <span class="font-medium text-tertiary">Module:</span> {{ parsedStorageConfig.module }}
                  </div>
                  <div v-if="parsedStorageConfig.root" class="mb-1">
                    <span class="font-medium text-tertiary">Root Directory:</span> {{ parsedStorageConfig.root }}
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="!hasSiteDefinitions && !hasAdminConfig && !hasLoggingConfig && !hasStorageConfig" class="text-center py-8 text-gray-500">
              <InformationCircleIcon class="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No structured data could be parsed from this configuration.</p>
              <p class="text-sm mt-1">Try viewing in JSON mode for the raw configuration.</p>
            </div>
          </div>
          
          <!-- JSON View Mode -->
          <div v-else-if="viewMode === 'json' && configContent" class="h-full">
            <VueJsonPretty
              :data="configContent"
              :deep="25"
              :show-double-quotes="true"
              :show-length="true"
              :show-line="true"
              :show-icon="true"
              class="json-viewer"
            />
          </div>
          
          <div v-else class="flex items-center justify-center h-40 text-gray-500">
            No configuration content available
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="bg-white rounded-lg shadow border-none p-6 text-center">
      <div class="py-8">
        <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-yellow-400" aria-hidden="true" />
        <h3 class="mt-2 text-lg font-semibold text-gray-900">No Configuration Data</h3>
        <p class="mt-1 text-sm text-gray-500">The configuration data could not be loaded.</p>
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
          <label class="block text-sm font-medium text-tertiary mb-1">Hostname</label>
          <input 
            v-model="proxyForm.hostname" 
            type="text" 
            placeholder="example.com"
            class="placeholder:text-gray-300 text-tertiary block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <p class="mt-1 text-xs text-gray-500">The domain name for this proxy.</p>
        </div>
        <div class="flex flex-col mb-2">
          <label class="block text-sm font-medium text-tertiary mb-1">Listen Address</label>
          <input 
            v-model="proxyForm.listen" 
            type="text" 
            placeholder=":80"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
          <input 
            v-model="target.dial" 
            type="text" 
            placeholder="localhost:8080"
            class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
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
            <label class="block text-sm font-medium text-tertiary mb-1">Path Prefix (optional)</label>
            <input 
              v-model="proxyForm.pathPrefix" 
              type="text" 
              placeholder="/api/*"
              class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p class="mt-1 text-xs text-gray-500">Limit proxy to a specific path.</p>
          </div>
          
          <div class="flex flex-col mb-2">
            <label class="block text-sm font-medium text-tertiary mb-1">Load Balancing Policy</label>
            <select 
              v-model="proxyForm.lbPolicy" 
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              <option value="">Default (random)</option>
              <option value="round_robin">Round Robin</option>
              <option value="least_conn">Least Connections</option>
              <option value="ip_hash">IP Hash</option>
            </select>
          </div>
        </div>
        
        <div class="mt-4">
          <label class="relative inline-flex items-center">
            <input type="checkbox" v-model="proxyForm.enableTls" class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-tertiary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-dark"></div>
            <span class="ml-3 text-sm font-medium text-tertiary">Enable TLS (HTTPS)</span>
          </label>
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
                class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                :required="field.required"
              />
              
              <!-- Textarea -->
              <textarea v-if="field.type === 'textarea'" 
                v-model="templateCustomization[field.id]" 
                :placeholder="field.placeholder"
                rows="3"
                class="placeholder:text-gray-300 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
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
import { useCaddyConfigsStore } from '@/stores/caddyConfigsStore'
import { useCaddyServersStore } from '@/stores/caddyServersStore'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { RouterLink, useRouter } from 'vue-router'
import { Vue3JsonEditor } from 'vue3-json-editor'
import aceEditorSubComp from '@/components/util/aceEditorSubComp.vue'
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

const props = defineProps({
  configId: {
    type: String,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['json-content-updated', 'json-validation'])

const router = useRouter()
const configsStore = useCaddyConfigsStore()
const serversStore = useCaddyServersStore()
const isLoading = computed(() => configsStore.isLoading)
const error = computed(() => configsStore.error)
const config = computed(() => configsStore.getConfigById(props.configId))

// Get servers list for the dropdown
const servers = computed(() => serversStore.servers)

// View mode toggle
const viewMode = ref('structured')

// Edit mode toggle
const editMode = ref('editor')

// state for JSON editor
const updateData = ref({})

// Form-related refs for editing JSON
const formError = ref(null)
const isSaving = ref(false)
const saveSuccess = ref(false)
const jsonEditorContent = ref({})
const jsonValidationError = ref(null)
// Ace Editor state
const aceEditorContent = ref('')
const aceJsonError = ref(null)

// Sync Ace editor with JSON editor
watch([jsonEditorContent, () => editMode.value], ([val, mode]) => {
  if (mode === 'ace') {
    aceEditorContent.value = JSON.stringify(val, null, 2)
  }
})

function onJsonError(error) {
  jsonValidationError.value = error
  emit('json-validation', !error)
}

function onJsonChange(value) {
  jsonEditorContent.value = value
  emit('json-content-updated', value)
}

function onAceJsonError(error) {
  aceJsonError.value = error
  emit('json-validation', !error)
}

function onAceEditorInput(val) {
  aceEditorContent.value = val
  if (editMode.value === 'ace') {
    try {
      const parsed = JSON.parse(val)
      jsonEditorContent.value = parsed
      emit('json-content-updated', parsed)
    } catch (e) {
      // Ignore until valid
    }
  }
}

// Get the configuration content
const configContent = computed(() => {
  if (!config.value) return null
  
  // Try to get the content from different possible locations
  if (config.value.content && typeof config.value.content === 'object') {
    return config.value.content
  }
  
  if (config.value.jsonConfig && typeof config.value.jsonConfig === 'object') {
    return config.value.jsonConfig
  }
  
  // If content is a JSON string, parse it
  if (config.value.content && typeof config.value.content === 'string') {
    try {
      return JSON.parse(config.value.content)
    } catch (e) {
      return { error: "Unable to parse JSON content" }
    }
  }
  
  return null
})

// Watch for changes in configuration or edit mode
watch([config, () => props.isEditMode], ([newConfig, isEdit]) => {
  if (newConfig && isEdit) {
    // Initialize the JSON editor with the content
    jsonEditorContent.value = configContent.value || {}
  }
}, { immediate: true })

// Extract sites from Caddy config for structured view
const parsedSites = computed(() => {
  if (!configContent.value) return []
  
  try {
    const sites = []
    // Try to get server routes from HTTP app config
    const httpServers = configContent.value?.apps?.http?.servers || {}
    
    for (const [serverName, serverConfig] of Object.entries(httpServers)) {
      if (serverConfig.routes && Array.isArray(serverConfig.routes)) {
        serverConfig.routes.forEach(route => {
          // Extract host and other matchers
          const hostnames = []
          let type = 'HTTP Proxy'
          let upstreamTargets = []
          const options = {}
          
          // Get hostnames
          if (route.match && Array.isArray(route.match)) {
            route.match.forEach(matcher => {
              if (matcher.host && Array.isArray(matcher.host)) {
                hostnames.push(...matcher.host)
              }
              // Add other matchers to options
              Object.entries(matcher)
                .filter(([key]) => key !== 'host')
                .forEach(([key, value]) => {
                  options[key] = JSON.stringify(value)
                })
            })
          }
          
          // Find handler type and upstream targets
          if (route.handle && Array.isArray(route.handle)) {
            route.handle.forEach(handler => {
              // Detect common handler types
              if (handler.handler === 'reverse_proxy') {
                type = 'Reverse Proxy'
                if (handler.upstreams && Array.isArray(handler.upstreams)) {
                  upstreamTargets = handler.upstreams.map(upstream => upstream.dial || JSON.stringify(upstream))
                }
              } else if (handler.handler === 'file_server') {
                type = 'File Server'
                if (handler.root) {
                  upstreamTargets = [handler.root]
                }
              } else if (handler.handler === 'static_response') {
                type = 'Static Response'
                if (handler.body) {
                  upstreamTargets = [handler.body.substring(0, 50) + (handler.body.length > 50 ? '...' : '')]
                }
              } else if (handler.handler === 'subroute') {
                // Look deeper into subroutes for handlers
                if (handler.routes && Array.isArray(handler.routes)) {
                  handler.routes.forEach(subroute => {
                    if (subroute.handle && Array.isArray(subroute.handle)) {
                      subroute.handle.forEach(subHandler => {
                        if (subHandler.handler === 'reverse_proxy') {
                          type = 'Reverse Proxy'
                          if (subHandler.upstreams && Array.isArray(subHandler.upstreams)) {
                            upstreamTargets = subHandler.upstreams.map(upstream => upstream.dial || JSON.stringify(upstream))
                          }
                        } else if (subHandler.handler === 'file_server') {
                          type = 'File Server'
                          if (subHandler.root) {
                            upstreamTargets = [subHandler.root]
                          }
                        }
                      })
                    }
                  })
                }
              } else {
                if (!upstreamTargets.length) {
                  type = handler.handler || 'Unknown'
                }
              }
              
              // Add other handler options
              Object.entries(handler)
                .filter(([key]) => !['handler', 'upstreams', 'routes'].includes(key))
                .forEach(([key, value]) => {
                  if (typeof value !== 'object') {
                    options[key] = value
                  }
                })
            })
          }
          
          // Include listen addresses
          const listen = serverConfig.listen || []
          
          if (hostnames.length) {
            sites.push({
              serverName,
              hostnames,
              type,
              upstreamTargets: upstreamTargets.length ? upstreamTargets : ['No target specified'],
              listen,
              options,
              terminal: route.terminal
            })
          }
        })
      }
    }
    
    return sites
  } catch (err) {
    console.error('Error parsing sites from configuration:', err)
    return []
  }
})

const hasSiteDefinitions = computed(() => parsedSites.value.length > 0)

// Extract listen addresses
const parsedListenAddresses = computed(() => {
  if (!configContent.value) return []
  
  try {
    const addresses = new Set()
    const httpServers = configContent.value?.apps?.http?.servers || {}
    
    for (const serverConfig of Object.values(httpServers)) {
      if (serverConfig.listen && Array.isArray(serverConfig.listen)) {
        serverConfig.listen.forEach(addr => addresses.add(addr))
      }
    }
    
    return Array.from(addresses)
  } catch (err) {
    console.error('Error parsing listen addresses from configuration:', err)
    return []
  }
})

const hasListenAddresses = computed(() => parsedListenAddresses.value.length > 0)

// Extract admin configuration
const parsedAdminConfig = computed(() => {
  if (!configContent.value) return {}
  
  try {
    return configContent.value.admin || {}
  } catch (err) {
    console.error('Error parsing admin config:', err)
    return {}
  }
})

const hasAdminConfig = computed(() => Object.keys(parsedAdminConfig.value).length > 0)

// Extract logging configuration
const parsedLoggingConfig = computed(() => {
  if (!configContent.value) return {}
  
  try {
    return configContent.value?.logging?.logs || {}
  } catch (err) {
    console.error('Error parsing logging config:', err)
    return {}
  }
})

const hasLoggingConfig = computed(() => Object.keys(parsedLoggingConfig.value).length > 0)

// Extract storage configuration
const parsedStorageConfig = computed(() => {
  if (!configContent.value) return {}
  
  try {
    return configContent.value?.storage || {}
  } catch (err) {
    console.error('Error parsing storage config:', err)
    return {}
  }
})

const hasStorageConfig = computed(() => Object.keys(parsedStorageConfig.value).length > 0)

onMounted(async () => {
  await loadConfiguration()
  // Fetch servers for the dropdown
  if (serversStore.servers.length === 0) {
    await serversStore.fetchServers()
  }
})

watch(() => props.configId, async (newId) => {
  if (newId) {
    await loadConfiguration()
  }
})

async function loadConfiguration() {
  if (!configsStore.getConfigById(props.configId)) {
    await configsStore.fetchConfigById(props.configId)
  }
}

async function refreshConfig() {
  await configsStore.fetchConfigById(props.configId)
}

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
  duplicateEntries.value = []

  // Example check for duplicate hostnames
  const hostnames = new Set()
  const duplicates = []

  parsedSites.value.forEach(site => {
    site.hostnames.forEach(hostname => {
      if (hostnames.has(hostname)) {
        duplicates.push({ message: `Duplicate hostname detected: ${hostname}` })
      } else {
        hostnames.add(hostname)
      }
    })
  })

  duplicateEntries.value = duplicates
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

  const updatedConfig = { ...configContent.value }
  updatedConfig.apps.http.servers[props.configId].routes.push(newSite)

  jsonEditorContent.value = updatedConfig
  showReverseProxyModal.value = false
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