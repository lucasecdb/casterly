import type { Readable, Writable } from 'stream'

export interface ResponseObject {
  status: number
  outgoingHeaders?: Record<string, string>
  body?: string | Writable | Readable | null
  onReadyToStream?: () => void
}
