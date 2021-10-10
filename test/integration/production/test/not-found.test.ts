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
})
