import { resolve } from 'path'
import { parse as parseUrl } from 'url'

import { findPort, killServer, startServer } from '../../../test-utils'

describe('Production usage', () => {
  let serverHandle
  let port

  beforeAll(async () => {
    jest.setTimeout(15000)

    port = await findPort()
    serverHandle = await startServer(resolve(__dirname, '..'), port, {
      prod: true,
    })
  })

  afterAll(async () => {
    await killServer(serverHandle)
  })

  it('should cache responses for route manifests', async () => {
    await page.goto(`http://localhost:${port}/`, {
      waitUntil: 'networkidle2',
    })

    let manifestResponsePromise = page.waitForResponse((res) =>
      parseUrl(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.click('a[href="/back-link"]')

    let manifestResponse = await manifestResponsePromise

    expect(manifestResponse.fromCache()).toBe(false)

    manifestResponsePromise = page.waitForResponse((res) =>
      parseUrl(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.goBack()

    manifestResponse = await manifestResponsePromise

    expect(page.url()).toBe(`http://localhost:${port}/`)
    expect(manifestResponse.fromCache()).toBe(false)

    await expect(page.$('a[href="/back-link"]')).resolves.not.toBeNull()

    manifestResponsePromise = page.waitForResponse((res) =>
      parseUrl(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.goForward()

    manifestResponse = await manifestResponsePromise

    expect(manifestResponse.fromCache()).toBe(true)
  })
})
