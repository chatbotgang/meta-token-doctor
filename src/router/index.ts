import { createRouter, createWebHashHistory } from 'vue-router'
import CredentialsView from '../views/CredentialsView.vue'
import DiagnosticView from '../views/DiagnosticView.vue'
import { useCredentialsStore } from '../stores/credentials'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'credentials',
      component: CredentialsView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DiagnosticView,
    },
  ],
})

router.beforeEach((to) => {
  if (to.name === 'dashboard') {
    const credentials = useCredentialsStore()
    if (!credentials.isReady) {
      return { name: 'credentials' }
    }
  }
})

export default router
