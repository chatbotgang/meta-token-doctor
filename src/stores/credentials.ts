import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useCredentialsStore = defineStore('credentials', () => {
  const appId = ref('')
  const appSecret = ref('')
  const token = ref('')

  const appToken = computed(() => {
    return `${appId.value}|${appSecret.value}`
  })

  const isReady = computed(() => {
    return appId.value.length > 0 && appSecret.value.length > 0 && token.value.length > 0
  })

  function clear() {
    appId.value = ''
    appSecret.value = ''
    token.value = ''
  }

  return { appId, appSecret, token, appToken, isReady, clear }
})
