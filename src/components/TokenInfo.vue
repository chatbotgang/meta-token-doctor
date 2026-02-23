<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DebugTokenData } from '../types/facebook'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'

const props = defineProps<{
  data: DebugTokenData | null
  loading: boolean
  error: string
}>()

const showRaw = ref(false)

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never / No limit'
  return new Date(ts * 1000).toLocaleString()
}

const validitySeverity = computed(() => {
  if (!props.data) return undefined
  return props.data.is_valid ? 'success' : 'danger'
})

const rawJson = computed(() => {
  return JSON.stringify(props.data, null, 2)
})
</script>

<template>
  <div>
    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
      Loading token info...
    </div>

    <Message v-else-if="error" severity="error">
      {{ error }}
    </Message>

    <template v-else-if="data">
      <Message v-if="data.error" severity="error">
        Token error: {{ data.error.message }} (code {{ data.error.code }})
      </Message>

      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Status</span>
          <Tag :severity="validitySeverity" :value="data.is_valid ? 'Valid' : 'Invalid'" />
        </div>

        <div class="info-item">
          <span class="info-label">Type</span>
          <Tag severity="info" :value="data.type" />
        </div>

        <div class="info-item">
          <span class="info-label">App</span>
          <span>{{ data.application }} ({{ data.app_id }})</span>
        </div>

        <div class="info-item">
          <span class="info-label">User ID</span>
          <span>{{ data.user_id }}</span>
        </div>

        <div v-if="data.profile_id" class="info-item">
          <span class="info-label">Profile ID</span>
          <span>{{ data.profile_id }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Issued at</span>
          <span>{{ formatTimestamp(data.issued_at) }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Expires at</span>
          <span>{{ formatTimestamp(data.expires_at) }}</span>
        </div>

        <div class="info-item">
          <span class="info-label">Data access expires</span>
          <span>{{ formatTimestamp(data.data_access_expires_at) }}</span>
        </div>
      </div>

      <h3>Scopes</h3>
      <div class="scopes-list">
        <Tag v-for="scope in data.scopes ?? []" :key="scope" :value="scope" severity="secondary" />
      </div>

      <h3>Granular Scopes</h3>
      <DataTable :value="data.granular_scopes ?? []" size="small" striped-rows>
        <Column field="scope" header="Scope" />
        <Column header="Target IDs">
          <template #body="{ data: row }">
            <template v-if="row.target_ids?.length">
              <Tag
                v-for="id in row.target_ids"
                :key="id"
                :value="id"
                severity="info"
                class="target-tag"
              />
            </template>
            <span v-else class="text-muted">All</span>
          </template>
        </Column>
      </DataTable>

      <div class="raw-toggle">
        <Button
          :label="showRaw ? 'Hide raw JSON' : 'Show raw JSON'"
          :icon="showRaw ? 'pi pi-eye-slash' : 'pi pi-eye'"
          severity="secondary"
          text
          size="small"
          @click="showRaw = !showRaw"
        />
      </div>
      <pre v-if="showRaw" class="raw-json">{{ rawJson }}</pre>
    </template>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  overflow-wrap: anywhere;
  min-width: 0;
}

.info-label {
  font-weight: 600;
  min-width: 140px;
  flex-shrink: 0;
  color: var(--p-text-muted-color);
}

.scopes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.target-tag {
  margin-right: 0.25rem;
}

.text-muted {
  color: var(--p-text-muted-color);
  font-style: italic;
}

.raw-toggle {
  margin-top: 1rem;
}

.raw-json {
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.8rem;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}

h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
</style>
