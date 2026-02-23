<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCredentialsStore } from '../stores/credentials'
import { debugToken, getAppSubscriptions } from '../services/facebook'
import type { DebugTokenData, WebhookSubscription } from '../types/facebook'
import Button from 'primevue/button'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import TokenInfo from '../components/TokenInfo.vue'
import AppWebhooks from '../components/AppWebhooks.vue'
import WabaSection from '../components/WabaSection.vue'
import PageSection from '../components/PageSection.vue'
import FixAllButton from '../components/FixAllButton.vue'

const router = useRouter()
const credentials = useCredentialsStore()

const tokenData = ref<DebugTokenData | null>(null)
const tokenLoading = ref(false)
const tokenError = ref('')

const subscriptions = ref<WebhookSubscription[]>([])
const subsLoading = ref(false)
const subsError = ref('')

const missingWabas = ref<string[]>([])
const missingPages = ref<{ id: string; token: string }[]>([])

function registerMissingWaba(wabaId: string) {
  if (!missingWabas.value.includes(wabaId)) {
    missingWabas.value.push(wabaId)
  }
}

function unregisterMissingWaba(wabaId: string) {
  missingWabas.value = missingWabas.value.filter((id) => id !== wabaId)
}

function registerMissingPage(pageId: string, pageToken: string) {
  if (!missingPages.value.some((p) => p.id === pageId)) {
    missingPages.value.push({ id: pageId, token: pageToken })
  }
}

function unregisterMissingPage(pageId: string) {
  missingPages.value = missingPages.value.filter((p) => p.id !== pageId)
}

const hasPageScope = ref(false)

async function loadTokenInfo() {
  tokenLoading.value = true
  tokenError.value = ''
  try {
    tokenData.value = await debugToken(credentials.token, credentials.appToken)
    const scopes = tokenData.value.scopes ?? []
    hasPageScope.value =
      scopes.includes('pages_show_list') || scopes.includes('pages_manage_metadata')
  } catch (e) {
    tokenError.value = e instanceof Error ? e.message : String(e)
  } finally {
    tokenLoading.value = false
  }
}

async function loadSubscriptions() {
  subsLoading.value = true
  subsError.value = ''
  try {
    subscriptions.value = await getAppSubscriptions(credentials.appId, credentials.appToken)
  } catch (e) {
    subsError.value = e instanceof Error ? e.message : String(e)
  } finally {
    subsLoading.value = false
  }
}

const refreshKey = ref(0)

async function refreshAll() {
  missingWabas.value = []
  missingPages.value = []
  await Promise.all([loadTokenInfo(), loadSubscriptions()])
  refreshKey.value++
}

function goBack() {
  credentials.clear()
  router.push({ name: 'credentials' })
}

onMounted(() => {
  loadTokenInfo()
  loadSubscriptions()
})
</script>

<template>
  <div class="diagnostic-view">
    <div class="toolbar">
      <div class="toolbar-left">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          @click="goBack"
        />
        <h1>
          <i class="pi pi-search" />
          Meta Token Doctor
        </h1>
        <span v-if="tokenData?.application" class="app-name">
          {{ tokenData.application }}
        </span>
      </div>
      <Button
        label="Refresh All"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        @click="refreshAll"
      />
    </div>

    <Accordion :value="['token', 'webhooks', 'wabas', 'pages']" multiple>
      <AccordionPanel value="token">
        <AccordionHeader>
          <i class="pi pi-key" />
          Token Info
        </AccordionHeader>
        <AccordionContent>
          <TokenInfo
            :data="tokenData"
            :loading="tokenLoading"
            :error="tokenError"
          />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="webhooks">
        <AccordionHeader>
          <i class="pi pi-link" />
          App Webhook Subscriptions
        </AccordionHeader>
        <AccordionContent>
          <AppWebhooks
            :subscriptions="subscriptions"
            :loading="subsLoading"
            :error="subsError"
          />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel value="wabas">
        <AccordionHeader>
          <i class="pi pi-comments" />
          WhatsApp Business Accounts
        </AccordionHeader>
        <AccordionContent>
          <WabaSection
            :key="refreshKey"
            :token-data="tokenData"
            @missing="registerMissingWaba"
            @subscribed="unregisterMissingWaba"
          />
        </AccordionContent>
      </AccordionPanel>

      <AccordionPanel v-if="hasPageScope" value="pages">
        <AccordionHeader>
          <i class="pi pi-facebook" />
          Pages
        </AccordionHeader>
        <AccordionContent>
          <PageSection
            :key="refreshKey"
            @missing="registerMissingPage"
            @subscribed="unregisterMissingPage"
          />
        </AccordionContent>
      </AccordionPanel>
    </Accordion>

    <FixAllButton
      v-if="missingWabas.length > 0 || missingPages.length > 0"
      :missing-wabas="missingWabas"
      :missing-pages="missingPages"
      @fixed="refreshAll"
    />
  </div>
</template>

<style scoped>
.diagnostic-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-left h1 {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.app-name {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  padding: 0.15rem 0.6rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
