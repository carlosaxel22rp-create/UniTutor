import type { NextFunction, Request, Response } from 'express'
import sanitizeHtml from 'sanitize-html'
import { Errors } from '../lib/errors.js'

/**
 * Sanitización de entradas (A03 — XSS / inyección / prototype pollution).
 *
 * Capa 1 de 3 contra XSS:
 *   1) Aquí: se elimina TODO HTML de los strings entrantes (la plataforma
 *      no acepta texto enriquecido), caracteres de control y Unicode
 *      bidi-override; se normaliza a NFC.
 *   2) zod valida forma, longitud y formato (validate.ts).
 *   3) Salida: React escapa por defecto + CSP estricta con nonce.
 *
 * SQL injection no se resuelve "limpiando" strings: se resuelve con
 * consultas parametrizadas (supabase-js/PostgREST y funciones SQL).
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const MAX_DEPTH = 6
const MAX_KEYS = 200
const MAX_STRING = 5_000

// C0/C1 salvo \t \n \r, y marcas bidi usadas en ataques "Trojan Source"
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩]/g

export function sanitizeString(value: string): string {
  const normalized = value.normalize('NFC').replace(CONTROL_CHARS, '')
  const stripped = sanitizeHtml(normalized, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    // decodificar entidades para que "&lt;script&gt;" no sobreviva codificado
    parser: { decodeEntities: true },
  })
  // sanitize-html re-codifica & < > en el texto; los devolvemos a texto plano
  return stripped.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[<>]/g, '').trim()
}

export function deepSanitize(input: unknown, depth = 0, counter = { keys: 0 }): unknown {
  if (depth > MAX_DEPTH) throw Errors.badRequest('Estructura demasiado profunda')

  if (typeof input === 'string') {
    if (input.length > MAX_STRING) throw Errors.badRequest('Texto demasiado largo')
    return sanitizeString(input)
  }
  if (Array.isArray(input)) {
    if (input.length > MAX_KEYS) throw Errors.badRequest('Demasiados elementos')
    return input.map((v) => deepSanitize(v, depth + 1, counter))
  }
  if (input !== null && typeof input === 'object') {
    const out: Record<string, unknown> = Object.create(null)
    for (const [key, value] of Object.entries(input)) {
      if (++counter.keys > MAX_KEYS) throw Errors.badRequest('Demasiados campos')
      // Prototype pollution y operadores estilo NoSQL ($where, a.b)
      if (FORBIDDEN_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
        throw Errors.badRequest('Campo no permitido')
      }
      out[key] = deepSanitize(value, depth + 1, counter)
    }
    return out
  }
  return input // number | boolean | null
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.body !== undefined && req.body !== null) req.body = deepSanitize(req.body)
    next()
  } catch (err) {
    next(err)
  }
}
