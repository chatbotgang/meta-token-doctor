<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCredentialsStore } from '../stores/credentials'
import {
  getWabaInfo,
  getWabaSubscribedApps,
  subscribeWaba,
  getPhoneNumbers,
  GraphError,
} from '../services/facebook'
import type { WabaInfo, PhoneNumber, SubscribedApp } from '../types/facebook'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

const props = defineProps<{
  wabaId: string
}>()

const emit = defineEmits<{
  missing: [wabaId: string]
  subscribed: [wabaId: string]
}>()

const credentials = useCredentialsStore()
const active = ref(true)
onBeforeUnmount(() => { active.value = false })

const info = ref<WabaInfo | null>(null)
const phones = ref<PhoneNumber[]>([])
const isSubscribed = ref<boolean | null>(null)
const subscribedApps = ref<SubscribedApp[]>([])
const loading = ref(true)
const error = ref('')
const subscribing = ref(false)

function humanizeError(e: unknown): string {
  if (e instanceof GraphError) {
    if (e.code === 200) return "Token doesn't have sufficient permissions for this WABA"
    if (e.code === 100) return 'This ID is not a WABA (might be a Page or Phone Number)'
    if (e.code === 104) return "Token doesn't have access to this object"
    if (e.code === 190) return 'Token is invalid or expired'
    return e.message
  }
  return e instanceof Error ? e.message : String(e)
}

async function loadData() {
  loading.value = true
  error.value = ''
  const [infoResult, subsResult, phonesResult] = await Promise.allSettled([
    getWabaInfo(props.wabaId, credentials.token),
    getWabaSubscribedApps(props.wabaId, credentials.token),
    getPhoneNumbers(props.wabaId, credentials.token),
  ])

  if (!active.value) return

  if (infoResult.status === 'fulfilled') {
    info.value = infoResult.value
  } else {
    error.value = humanizeError(infoResult.reason)
  }

  if (subsResult.status === 'fulfilled') {
    subscribedApps.value = subsResult.value
    isSubscribed.value = subsResult.value.length > 0
    if (!isSubscribed.value) {
      emit('missing', props.wabaId)
    } else {
      emit('subscribed', props.wabaId)
    }
  } else if (!error.value) {
    error.value = humanizeError(subsResult.reason)
  }

  if (phonesResult.status === 'fulfilled') {
    phones.value = phonesResult.value
  }

  loading.value = false
}

async function doSubscribe() {
  subscribing.value = true
  try {
    await subscribeWaba(props.wabaId, credentials.token)
    if (!active.value) return
    isSubscribed.value = true
    emit('subscribed', props.wabaId)
    try {
      subscribedApps.value = await getWabaSubscribedApps(props.wabaId, credentials.token)
    } catch { /* subscribe succeeded; app list refresh is non-critical */ }
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    subscribing.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="waba-card">
    <div class="waba-header">
      <h4>
        {{ info?.name ?? 'WABA' }}
        <span class="waba-id">{{ wabaId }}</span>
      </h4>
      <Tag
        v-if="isSubscribed !== null"
        :severity="isSubscribed ? 'success' : 'danger'"
        :value="isSubscribed ? 'Subscribed' : 'Not Subscribed'"
        :icon="isSubscribed ? 'pi pi-check' : 'pi pi-times'"
      />
    </div>

    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
      Loading WABA...
    </div>

    <Message v-if="error" severity="error" class="error-msg">
      {{ error }}
    </Message>

    <template v-if="!loading && info">
      <div class="waba-details">
        <span v-if="info.currency"><b>Currency:</b> {{ info.currency }}</span>
        <span v-if="info.timezone_id"><b>Timezone:</b> {{ info.timezone_id }}</span>
        <span v-if="info.account_review_status"><b>Review:</b> {{ info.account_review_status }}</span>
        <span v-if="info.business_verification_status"><b>Verification:</b> {{ info.business_verification_status }}</span>
        <span v-if="info.ownership_type"><b>Ownership:</b> {{ info.ownership_type }}</span>
      </div>

      <div v-if="subscribedApps.length > 0" class="subscribed-apps">
        <b>Subscribed by:</b>
        <span v-for="(app, i) in subscribedApps" :key="app.id ?? i">
          {{ app.name ?? 'Unknown app' }}
          <span v-if="app.id" class="app-id">({{ app.id }})</span>
          <span v-if="i < subscribedApps.length - 1">, </span>
        </span>
      </div>

      <Button
        v-if="isSubscribed === false"
        label="Subscribe"
        icon="pi pi-plus"
        size="small"
        :loading="subscribing"
        @click="doSubscribe"
      />

      <div v-if="phones.length > 0" class="phones-section">
        <h5>Phone Numbers</h5>
        <DataTable :value="phones" size="small" striped-rows>
          <Column field="display_phone_number" header="Phone" />
          <Column field="verified_name" header="Verified Name" />
          <Column field="quality_rating" header="Quality" />
          <Column field="status" header="Status" />
          <Column field="platform_type" header="Platform" />
          <Column header="Throughput">
            <template #body="{ data }">
              {{ data.throughput?.level ?? '—' }}
            </template>
          </Column>
          <Column field="messaging_limit_tier" header="Msg Limit" />
        </DataTable>
      </div>
    </template>
  </div>
</template>

<style scoped>
.waba-card {
  border: 1px solid var(--p-surface-200);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.waba-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.waba-header h4 {
  margin: 0;
}

.waba-id {
  font-weight: 400;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
  margin-left: 0.5rem;
}

.waba-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0.75rem 0;
  font-size: 0.9rem;
}

.subscribed-apps {
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.app-id {
  color: var(--p-text-muted-color);
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.error-msg {
  margin-top: 0.5rem;
}

.phones-section {
  margin-top: 1rem;
}

.phones-section h5 {
  margin: 0 0 0.5rem;
}
</style>
