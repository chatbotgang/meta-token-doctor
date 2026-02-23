<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCredentialsStore } from '../stores/credentials'
import { getPages, getPageSubscribedApps, subscribePageApp, PAGE_SUBSCRIBED_FIELDS, GraphError } from '../services/facebook'
import type { PageInfo, SubscribedApp } from '../types/facebook'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import vTooltip from 'primevue/tooltip'

const emit = defineEmits<{
  missing: [pageId: string, pageToken: string]
  subscribed: [pageId: string]
}>()

const credentials = useCredentialsStore()
const active = ref(true)
onBeforeUnmount(() => { active.value = false })

interface PageWithStatus extends PageInfo {
  subscriptionStatus: 'full' | 'partial' | 'none' | null
  missingFields: string[]
  subscribing: boolean
  error: string
}

const pages = ref<PageWithStatus[]>([])
const loading = ref(true)
const error = ref('')

function humanizeError(e: unknown): string {
  if (e instanceof GraphError) {
    if (e.code === 190) return 'Token is invalid or expired'
    return e.message
  }
  return e instanceof Error ? e.message : String(e)
}

function evaluateSubscription(apps: SubscribedApp[]): { status: 'full' | 'partial' | 'none'; missingFields: string[] } {
  if (apps.length === 0) {
    return { status: 'none', missingFields: [] }
  }
  const ourApp = credentials.appId
    ? apps.find((a) => a.id === credentials.appId)
    : apps[0]
  if (!ourApp) {
    return { status: 'none', missingFields: [] }
  }
  const actualFields = new Set(ourApp.subscribed_fields ?? [])
  const missing = PAGE_SUBSCRIBED_FIELDS.filter((f) => !actualFields.has(f))
  if (missing.length > 0) {
    return { status: 'partial', missingFields: missing }
  }
  return { status: 'full', missingFields: [] }
}

async function loadPages() {
  loading.value = true
  error.value = ''
  try {
    const raw = await getPages(credentials.token)
    pages.value = raw.map((p) => ({
      ...p,
      subscriptionStatus: null,
      missingFields: [],
      subscribing: false,
      error: '',
    }))

    await Promise.all(
      pages.value.map(async (page) => {
        try {
          const apps = await getPageSubscribedApps(page.id, page.access_token)
          if (!active.value || page.subscribing) return
          const { status, missingFields } = evaluateSubscription(apps)
          page.subscriptionStatus = status
          page.missingFields = missingFields
          if (status !== 'full') {
            emit('missing', page.id, page.access_token)
          }
        } catch (e) {
          if (!active.value) return
          page.error = humanizeError(e)
        }
      }),
    )
  } catch (e) {
    error.value = humanizeError(e)
  } finally {
    loading.value = false
  }
}

async function doSubscribe(page: PageWithStatus) {
  page.subscribing = true
  page.error = ''
  try {
    await subscribePageApp(page.id, page.access_token)
    const apps = await getPageSubscribedApps(page.id, page.access_token)
    if (!active.value) return
    const { status, missingFields } = evaluateSubscription(apps)
    page.subscriptionStatus = status
    page.missingFields = missingFields
    if (status === 'full') {
      emit('subscribed', page.id)
    }
  } catch (e) {
    page.error = humanizeError(e)
  } finally {
    page.subscribing = false
  }
}

onMounted(loadPages)
</script>

<template>
  <div>
    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
      Loading pages...
    </div>

    <Message v-else-if="error" severity="error">
      {{ error }}
    </Message>

    <Message v-else-if="pages.length === 0" severity="info">
      No pages found for this token.
    </Message>

    <DataTable v-else :value="pages" size="small" striped-rows>
      <Column field="name" header="Page Name" />
      <Column field="id" header="ID" />
      <Column field="category" header="Category" />
      <Column header="Subscription">
        <template #body="{ data }">
          <Tag
            v-if="data.subscriptionStatus === 'full'"
            severity="success"
            value="Subscribed"
            icon="pi pi-check"
          />
          <Tag
            v-else-if="data.subscriptionStatus === 'partial'"
            v-tooltip.top="'Missing: ' + data.missingFields.join(', ')"
            severity="warn"
            value="Partial"
            icon="pi pi-exclamation-triangle"
          />
          <Tag
            v-else-if="data.subscriptionStatus === 'none'"
            severity="danger"
            value="Not Subscribed"
            icon="pi pi-times"
          />
          <ProgressSpinner v-else style="width: 1rem; height: 1rem" />
        </template>
      </Column>
      <Column header="Action">
        <template #body="{ data }">
          <Button
            v-if="data.subscriptionStatus === 'none' || data.subscriptionStatus === 'partial'"
            label="Subscribe"
            icon="pi pi-plus"
            size="small"
            :loading="data.subscribing"
            @click="doSubscribe(data)"
          />
          <Message v-if="data.error" severity="error" class="inline-error">
            {{ data.error }}
          </Message>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
}

.inline-error {
  margin-top: 0.25rem;
}
</style>
