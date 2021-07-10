import { resolve } from 'path'

import { findPort, killServer, startServer } from '../../../test-utils'

describe('Hello World', () => {
  let serverHandle
  let port

  beforeAll(async () => {
    port = await findPort()
    serverHandle = await startServer(resolve(__dirname, '..'), port)
  })

  afterAll(async () => {
    await killServer(serverHandle)
  })

  it('should request for dynamic component only during hydration', async () => {
    await page.setRequestInterception(true)

    let dynamicComponentRequested = false

    page.on('request', (request) => {
      if (request.url().includes('dynamic-component.js')) {
        dynamicComponentRequested = true
      }

      request.continue()
    })

    await page.goto(`http://localhost:${port}/`)

    let content = await page.content()

    expect(content).toMatch('Hello from dynamic component!')
    expect(content).not.toMatch('dynamic-component.js')

    expect(dynamicComponentRequested).toBe(false)

    await page.waitForFunction('window.reactIsHydrated === true')

    expect(dynamicComponentRequested).toBe(true)

    await page.waitForResponse((req) =>
      req.url().includes('dynamic-component.js')
    )

    await page.click('button')

    content = await page.content()

    // Make sure the component is hydrated and
    // event handlers work as expected
    expect(content).toMatch('Hello from alternate message!')
  })
})
