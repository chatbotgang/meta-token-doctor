import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type StorageMode = 'none' | 'session' | 'local'

const STORAGE_PREFIX = 'meta-token-doctor'
const KEYS = {
  appId: `${STORAGE_PREFIX}:appId`,
  appSecret: `${STORAGE_PREFIX}:appSecret`,
  token: `${STORAGE_PREFIX}:token`,
  storageMode: `${STORAGE_PREFIX}:storageMode`,
} as const

function getStorage(mode: StorageMode): Storage | null {
  try {
    if (mode === 'session') return sessionStorage
    if (mode === 'local') return localStorage
  } catch {
    // Private browsing or storage disabled
  }
  return null
}

function readStorageMode(): StorageMode {
  // Each storage only trusts its own matching value
  try {
    if (sessionStorage.getItem(KEYS.storageMode) === 'session') return 'session'
  } catch {}
  try {
    if (localStorage.getItem(KEYS.storageMode) === 'local') return 'local'
  } catch {}
  return 'none'
}

export const useCredentialsStore = defineStore('credentials', () => {
  const appId = ref('')
  const appSecret = ref('')
  const token = ref('')
  const storageMode = ref<StorageMode>(readStorageMode())

  const appToken = computed(() => {
    return `${appId.value}|${appSecret.value}`
  })

  const isReady = computed(() => {
    return appId.value.length > 0 && appSecret.value.length > 0 && token.value.length > 0
  })

  function loadFromStorage() {
    const storage = getStorage(storageMode.value)
    if (!storage) return
    try {
      appId.value = storage.getItem(KEYS.appId) ?? ''
      appSecret.value = storage.getItem(KEYS.appSecret) ?? ''
      token.value = storage.getItem(KEYS.token) ?? ''
    } catch {
      // Storage read failed
    }
  }

  function saveToStorage() {
    const storage = getStorage(storageMode.value)
    if (!storage) return
    try {
      storage.setItem(KEYS.appId, appId.value)
      storage.setItem(KEYS.appSecret, appSecret.value)
      storage.setItem(KEYS.token, token.value)
      storage.setItem(KEYS.storageMode, storageMode.value)
    } catch {
      // Storage write failed (e.g. quota exceeded)
    }
  }

  function clearStorageData(mode: StorageMode) {
    const storage = getStorage(mode)
    if (!storage) return
    try {
      storage.removeItem(KEYS.appId)
      storage.removeItem(KEYS.appSecret)
      storage.removeItem(KEYS.token)
      storage.removeItem(KEYS.storageMode)
    } catch {
      // Storage clear failed
    }
  }

  function setStorageMode(newMode: StorageMode) {
    const oldMode = storageMode.value
    if (newMode === oldMode) return

    // Safe migration: save to new storage first
    const newStorage = getStorage(newMode)
    if (newMode !== 'none' && !newStorage) return
    if (newStorage) {
      try {
        newStorage.setItem(KEYS.appId, appId.value)
        newStorage.setItem(KEYS.appSecret, appSecret.value)
        newStorage.setItem(KEYS.token, token.value)
        newStorage.setItem(KEYS.storageMode, newMode)
      } catch {
        // Save to new storage failed — keep old mode
        return
      }
    }

    // Clear old storage
    clearStorageData(oldMode)

    // Update mode ref
    storageMode.value = newMode
  }

  function clear() {
    clearStorageData('session')
    clearStorageData('local')
    appId.value = ''
    appSecret.value = ''
    token.value = ''
    storageMode.value = 'none'
  }

  // Load credentials from active storage on init
  loadFromStorage()

  return { appId, appSecret, token, appToken, isReady, storageMode, saveToStorage, setStorageMode, clear }
})
