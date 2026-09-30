import { createHmac } from 'node:crypto'
import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createApp } from '../src/app.js'
import { verifyDailySignature } from '../src/lib/daily.js'
import { errorHandler } from '../src/middleware/error-handler.js'
import { createLimiterFactory } from '../src/middleware/rate-limit.js'
import { deepSanitize, sanitizeBody, sanitizeString } from '../src/middleware/sanitize.js'
import { requireJsonForMutations } from '../src/middleware/transport.js'
import { validate } from '../src/middleware/validate.js'
import { refundFor } from '../src/modules/bookings/bookings.routes.js'
import { CheckoutBody } from '../src/modules/checkout/checkout.schema.js'

describe('sanitización (XSS / prototype pollution)', () => {
  it('elimina etiquetas y atributos peligrosos', () => {
    expect(sanitizeString('<script>alert(1)</script>Hola')).toBe('Hola')
    expect(sanitizeString('<img src=x onerror=alert(1)>Bio')).toBe('Bio')
    expect(sanitizeString('Ver <a href="javascript:alert(1)">aquí</a>')).toBe('Ver aquí')
  })
  it('no deja pasar HTML codificado en entidades', () => {
    expect(sanitizeString('&lt;script&gt;alert(1)&lt;/script&gt;')).not.toMatch(/<|>/)
  })
  it('conserva texto legítimo con acentos y símbolos', () => {
    expect(sanitizeString('  Álgebra & Cálculo: 9.5/10 ✓ ')).toBe('Álgebra & Cálculo: 9.5/10 ✓')
  })
  it('elimina caracteres de control y bidi-override (Trojan Source)', () => {
    expect(sanitizeString('abc\u0000‮def')).toBe('abcdef')
  })
  it('rechaza __proto__, constructor y operadores $', () => {
    expect(() => deepSanitize(JSON.parse('{"__proto__":{"isAdmin":true}}'))).toThrow()
    expect(() => deepSanitize({ $where: '1==1' })).toThrow()
    expect(() => deepSanitize({ 'a.b': 1 })).toThrow()
  })
  it('rechaza estructuras excesivamente profundas', () => {
    let deep: unknown = 'x'
    for (let i = 0; i < 10; i++) deep = { n: deep }
    expect(() => deepSanitize(deep)).toThrow()
  })
  it('funciona como middleware de Express', async () => {
    const app = express()
    app.use(express.json())
    app.use(sanitizeBody)
    app.post('/', (req, res) => res.json(req.body))
    app.use(errorHandler)
    const r = await request(app).post('/').send({ comment: '<b onmouseover=x>Excelente</b> tutor' })
    expect(r.body.comment).toBe('Excelente tutor')
  })
})

describe('validación estricta (mass assignment)', () => {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => ((req.valid = {}), next()))
  app.post('/checkout', validate('body', CheckoutBody), (_req, res) => res.json({ ok: true }))
  app.use(errorHandler)

  const good = { tutorId: '2b8f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b', subjectId: 3, slots: ['2026-10-05T15:00:00-06:00'] }

  it('acepta un checkout válido', async () => {
    expect((await request(app).post('/checkout').send(good)).status).toBe(200)
  })
  it('rechaza campos extra como price_cents o status', async () => {
    const r = await request(app).post('/checkout').send({ ...good, price_cents: 1 })
    expect(r.status).toBe(400)
  })
  it('rechaza más de 10 slots y fechas no ISO', async () => {
    expect((await request(app).post('/checkout').send({ ...good, slots: Array(11).fill(good.slots[0]) })).status).toBe(400)
    expect((await request(app).post('/checkout').send({ ...good, slots: ['mañana'] })).status).toBe(400)
  })
  it('rechaza tutorId que no es UUID (inyección)', async () => {
    expect((await request(app).post('/checkout').send({ ...good, tutorId: "1' OR '1'='1" })).status).toBe(400)
  })
})

describe('rate limiting', () => {
  it('responde 429 JSON al exceder el límite', async () => {
    const create = createLimiterFactory(null)
    const app = express()
    app.use(create({ name: 't', windowMs: 60_000, limit: 3, keyBy: 'ip' }))
    app.get('/', (_req, res) => res.json({ ok: true }))
    for (let i = 0; i < 3; i++) expect((await request(app).get('/')).status).toBe(200)
    const r = await request(app).get('/')
    expect(r.status).toBe(429)
    expect(r.body.error.code).toBe('rate_limited')
    expect(r.headers['ratelimit-policy'] ?? r.headers['ratelimit']).toBeDefined()
  })
  it('limita por usuario autenticado de forma independiente', async () => {
    const create = createLimiterFactory(null)
    const app = express()
    app.use((req, _res, next) => {
      req.auth = { id: String(req.headers['x-user']), email: 'a@utom.edu.mx', role: 'student', aal: 'aal1', sessionId: null }
      next()
    })
    app.use(create({ name: 'u', windowMs: 60_000, limit: 1, keyBy: 'user' }))
    app.get('/', (_req, res) => res.json({ ok: true }))
    expect((await request(app).get('/').set('x-user', 'u1')).status).toBe(200)
    expect((await request(app).get('/').set('x-user', 'u1')).status).toBe(429)
    expect((await request(app).get('/').set('x-user', 'u2')).status).toBe(200)
  })
})

