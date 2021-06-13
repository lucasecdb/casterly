import { Headers, Request, Response, fetch } from './fetch'

export function installGlobals() {
  const anyGlobal = global as any

  anyGlobal.Headers = Headers
  anyGlobal.Request = Request
  anyGlobal.Response = Response
  anyGlobal.fetch = fetch
}
