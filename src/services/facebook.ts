import type {
  DebugTokenData,
  WebhookSubscription,
  BusinessInfo,
  WabaInfo,
  SubscribedApp,
  PhoneNumber,
  PageInfo,
  IgAccount,
} from '../types/facebook'

const API_BASE = 'https://graph.facebook.com/v21.0'

interface GraphApiError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

async function graphFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new GraphError(`HTTP ${res.status} (non-JSON response)`, res.status)
  }
  if (!res.ok || (data as GraphApiError).error) {
    const err = (data as GraphApiError).error
    throw new GraphError(
      err?.message ?? `HTTP ${res.status}`,
      err?.code ?? res.status,
      err?.error_subcode,
    )
  }
  return data as T
}

export class GraphError extends Error {
  code: number
  subcode?: number

  constructor(message: string, code: number, subcode?: number) {
    super(message)
    this.name = 'GraphError'
    this.code = code
    this.subcode = subcode
  }
}

export async function debugToken(
  inputToken: string,
  appToken: string,
): Promise<DebugTokenData> {
  const data = await graphFetch<{ data: DebugTokenData }>(
    `${API_BASE}/debug_token?input_token=${encodeURIComponent(inputToken)}&access_token=${encodeURIComponent(appToken)}`,
  )
  return data.data
}

export async function getAppSubscriptions(
  appId: string,
  appToken: string,
): Promise<WebhookSubscription[]> {
  const data = await graphFetch<{ data: WebhookSubscription[] }>(
    `${API_BASE}/${appId}/subscriptions?access_token=${encodeURIComponent(appToken)}`,
  )
  return data.data
}

export async function getBusinesses(
  token: string,
): Promise<BusinessInfo[]> {
  const data = await graphFetch<{ data: BusinessInfo[] }>(
    `${API_BASE}/me/businesses?access_token=${encodeURIComponent(token)}`,
  )
  return data.data
}

export async function getOwnedWabas(
  businessId: string,
  token: string,
): Promise<WabaInfo[]> {
  const data = await graphFetch<{ data: WabaInfo[] }>(
    `${API_BASE}/${businessId}/owned_whatsapp_business_accounts?access_token=${encodeURIComponent(token)}`,
  )
  return data.data
}

const WABA_FIELDS = 'id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status,ownership_type'

export async function getWabaInfo(
  wabaId: string,
  token: string,
): Promise<WabaInfo> {
  return graphFetch<WabaInfo>(
    `${API_BASE}/${wabaId}?fields=${WABA_FIELDS}&access_token=${encodeURIComponent(token)}`,
  )
}

export async function getWabaSubscribedApps(
  wabaId: string,
  token: string,
): Promise<SubscribedApp[]> {
  // WABA subscribed_apps nests app info in whatsapp_business_api_data (unlike Page subscribed_apps)
  const data = await graphFetch<{ data: SubscribedApp[] }>(
    `${API_BASE}/${wabaId}/subscribed_apps?access_token=${encodeURIComponent(token)}`,
  )
  return data.data.map((item) => ({
    id: item.whatsapp_business_api_data?.id ?? item.id,
    name: item.whatsapp_business_api_data?.name ?? item.name,
  }))
}

export async function subscribeWaba(
  wabaId: string,
  token: string,
): Promise<void> {
  const data = await graphFetch<{ success: boolean }>(
    `${API_BASE}/${wabaId}/subscribed_apps?access_token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  )
  if (!data.success) {
    throw new GraphError('WABA subscribe returned success: false', 0)
  }
}

const PHONE_FIELDS = 'id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput,is_official_business_account,account_mode,is_pin_enabled,name_status,new_name_status,status,search_visibility,messaging_limit_tier'

export async function getPhoneNumbers(
  wabaId: string,
  token: string,
): Promise<PhoneNumber[]> {
  const data = await graphFetch<{ data: PhoneNumber[] }>(
    `${API_BASE}/${wabaId}/phone_numbers?fields=${PHONE_FIELDS}&access_token=${encodeURIComponent(token)}`,
  )
  return data.data
}

export async function getPageInfo(token: string): Promise<{ id: string; name: string; category?: string }> {
  return graphFetch<{ id: string; name: string; category?: string }>(
    `${API_BASE}/me?fields=id,name,category&access_token=${encodeURIComponent(token)}`,
  )
}

export async function getPages(
  token: string,
): Promise<PageInfo[]> {
  const data = await graphFetch<{ data: PageInfo[] }>(
    `${API_BASE}/me/accounts?access_token=${encodeURIComponent(token)}`,
  )
  return data.data
}

export async function getPageSubscribedApps(
  pageId: string,
  pageToken: string,
): Promise<SubscribedApp[]> {
  const data = await graphFetch<{ data: SubscribedApp[] }>(
    `${API_BASE}/${pageId}/subscribed_apps?fields=id,name,subscribed_fields&access_token=${encodeURIComponent(pageToken)}`,
  )
  return data.data
}

export const PAGE_SUBSCRIBED_FIELDS = [
  'messages', 'message_reactions', 'messaging_postbacks',
  'message_reads', 'standby',
] as const

export const IG_SUBSCRIBED_FIELDS = [
  'messages', 'message_reactions', 'messaging_postbacks',
] as const

export async function getPageIgAccount(
  pageId: string,
  token: string,
): Promise<IgAccount | null> {
  try {
    const data = await graphFetch<{ instagram_business_account?: IgAccount }>(
      `${API_BASE}/${pageId}?fields=instagram_business_account{id,name,username}&access_token=${encodeURIComponent(token)}`,
    )
    return data.instagram_business_account ?? null
  } catch (e) {
    // No IG permission or page has no IG account — expected, return null
    if (e instanceof GraphError && (e.code === 200 || e.code === 100)) {
      return null
    }
    throw e
  }
}

export async function subscribePageApp(
  pageId: string,
  pageToken: string,
): Promise<void> {
  const data = await graphFetch<{ success: boolean }>(
    `${API_BASE}/${pageId}/subscribed_apps?subscribed_fields=${PAGE_SUBSCRIBED_FIELDS.join(',')}&access_token=${encodeURIComponent(pageToken)}`,
    { method: 'POST' },
  )
  if (!data.success) {
    throw new GraphError('Page subscribe returned success: false', 0)
  }
}
