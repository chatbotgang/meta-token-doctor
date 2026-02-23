<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCredentialsStore } from '../stores/credentials'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const router = useRouter()
const credentials = useCredentialsStore()

const appId = ref('')
const appSecret = ref('')
const token = ref('')

function startDiagnosis() {
  credentials.appId = appId.value.trim()
  credentials.appSecret = appSecret.value.trim()
  credentials.token = token.value.trim()
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

      <p class="hint">
        <i class="pi pi-lock" />
        Credentials are stored in browser memory only and never sent to any server.
      </p>
    </div>
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

.hint {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
