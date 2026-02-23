<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCredentialsStore, type StorageMode } from '../stores/credentials'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Dialog from 'primevue/dialog'

const router = useRouter()
const credentials = useCredentialsStore()

const appId = ref(credentials.appId)
const appSecret = ref(credentials.appSecret)
const token = ref(credentials.token)

const storageModeOptions = [
  { label: 'None', value: 'none' },
  { label: 'Session', value: 'session' },
  { label: 'Local', value: 'local' },
]

const showLocalWarning = ref(false)
const selectButtonKey = ref(0)

const hasAnyValue = computed(() => {
  return (
    appId.value.trim().length > 0 ||
    appSecret.value.trim().length > 0 ||
    token.value.trim().length > 0 ||
    credentials.storageMode !== 'none'
  )
})

const hintText = computed(() => {
  switch (credentials.storageMode) {
    case 'session':
      return 'Credentials are stored in session storage and cleared when the tab closes.'
    case 'local':
      return 'Credentials are stored in local storage and persist until manually cleared.'
    default:
      return 'Credentials are stored in browser memory only and never sent to any server.'
  }
})

function syncToStore() {
  credentials.appId = appId.value.trim()
  credentials.appSecret = appSecret.value.trim()
  credentials.token = token.value.trim()
}

function onStorageModeChange(newMode: StorageMode) {
  if (newMode === credentials.storageMode) return

  if (newMode === 'local') {
    showLocalWarning.value = true
    return
  }

  syncToStore()
  credentials.setStorageMode(newMode)
}

function onLocalWarningHide() {
  selectButtonKey.value++
}

function confirmLocalStorage() {
  syncToStore()
  credentials.setStorageMode('local')
  showLocalWarning.value = false
}

function clearAll() {
  appId.value = ''
  appSecret.value = ''
  token.value = ''
  credentials.clear()
}

function startDiagnosis() {
  syncToStore()
  credentials.saveToStorage()
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="credentials-view">
    <div class="credentials-card">
      <h1>
        <i class="pi pi-search" />
        Meta Token Doctor
      </h1>
      <p class="subtitle">
        Diagnose Facebook/WhatsApp/Instagram webhook subscription issues
      </p>

      <div class="storage-mode">
        <label>Credential Storage</label>
        <SelectButton
          :key="selectButtonKey"
          :model-value="credentials.storageMode"
          :options="storageModeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onStorageModeChange"
        />
      </div>

      <div class="field">
        <label for="appId">App ID</label>
        <InputText
          id="appId"
          v-model="appId"
          placeholder="e.g. 123456789012345"
          fluid
        />
      </div>

      <div class="field">
        <label for="appSecret">App Secret</label>
        <Password
          input-id="appSecret"
          v-model="appSecret"
          placeholder="e.g. abc123def456..."
          :feedback="false"
          toggle-mask
          fluid
        />
      </div>

      <div class="field">
        <label for="token">Access Token</label>
        <Password
          input-id="token"
          v-model="token"
          placeholder="User or System User token"
          :feedback="false"
          toggle-mask
          fluid
        />
      </div>

      <Button
        label="Start Diagnosis"
        icon="pi pi-play"
        :disabled="!appId.trim() || !appSecret.trim() || !token.trim()"
        class="start-button"
        @click="startDiagnosis"
      />
      <div class="clear-wrapper">
        <Button
          label="Clear all"
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          :disabled="!hasAnyValue"
          @click="clearAll"
        />
      </div>

      <p class="hint">
        <i class="pi pi-lock" />
        {{ hintText }}
      </p>
    </div>

    <Dialog
      v-model:visible="showLocalWarning"
      header="Local Storage Warning"
      :modal="true"
      :closable="true"
      :style="{ maxWidth: '28rem' }"
      @hide="onLocalWarningHide"
    >
      <ul class="local-warning-list">
        <li>Credentials will persist on disk until you manually clear them.</li>
        <li>
          GitHub Pages apps on <code>chatbotgang.github.io</code> share the same
          origin — other apps on this domain could potentially read these values.
        </li>
      </ul>
      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="showLocalWarning = false"
        />
        <Button
          label="Use Local Storage"
          severity="warn"
          @click="confirmLocalStorage"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.credentials-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.credentials-card {
  max-width: 480px;
  width: 100%;
}

h1 {
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subtitle {
  color: var(--p-text-muted-color);
  margin: 0 0 2rem;
}

.storage-mode {
  margin-bottom: 1.5rem;
}

.storage-mode label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.start-button {
  width: 100%;
  margin-top: 0.5rem;
}

.clear-wrapper {
  text-align: center;
  margin-top: 0.75rem;
}

.hint {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.local-warning-list {
  margin: 0;
  padding-left: 1.25rem;
}

.local-warning-list li + li {
  margin-top: 0.5rem;
}
</style>
