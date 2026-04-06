import { createHash, randomBytes } from 'crypto'

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): string {
  // Format: poc_live_<32 bytes hex>
  return `poc_live_${randomBytes(32).toString('hex')}`
}
