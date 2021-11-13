import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3003

describe('Preloaded data', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should render preloaded data in the server', async () => {
    const response = await page.goto(`http://localhost:${port}/preload-data`)

    expect(response.status()).toBe(200)

    await expect(
      page.$eval('#app', (element) => element.innerHTML)
    ).resolves.toMatchInlineSnapshot(
      `"<div>{\\"metadata\\":{\\"params\\":{}}}</div>"`
    )
  })

  it('should render preloaded data in inner route', async () => {
    const response = await page.goto(`http://localhost:${port}/outer/inner`)

    expect(response.status()).toBe(200)

    await expect(
      page.$eval('#app', (element) => element.innerHTML)
    ).resolves.toMatchInlineSnapshot(
      `"<div>{\\"metadata\\":{\\"params\\":{}}}</div>"`
    )
  })

  it('should preload data for outer route only', async () => {
    const response = await page.goto(
      `http://localhost:${port}/outer-preloaded/inner`
    )

    expect(response.status()).toBe(200)

    await expect(
      page.$eval('#app', (element) => element.innerHTML)
    ).resolves.toMatchInlineSnapshot(
      `"<div><span>hello</span><pre>{\\"metadata\\":{\\"params\\":{}}}<!-- --></pre></div>"`
    )
  })
})
