import { paths } from '@casterly/utils'
import type { InlineConfig } from 'vite'

export const viteConfig: InlineConfig = {
  root: paths.appDirectory,
  base: '/',
  build: {},
}
