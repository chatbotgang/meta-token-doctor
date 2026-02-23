<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCredentialsStore } from '../stores/credentials'
import { getBusinesses, getOwnedWabas } from '../services/facebook'
import type { DebugTokenData, WabaInfo } from '../types/facebook'
import WabaCard from './WabaCard.vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

const props = defineProps<{
  tokenData: DebugTokenData | null
  tokenLoaded: boolean
}>()

const emit = defineEmits<{
  missing: [wabaId: string]
  subscribed: [wabaId: string]
}>()

const credentials = useCredentialsStore()

const wabaIds = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const manualId = ref('')

function extractWabaIdsFromScopes(data: DebugTokenData): string[] {
  const ids = new Set<string>()
  for (const gs of data.granular_scopes ?? []) {
    if (
      gs.scope === 'whatsapp_business_management' ||
      gs.scope === 'whatsapp_business_messaging'
    ) {
      for (const id of gs.target_ids ?? []) {
        ids.add(id)
      }
    }
  }
  return [...ids]
}

async function discoverFromBusinesses(): Promise<string[]> {
  try {
    const businesses = await getBusinesses(credentials.token)
    const results = await Promise.allSettled(
      businesses.map((biz) => getOwnedWabas(biz.id, credentials.token)),
    )
    return results
      .filter((r): r is PromiseFulfilledResult<WabaInfo[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value.map((w) => w.id))
  } catch {
    return []
  }
}

async function discoverWabas() {
  loading.value = true
  error.value = ''
  try {
    const fromScopes = props.tokenData ? extractWabaIdsFromScopes(props.tokenData) : []
    const fromBusinesses = await discoverFromBusinesses()

    const allIds = new Set([...fromScopes, ...fromBusinesses])
    wabaIds.value = [...allIds]

    if (wabaIds.value.length === 0) {
      error.value = 'No WABAs found. You can manually add a WABA ID below.'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function addManualWaba() {
  const id = manualId.value.trim()
  if (id && !wabaIds.value.includes(id)) {
    wabaIds.value.push(id)
  }
  manualId.value = ''
}

watch(
  () => props.tokenLoaded,
  (loaded) => {
    if (loaded) discoverWabas()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
      Discovering WABAs...
    </div>

    <Message v-if="error && wabaIds.length === 0" severity="info">
      {{ error }}
    </Message>

    <WabaCard
      v-for="id in wabaIds"
      :key="id"
      :waba-id="id"
      @missing="emit('missing', $event)"
      @subscribed="emit('subscribed', $event)"
    />

    <div class="manual-add">
      <InputText
        v-model="manualId"
        placeholder="Enter WABA ID manually"
        size="small"
        @keyup.enter="addManualWaba"
      />
      <Button
        label="Add"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        :disabled="!manualId.trim()"
        @click="addManualWaba"
      />
    </div>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
}

.manual-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
}
</style>
