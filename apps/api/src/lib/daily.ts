import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Cliente mínimo de la REST API de Daily.co (sin SDK: menos superficie).
 * Docs: https://docs.daily.co/reference/rest-api
 */
const BASE = 'https://api.daily.co/v1'

async function daily<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.DAILY_API_KEY}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw Object.assign(new Error(`Daily ${init.method ?? 'GET'} ${path} → ${res.status}`), { status: res.status, body: text })
  }
  return (await res.json()) as T
}

export interface DailyRoomOptions {
  name: string
  /** epoch s: la sala no admite entradas antes */
  nbf: number
  /** epoch s: la sala deja de existir y expulsa a todos */
  exp: number
}

export async function createPrivateRoom(o: DailyRoomOptions): Promise<{ name: string; url: string }> {
  try {
    return await daily('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: o.name,
        privacy: 'private', // solo con meeting token
        properties: {
          nbf: o.nbf,
          exp: o.exp,
          eject_at_room_exp: true,
          max_participants: 2,
          enable_knocking: false,
          enable_prejoin_ui: true,
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: false, // sin grabaciones → sin datos biométricos almacenados
          lang: 'es',
        },
      }),
    })
  } catch (err) {
    // Idempotencia: si ya existe (reintento de webhook), la reutilizamos
    if ((err as { status?: number }).status === 400 && String((err as { body?: string }).body).includes('already exists')) {
      return { name: o.name, url: roomUrl(o.name) }
    }
    throw err
  }
}

export async function deleteRoom(name: string): Promise<void> {
  try {
    await daily(`/rooms/${encodeURIComponent(name)}`, { method: 'DELETE' })
  } catch (err) {
    if ((err as { status?: number }).status !== 404) throw err
  }
}

export interface MeetingTokenOptions {
  roomName: string
  userId: string
  userName: string
  isOwner: boolean
  nbf: number
  exp: number
}

/** Token EFÍMERO por participante. Nunca se guarda en BD. */
export async function createMeetingToken(o: MeetingTokenOptions): Promise<string> {
  const { token } = await daily<{ token: string }>('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: o.roomName,
        user_id: o.userId,
        user_name: o.userName,
        is_owner: o.isOwner,
        nbf: o.nbf,
        exp: o.exp,
        eject_at_token_exp: true,
        enable_recording: false,
      },
    }),
  })
  return token
}

export const roomUrl = (name: string) => `https://${env.DAILY_DOMAIN}.daily.co/${name}`

/**
 * Verifica la firma de un webhook de Daily:
 *   base64( HMAC-SHA256( base64decode(secret), `${timestamp}.${rawBody}` ) )
 * + ventana de 5 min contra replay. Comparación en tiempo constante.
 */
export function verifyDailySignature(params: {
  rawBody: string
  timestamp: string | undefined
  signature: string | undefined
  secretB64: string
  nowMs?: number
  toleranceSec?: number
}): boolean {
  const { rawBody, timestamp, signature, secretB64 } = params
  if (!timestamp || !signature || !/^\d{10,13}$/.test(timestamp)) return false

  const tsMs = timestamp.length === 13 ? Number(timestamp) : Number(timestamp) * 1000
  const skew = Math.abs((params.nowMs ?? Date.now()) - tsMs) / 1000
  if (skew > (params.toleranceSec ?? 300)) return false

  const expected = createHmac('sha256', Buffer.from(secretB64, 'base64')).update(`${timestamp}.${rawBody}`).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  return given.length === expected.length && timingSafeEqual(given, expected)
}
