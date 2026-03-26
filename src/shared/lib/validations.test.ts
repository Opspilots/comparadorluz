import { describe, it, expect } from 'vitest'
import {
  customerSchema,
  contactSchema,
  supplyPointSchema,
  loginSchema,
  commissionerSchema,
  campaignSchema,
  contractSchema,
  getFirstZodError,
} from './validations'

describe('customerSchema', () => {
  const validCustomer = {
    cif: 'B12345678',
    name: 'Empresa Test S.L.',
    customerType: 'empresa' as const,
    status: 'prospecto' as const,
  }

  it('accepts valid empresa CIF', () => {
    expect(customerSchema.safeParse(validCustomer).success).toBe(true)
  })

  it('accepts valid NIF (particular)', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      cif: '12345678A',
      customerType: 'particular',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid NIE', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      cif: 'X1234567A',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty CIF', () => {
    const result = customerSchema.safeParse({ ...validCustomer, cif: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid CIF format', () => {
    const result = customerSchema.safeParse({ ...validCustomer, cif: '123' })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase CIF', () => {
    const result = customerSchema.safeParse({ ...validCustomer, cif: 'b12345678' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = customerSchema.safeParse({ ...validCustomer, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = customerSchema.safeParse({ ...validCustomer, status: 'invalido' })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = customerSchema.safeParse({
      ...validCustomer,
      province: 'Madrid',
      city: 'Madrid',
      address: 'Calle Test 1',
    })
    expect(result.success).toBe(true)
  })
})

describe('contactSchema', () => {
  it('accepts valid contact', () => {
    const result = contactSchema.safeParse({
      firstName: 'Juan',
      lastName: 'García',
      email: 'juan@test.com',
      phone: '+34 600 123 456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty firstName', () => {
    const result = contactSchema.safeParse({
      firstName: '',
      lastName: 'García',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty email (optional)', () => {
    const result = contactSchema.safeParse({
      firstName: 'Juan',
      lastName: 'García',
      email: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('supplyPointSchema', () => {
  it('accepts valid CUPS', () => {
    const result = supplyPointSchema.safeParse({
      cups: 'ES0021000000000001AA',
      address: 'Calle Test 1',
      tariffType: '2.0TD',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short CUPS', () => {
    const result = supplyPointSchema.safeParse({
      cups: 'ES001',
      address: 'Calle Test',
      tariffType: '2.0TD',
    })
    expect(result.success).toBe(false)
  })

  it('rejects CUPS without ES prefix', () => {
    const result = supplyPointSchema.safeParse({
      cups: 'FR0021000000000001AA',
      address: 'Calle Test',
      tariffType: '2.0TD',
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: 'Secure1!pass',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })
})

describe('commissionerSchema', () => {
  it('accepts valid commissioner', () => {
    const result = commissionerSchema.safeParse({
      fullName: 'María López',
      commissionPct: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects commission over 100', () => {
    const result = commissionerSchema.safeParse({
      fullName: 'Test',
      commissionPct: 150,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative commission', () => {
    const result = commissionerSchema.safeParse({
      fullName: 'Test',
      commissionPct: -5,
    })
    expect(result.success).toBe(false)
  })
})

describe('campaignSchema', () => {
  it('requires subject for email campaigns', () => {
    const result = campaignSchema.safeParse({
      name: 'Test Campaign',
      channel: 'email',
      body: 'Test body',
      subject: '',
    })
    expect(result.success).toBe(false)
  })

  it('does not require subject for whatsapp', () => {
    const result = campaignSchema.safeParse({
      name: 'Test Campaign',
      channel: 'whatsapp',
      body: 'Test body',
    })
    expect(result.success).toBe(true)
  })
})

describe('contractSchema', () => {
  it('requires customerId and tariffVersionId', () => {
    const result = contractSchema.safeParse({
      signedAt: '2026-03-22',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid contract', () => {
    const result = contractSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      tariffVersionId: '550e8400-e29b-41d4-a716-446655440001',
      signedAt: '2026-03-22',
    })
    expect(result.success).toBe(true)
  })
})

describe('getFirstZodError', () => {
  it('returns null for success', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'Test123!' })
    expect(getFirstZodError(result)).toBeNull()
  })

  it('returns first error message on failure', () => {
    const result = loginSchema.safeParse({ email: '', password: '' })
    const msg = getFirstZodError(result)
    expect(msg).toBeTruthy()
    expect(typeof msg).toBe('string')
  })
})
