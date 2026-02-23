<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCredentialsStore } from '../stores/credentials'
import { subscribeWaba, subscribePageApp } from '../services/facebook'
import Button from 'primevue/button'
import Message from 'primevue/message'

const props = defineProps<{
  missingWabas: string[]
  missingPages: { id: string; token: string }[]
}>()

const emit = defineEmits<{
  fixed: []
}>()

const credentials = useCredentialsStore()
const fixing = ref(false)
const results = ref<{ success: number; failures: string[] } | null>(null)

const totalMissing = computed(() => props.missingWabas.length + props.missingPages.length)

async function fixAll() {
  if (fixing.value) return
  fixing.value = true
  results.value = null
  let success = 0
  const failures: string[] = []

  const wabaPromises = props.missingWabas.map(async (id) => {
    try {
      await subscribeWaba(id, credentials.token)
      success++
    } catch (e) {
      failures.push(`WABA ${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  })

  const pagePromises = props.missingPages.map(async ({ id, token }) => {
    try {
      await subscribePageApp(id, token)
      success++
    } catch (e) {
      failures.push(`Page ${id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  })

  await Promise.allSettled([...wabaPromises, ...pagePromises])
  results.value = { success, failures }
  fixing.value = false

  if (success > 0) {
    emit('fixed')
  }
}
</script>

<template>
  <div class="fix-all">
    <Button
      :label="`Fix ${totalMissing} Missing Subscription${totalMissing > 1 ? 's' : ''}`"
      icon="pi pi-wrench"
      severity="warn"
      :loading="fixing"
      @click="fixAll"
    />

    <template v-if="results">
      <Message v-if="results.success > 0" severity="success">
        Successfully subscribed {{ results.success }} account(s).
      </Message>
      <Message v-for="fail in results.failures" :key="fail" severity="error">
        {{ fail }}
      </Message>
    </template>
  </div>
</template>

<style scoped>
.fix-all {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--p-surface-200);
}
</style>
