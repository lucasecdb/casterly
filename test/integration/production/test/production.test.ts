import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3001

describe('Production caching', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should cache responses for route manifests', async () => {
    await page.goto(`http://localhost:${port}/`, {
      waitUntil: 'networkidle2',
    })

    let manifestResponsePromise = page.waitForResponse((res) =>
      new URL(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.click('a[href="/back-link"]')

    let manifestResponse = await manifestResponsePromise

    expect(manifestResponse.fromCache()).toBe(false)

    manifestResponsePromise = page.waitForResponse((res) =>
      new URL(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.goBack()

    manifestResponse = await manifestResponsePromise

    expect(page.url()).toBe(`http://localhost:${port}/`)
    expect(manifestResponse.fromCache()).toBe(false)

    await expect(page.$('a[href="/back-link"]')).resolves.not.toBeNull()

    manifestResponsePromise = page.waitForResponse((res) =>
      new URL(res.url()).pathname.startsWith('/_casterly/route-manifest')
    )

    await page.goForward()

    manifestResponse = await manifestResponsePromise

    expect(manifestResponse.fromCache()).toBe(true)
  })
})
