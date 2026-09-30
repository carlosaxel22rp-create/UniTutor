import { z } from 'zod'

/**
 * Lo único que el cliente decide: CON QUIÉN, QUÉ materia y CUÁNDO.
 * El precio, la comisión y el estado los calcula el servidor.
 * strictObject → cualquier campo extra (price, status…) = 400.
 */
export const CheckoutBody = z.strictObject({
  tutorId: z.uuid(),
  subjectId: z.number().int().positive(),
  slots: z
    .array(z.iso.datetime({ offset: true }))
    .min(1, 'Selecciona al menos un horario')
    .max(10, 'Máximo 10 horarios por pago'),
})
export type CheckoutBody = z.infer<typeof CheckoutBody>

export const IdempotencyHeader = z.uuid({ message: 'Idempotency-Key debe ser un UUID' })
