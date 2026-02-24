<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCredentialsStore } from '../stores/credentials'
import { getPageInfo, getPages, getPageSubscribedApps, getPageIgAccount, subscribePageApp, PAGE_SUBSCRIBED_FIELDS, IG_SUBSCRIBED_FIELDS, GraphError } from '../services/facebook'
import type { PageInfo, SubscribedApp, IgAccount } from '../types/facebook'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tooltip from 'primevue/tooltip'

const vTooltip = Tooltip

const props = withDefaults(defineProps<{
  isPageToken?: boolean
}>(), {
  isPageToken: false,
})

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
  igAccount: IgAccount | null
  igStatus: 'full' | 'partial' | 'none' | null
  missingIgFields: string[]
  subscribing: boolean
  error: string
}

const expectedFields = [...PAGE_SUBSCRIBED_FIELDS]
const igFieldsSet = new Set<string>(IG_SUBSCRIBED_FIELDS)
const fbOnlyFields = new Set<string>(PAGE_SUBSCRIBED_FIELDS.filter((f) => !igFieldsSet.has(f)))

const pages = ref<PageWithStatus[]>([])
const loading = ref(true)
const error = ref('')

const hasAnyIg = computed(() => pages.value.some((p) => p.igAccount))

function getIgStatus(page: PageWithStatus): 'full' | 'partial' | 'none' | null {
  if (!page.igAccount || page.subscriptionStatus == null) return null
  if (page.subscriptionStatus === 'none') return 'none'
  if (page.subscriptionStatus === 'full') return 'full'
  // partial page: count missing IG fields
  const missingIgCount = page.missingFields.filter((f) => igFieldsSet.has(f)).length
  if (missingIgCount === 0) return 'full'
  if (missingIgCount === IG_SUBSCRIBED_FIELDS.length) return 'none'
  return 'partial'
}

function getMissingIgFields(page: PageWithStatus): string[] {
  return page.missingFields.filter((f) => igFieldsSet.has(f))
}

function fieldSuffix(field: string): string {
  return fbOnlyFields.has(field) ? ' (FB)' : ''
}

function updateIgStatus(page: PageWithStatus) {
  page.igStatus = getIgStatus(page)
  page.missingIgFields = getMissingIgFields(page)
}

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
    let raw: PageInfo[]
    if (props.isPageToken) {
      const info = await getPageInfo(credentials.token)
      raw = [{ id: info.id, name: info.name, category: info.category, access_token: credentials.token }]
    } else {
      raw = await getPages(credentials.token)
    }
    pages.value = raw.map((p) => ({
      ...p,
      subscriptionStatus: null,
      missingFields: [],
      igAccount: null,
      igStatus: null,
      missingIgFields: [],
      subscribing: false,
      error: '',
    }))

    await Promise.all(
      pages.value.map(async (page) => {
        try {
          const [appsResult, igResult] = await Promise.allSettled([
            getPageSubscribedApps(page.id, page.access_token),
            getPageIgAccount(page.id, credentials.token),
          ])
          if (!active.value || page.subscribing) return

          if (appsResult.status === 'fulfilled') {
            const { status, missingFields } = evaluateSubscription(appsResult.value)
            page.subscriptionStatus = status
            page.missingFields = missingFields
            if (status !== 'full') {
              emit('missing', page.id, page.access_token)
            }
          } else {
            page.error = humanizeError(appsResult.reason)
          }

          page.igAccount = igResult.status === 'fulfilled' ? igResult.value : null
          updateIgStatus(page)
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
    updateIgStatus(page)
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
      <Column v-if="hasAnyIg" header="Instagram">
        <template #body="{ data }">
          <template v-if="data.igAccount">
            <div>{{ data.igAccount.username ?? data.igAccount.name ?? data.igAccount.id }}</div>
            <Tag
              v-if="data.igStatus === 'full'"
              v-tooltip="'Page subscription covers all Instagram messaging fields'"
              severity="success"
              value="Subscribed"
              class="ig-tag"
            />
            <Tag
              v-else-if="data.igStatus === 'partial'"
              v-tooltip="'Page subscription is missing some Instagram messaging fields — click Subscribe to fix'"
              severity="warn"
              value="Partial"
              class="ig-tag"
            />
            <div v-if="data.igStatus === 'full' || data.igStatus === 'partial'" class="field-tags">
              <Tag
                v-for="field in IG_SUBSCRIBED_FIELDS"
                :key="field"
                :value="field"
                :severity="data.missingIgFields.includes(field) ? 'danger' : 'secondary'"
                class="field-tag"
              />
            </div>
            <Tag
              v-if="data.igStatus === 'none'"
              v-tooltip="'Page subscription is missing Instagram messaging fields — click Subscribe to fix'"
              severity="danger"
              value="Not Subscribed"
              class="ig-tag"
            />
          </template>
          <span v-else class="text-muted">—</span>
        </template>
      </Column>
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
            severity="warn"
            value="Partial"
            icon="pi pi-exclamation-triangle"
          />
          <div v-if="data.subscriptionStatus === 'full' || data.subscriptionStatus === 'partial'" class="field-tags">
            <Tag
              v-for="field in expectedFields"
              :key="field"
              :value="field + fieldSuffix(field)"
              :severity="data.missingFields.includes(field) ? 'danger' : 'secondary'"
              class="field-tag"
            />
          </div>
          <Tag
            v-if="data.subscriptionStatus === 'none'"
            severity="danger"
            value="Not Subscribed"
            icon="pi pi-times"
          />
          <ProgressSpinner v-if="data.subscriptionStatus == null" style="width: 1rem; height: 1rem" />
        </template>
      </Column>
      <Column header="Action">
        <template #body="{ data }">
          <Button
            v-if="data.subscriptionStatus != null"
            label="Subscribe"
            icon="pi pi-plus"
            size="small"
            :disabled="data.subscriptionStatus === 'full'"
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

.field-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.25rem;
}

.field-tag {
  font-size: 0.7rem;
}

.ig-tag {
  margin-top: 0.25rem;
  font-size: 0.7rem;
}

.text-muted {
  color: var(--p-text-muted-color);
}
</style>