describe('CSRF: solo JSON en mutaciones', () => {
  const app = express()
  app.use(requireJsonForMutations)
  app.post('/', (_req, res) => res.json({ ok: true }))
  app.use(errorHandler)
  it('415 para formularios simples entre sitios', async () => {
    const r = await request(app).post('/').set('Content-Type', 'application/x-www-form-urlencoded').send('a=1')
    expect(r.status).toBe(415)
  })
  it('acepta application/json', async () => {
    expect((await request(app).post('/').send({ a: 1 })).status).toBe(200)
  })
})

describe('firma de webhooks Daily', () => {
  const secret = process.env.DAILY_WEBHOOK_HMAC!
  const body = JSON.stringify({ type: 'meeting.ended', payload: { room: 'ec-x' } })
  const sign = (ts: string, b: string) =>
    createHmac('sha256', Buffer.from(secret, 'base64')).update(`${ts}.${b}`).digest('base64')
  const now = Date.now()
  const ts = String(Math.floor(now / 1000))

  it('acepta firma válida', () => {
    expect(verifyDailySignature({ rawBody: body, timestamp: ts, signature: sign(ts, body), secretB64: secret, nowMs: now })).toBe(true)
  })
  it('rechaza cuerpo alterado', () => {
    expect(verifyDailySignature({ rawBody: body.replace('ended', 'started'), timestamp: ts, signature: sign(ts, body), secretB64: secret, nowMs: now })).toBe(false)
  })
  it('rechaza replay con timestamp viejo (> 5 min)', () => {
    const old = String(Math.floor(now / 1000) - 600)
    expect(verifyDailySignature({ rawBody: body, timestamp: old, signature: sign(old, body), secretB64: secret, nowMs: now })).toBe(false)
  })
  it('rechaza sin headers', () => {
    expect(verifyDailySignature({ rawBody: body, timestamp: undefined, signature: undefined, secretB64: secret })).toBe(false)
  })
})

describe('política de cancelación', () => {
  const b = { price_cents: 12000, tutor_id: 'T', start_at: new Date(Date.now() + 48 * 3_600_000).toISOString() }
  it('alumno ≥ 24 h → 100 %', () => expect(refundFor(b, 'S')).toEqual({ refund: 12000, late: false }))
  it('alumno < 24 h → 0 % y tardía', () =>
    expect(refundFor({ ...b, start_at: new Date(Date.now() + 3_600_000).toISOString() }, 'S')).toEqual({ refund: 0, late: true }))
  it('tutor cancela → 100 % siempre', () =>
    expect(refundFor({ ...b, start_at: new Date(Date.now() + 3_600_000).toISOString() }, 'T')).toEqual({ refund: 12000, late: false }))
})

describe('app: cabeceras, CORS y webhooks', () => {
  const app = createApp({
    production: false,
    corsOrigins: ['https://educonnect.utom.edu.mx'],
    authenticate: (_req, _res, next) => next(),
    redis: null,
  })

  it('cabeceras de seguridad y sin x-powered-by', async () => {
    const r = await request(app).get('/health')
    expect(r.headers['x-powered-by']).toBeUndefined()
    expect(r.headers['strict-transport-security']).toContain('max-age=63072000')
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['content-security-policy']).toContain("default-src 'none'")
  })
  it('CORS solo para el origen permitido', async () => {
    const ok = await request(app).options('/v1/checkout').set('Origin', 'https://educonnect.utom.edu.mx').set('Access-Control-Request-Method', 'POST')
    expect(ok.headers['access-control-allow-origin']).toBe('https://educonnect.utom.edu.mx')
    const bad = await request(app).options('/v1/checkout').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST')
    expect(bad.headers['access-control-allow-origin']).toBeUndefined()
  })
  it('413 con cuerpo > 20 kB', async () => {
    const r = await request(app).post('/v1/checkout').send({ big: 'x'.repeat(30_000) })
    expect(r.status).toBe(413)
  })
  it('400 con JSON malformado, sin filtrar detalles', async () => {
    const r = await request(app).post('/v1/checkout').set('Content-Type', 'application/json').send('{"a":')
    expect(r.status).toBe(400)
    expect(JSON.stringify(r.body)).not.toMatch(/stack|at .*\.js/)
  })
  it('webhook de Stripe con firma inválida → 400', async () => {
    const r = await request(app).post('/webhooks/stripe').set('stripe-signature', 't=1,v1=deadbeef').set('Content-Type', 'application/json').send('{"id":"evt_1"}')
    expect(r.status).toBe(400)
  })
  it('webhook de Daily sin firma → 401', async () => {
    const r = await request(app).post('/webhooks/daily').set('Content-Type', 'application/json').send('{"type":"meeting.ended"}')
    expect(r.status).toBe(401)
  })
  it('webhook de Daily: handshake {"test":"test"} firmado → 200', async () => {
    const secret = process.env.DAILY_WEBHOOK_HMAC!
    const body = '{"test":"test"}'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = createHmac('sha256', Buffer.from(secret, 'base64')).update(`${ts}.${body}`).digest('base64')
    const r = await request(app).post('/webhooks/daily').set('X-Webhook-Timestamp', ts).set('X-Webhook-Signature', sig).set('Content-Type', 'application/json').send(body)
    expect(r.status).toBe(200)
  })
  it('ruta inexistente → 404 JSON', async () => {
    expect((await request(app).get('/nope')).status).toBe(404)
  })
})

// evita warning de import sin uso en algunos editores
void z
