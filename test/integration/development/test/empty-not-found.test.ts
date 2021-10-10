import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3000

describe('Empty not found', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should return an empty not found page', async () => {
    const response = await page.goto(
      `http://localhost:${port}/not-found-page`,
      { waitUntil: 'networkidle2' }
    )

    expect(response.status()).toBe(404)
    await expect(page.content()).resolves.toMatch('<div id="root"></div>')
  })
})
