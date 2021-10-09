import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3002

describe('Partial hydration', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should request for dynamic component only during hydration', async () => {
    await page.setRequestInterception(true)

    let dynamicComponentRequested = false

    page.on('request', (request) => {
      if (request.url().includes('dynamic-component.js')) {
        dynamicComponentRequested = true
      }

      request.continue()
    })

    await page.goto(`http://localhost:${port}/partial-hydration`)

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
