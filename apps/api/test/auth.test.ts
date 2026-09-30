import express from 'express'
import { exportJWK, generateKeyPair, jwtVerify, SignJWT, createLocalJWKSet, type KeyObject } from 'jose'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createAuthenticate, type Role } from '../src/middleware/authenticate.js'
import { errorHandler } from '../src/middleware/error-handler.js'
import { requireMfa, requireRole } from '../src/middleware/require-role.js'

const ISS = 'https://test-project.supabase.co/auth/v1'
const UID = '2b8f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b'
const users: Record<string, { email: string; role: Role; status: 'active' | 'suspended' | 'banned' }> = {
  [UID]: { email: 'camila.r@utom.edu.mx', role: 'student', status: 'active' },
  '3c9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b': { email: 'x@utom.edu.mx', role: 'tutor', status: 'suspended' },
  '4d9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b': { email: 'legacy@gmail.com', role: 'student', status: 'active' },
  '5e9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b': { email: 'admin@utom.edu.mx', role: 'admin', status: 'active' },
}

let privateKey: KeyObject
let otherKey: KeyObject
let app: express.Express

async function token(opts: { sub?: string; aud?: string; exp?: string; key?: KeyObject; claims?: Record<string, unknown> } = {}) {
  return new SignJWT({ role: 'authenticated', aal: 'aal1', ...opts.claims })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setIssuer(ISS)
    .setAudience(opts.aud ?? 'authenticated')
    .setSubject(opts.sub ?? UID)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(opts.key ?? privateKey)
}

beforeAll(async () => {
  const kp = await generateKeyPair('ES256')
  privateKey = kp.privateKey as KeyObject
  otherKey = (await generateKeyPair('ES256')).privateKey as KeyObject
  const jwk = { ...(await exportJWK(kp.publicKey)), kid: 'k1', alg: 'ES256' }
  const jwks = createLocalJWKSet({ keys: [jwk] })

  const authenticate = createAuthenticate({
    verifyToken: async (t) => (await jwtVerify(t, jwks, { issuer: ISS, audience: 'authenticated', algorithms: ['ES256'] })).payload,
    loadUser: async (id) => users[id] ?? null,
  })

  app = express()
  app.use(authenticate)
  app.get('/me', (req, res) => res.json(req.auth))
  app.get('/tutor-only', requireRole('tutor'), (_req, res) => res.json({ ok: true }))
  app.get('/admin', requireRole('admin'), requireMfa, (_req, res) => res.json({ ok: true }))
  app.use(errorHandler)
})

describe('authenticate', () => {
  it('401 sin header Authorization', async () => {
    const r = await request(app).get('/me')
    expect(r.status).toBe(401)
  })

  it('401 con esquema distinto a Bearer o token malformado', async () => {
    expect((await request(app).get('/me').set('Authorization', `Basic abc`)).status).toBe(401)
    expect((await request(app).get('/me').set('Authorization', `Bearer not-a-jwt`)).status).toBe(401)
  })

  it('401 con firma de otra clave (token forjado)', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ key: otherKey })}`)
    expect(r.status).toBe(401)
  })

  it('401 con token expirado', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ exp: '-10m' })}`)
    expect(r.status).toBe(401)
    expect(r.body.error.message).toBe('Sesión inválida o expirada') // no revela la causa
  })

  it('401 con audiencia incorrecta (p.ej. token anon)', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ aud: 'anon' })}`)
    expect(r.status).toBe(401)
  })

  it('401 si el usuario ya no existe en BD', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ sub: '9f9f9f9f-8a2a-4b52-9f0e-1c2d3e4f5a6b' })}`)
    expect(r.status).toBe(401)
  })

  it('403 si la cuenta está suspendida (efecto inmediato aunque el JWT sea válido)', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ sub: '3c9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b' })}`)
    expect(r.status).toBe(403)
  })

  it('403 si el correo no es institucional', async () => {
    const r = await request(app).get('/me').set('Authorization', `Bearer ${await token({ sub: '4d9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b' })}`)
    expect(r.status).toBe(403)
  })

  it('200 y el rol sale de la BD, no del claim del JWT', async () => {
    const t = await token({ claims: { user_role: 'admin', app_metadata: { role: 'admin' } } })
    const r = await request(app).get('/me').set('Authorization', `Bearer ${t}`)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: UID, role: 'student', aal: 'aal1' })
  })
})

describe('requireRole / requireMfa', () => {
  it('403 alumno en ruta de tutor', async () => {
    const r = await request(app).get('/tutor-only').set('Authorization', `Bearer ${await token()}`)
    expect(r.status).toBe(403)
  })

  it('403 admin sin MFA (aal1)', async () => {
    const r = await request(app).get('/admin').set('Authorization', `Bearer ${await token({ sub: '5e9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b' })}`)
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('mfa_required')
  })

  it('200 admin con MFA (aal2)', async () => {
    const t = await token({ sub: '5e9f1c1e-8a2a-4b52-9f0e-1c2d3e4f5a6b', claims: { aal: 'aal2' } })
    const r = await request(app).get('/admin').set('Authorization', `Bearer ${t}`)
    expect(r.status).toBe(200)
  })
})
