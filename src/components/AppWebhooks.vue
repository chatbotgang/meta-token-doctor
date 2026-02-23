<script setup lang="ts">
import type { WebhookSubscription, WebhookField } from '../types/facebook'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

defineProps<{
  subscriptions: WebhookSubscription[]
  loading: boolean
  error: string
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="loading">
      <ProgressSpinner style="width: 2rem; height: 2rem" />
      Loading subscriptions...
    </div>

    <Message v-else-if="error" severity="error">
      {{ error }}
    </Message>

    <Message v-else-if="subscriptions.length === 0" severity="warn">
      No webhook subscriptions found for this app.
    </Message>

    <DataTable
      v-else
      :value="subscriptions"
      size="small"
      striped-rows
      row-group-mode="subheader"
      group-rows-by="object"
      sort-field="object"
      :sort-order="1"
    >
      <Column field="object" header="Object" />
      <Column field="callback_url" header="Callback URL" />
      <Column header="Active">
        <template #body="{ data }">
          <Tag
            :severity="data.active ? 'success' : 'danger'"
            :value="data.active ? 'Active' : 'Inactive'"
          />
        </template>
      </Column>
      <Column header="Fields">
        <template #body="{ data }">
          <span class="fields-list">
            {{ data.fields.map((f: WebhookField) => `${f.name} (${f.version})`).join(', ') }}
          </span>
        </template>
      </Column>
      <template #groupheader="{ data }">
        <div class="group-header">
          <Tag :value="data.object" severity="info" />
        </div>
      </template>
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

.fields-list {
  font-size: 0.85rem;
}

.group-header {
  font-weight: 600;
}
</style>
