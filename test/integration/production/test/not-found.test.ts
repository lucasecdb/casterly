import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3001

describe('Not found', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should correctly return not found route with 404 status code', async () => {
    const response = await page.goto(
      `http://localhost:${port}/unexistent-route`,
      {
        waitUntil: 'networkidle2',
      }
    )

    expect(response.status()).toBe(404)

    await expect(response.text()).resolves.toMatch('you did not found me 😜')
  })

  it('should reload the page when transitioning to not found route', async () => {
    const response = await page.goto(
      `http://localhost:${port}/page-with-not-found-link`,
      {
        waitUntil: 'networkidle2',
        timeout: 2000,
      }
    )

    expect(response.status()).toBe(200)

    await page.setRequestInterception(true)

    let resolveManifest = () => Promise.resolve()

    page.on('request', (request) => {
      if (request.url().includes('/_casterly/route-manifest')) {
        resolveManifest = () => request.continue()
        return
      }

      request.continue()
    })

    await Promise.all([page.waitForNavigation(), page.click('#click-me')])

    const [reloadResponse, manifestResponse] = await Promise.all([
      page.waitForNavigation(),
      page.waitForResponse((res) =>
        new URL(res.url()).pathname.startsWith('/_casterly/route-manifest')
      ),
      resolveManifest(),
    ])

    expect(manifestResponse.status()).toBe(404)

    expect(reloadResponse?.status()).toBe(404)

    await expect(reloadResponse?.text()).resolves.toMatch(
      'you did not found me 😜'
    )
  })

  it('should be able to navigate away from not found page', async () => {
    const response = await page.goto(
      `http://localhost:${port}/unexistent-route`,
      {
        waitUntil: 'networkidle2',
      }
    )

    expect(response.status()).toBe(404)

    await Promise.all([page.waitForNavigation(), page.click('a')])

    await page.waitForSelector('#index-header')

    await expect(page.content()).resolves.toMatch('Index page')
  })
})
