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

    const pageContent = await page.content()

    expect(pageContent).toMatch("you didn't found me 😜")
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

    const [manifestResponse] = await Promise.all([
      page.waitForResponse((res) =>
        new URL(res.url()).pathname.startsWith('/_casterly/route-manifest')
      ),
      page.waitForNavigation(),
      page.click('#click-me'),
    ])

    expect(manifestResponse.status()).toBe(404)

    const reloadResponse = await page.waitForNavigation({
      waitUntil: 'networkidle2',
    })

    expect(reloadResponse.status()).toBe(404)
    await expect(page.content()).resolves.toMatch("you didn't found me 😜")
  })
})
