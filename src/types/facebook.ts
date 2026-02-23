export interface DebugTokenData {
  app_id: string
  type: string
  application: string
  data_access_expires_at: number
  expires_at: number
  is_valid: boolean
  issued_at: number
  scopes?: string[]
  granular_scopes?: GranularScope[]
  user_id: string
  profile_id?: string
  metadata?: Record<string, unknown>
  error?: TokenError
}

export interface GranularScope {
  scope: string
  target_ids?: string[]
}

export interface TokenError {
  code: number
  message: string
  subcode?: number
}

export interface WebhookSubscription {
  object: string
  callback_url: string
  active: boolean
  fields: WebhookField[]
}

export interface WebhookField {
  name: string
  version: string
}

export interface SubscribedApp {
  id?: string
  name?: string
  subscribed_fields?: string[]
  whatsapp_business_api_data?: {
    id: string
    link: string
    name: string
  }
}

export interface PhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  quality_rating?: string
  code_verification_status?: string
  platform_type?: string
  throughput?: { level: string }
  is_official_business_account?: boolean
  account_mode?: string
  is_pin_enabled?: boolean
  name_status?: string
  new_name_status?: string
  status?: string
  search_visibility?: string
  messaging_limit_tier?: string
}

export interface WabaInfo {
  id: string
  name?: string
  currency?: string
  timezone_id?: string
  message_template_namespace?: string
  account_review_status?: string
  business_verification_status?: string
  ownership_type?: string
}

export interface PageInfo {
  id: string
  name: string
  access_token: string
  category?: string
  tasks?: string[]
}

export interface BusinessInfo {
  id: string
  name: string
}
