/**
MIT License

Copyright (c) 2015-present, Facebook, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// originally taken from https://github.com/facebook/create-react-app/tree/master/packages/react-dev-utils
import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import filesize from 'filesize'
import { sync as gzipSize } from 'gzip-size'
import recursive from 'recursive-readdir'
import stripAnsi from 'strip-ansi'
import { Stats } from 'webpack'

function canReadAsset(asset: string) {
  return (
    /\.(js|css)$/.test(asset) &&
    !/service-worker\.js/.test(asset) &&
    !/precache-manifest\.[0-9a-f]+\.js/.test(asset)
  )
}

// Prints a detailed summary of build files.
export function printFileSizesAfterBuild(
  webpackStats: Stats,
  previousSizeMap: { root: string; sizes: Record<string, number> },
  buildFolder: string,
  maxBundleGzipSize: number,
  maxChunkGzipSize: number
) {
  const root = previousSizeMap.root
  const sizes = previousSizeMap.sizes
  const assets = [webpackStats]
    .map((stats) =>
      (stats.toJson({ all: false, assets: true }) as {
        assets: Array<{ name: string }>
      }).assets
        .filter((asset) => canReadAsset(asset.name))
        .map((asset) => {
          const fileContents = fs.readFileSync(path.join(root, asset.name))
          const size = gzipSize(fileContents)
          const previousSize = sizes[removeFileNameHash(root, asset.name)]
          const difference = getDifferenceLabel(size, previousSize)
          return {
            folder: path.join(
              path.basename(buildFolder),
              path.dirname(asset.name)
            ),
            name: path.basename(asset.name),
            size,
            sizeLabel:
              filesize(size) + (difference ? ' (' + difference + ')' : ''),
          }
        })
    )
    .reduce((single, all) => all.concat(single), [])
  assets.sort((a, b) => b.size - a.size)
  const longestSizeLabelLength = Math.max.apply(
    null,
    assets.map((a) => stripAnsi(a.sizeLabel).length)
  )
  let suggestBundleSplitting = false
  assets.forEach((asset) => {
    let sizeLabel = asset.sizeLabel
    const sizeLength = stripAnsi(sizeLabel).length
    if (sizeLength < longestSizeLabelLength) {
      const rightPadding = ' '.repeat(longestSizeLabelLength - sizeLength)
      sizeLabel += rightPadding
    }
    const isMainBundle = asset.name.indexOf('main.') === 0
    const maxRecommendedSize = isMainBundle
      ? maxBundleGzipSize
      : maxChunkGzipSize
    const isLarge = maxRecommendedSize && asset.size > maxRecommendedSize
    if (isLarge && path.extname(asset.name) === '.js') {
      suggestBundleSplitting = true
    }
    console.log(
      '  ' +
        (isLarge ? chalk.yellow(sizeLabel) : sizeLabel) +
        '  ' +
        chalk.dim(asset.folder + path.sep) +
        chalk.cyan(asset.name)
    )
  })
  if (suggestBundleSplitting) {
    console.log()
    console.log(
      chalk.yellow('The bundle size is significantly larger than recommended.')
    )
    console.log(
      chalk.yellow(
        'Consider reducing it with code splitting: https://goo.gl/9VhYWB'
      )
    )
    console.log(
      chalk.yellow(
        'You can also analyze the project dependencies: https://goo.gl/LeUzfb'
      )
    )
  }
}

function removeFileNameHash(buildFolder: string, fileName: string) {
  return fileName
    .replace(buildFolder, '')
    .replace(/\\/g, '/')
    .replace(
      /\/?(.*)(\.[0-9a-f]+)(\.chunk)?(\.js|\.css)/,
      (_, p1, __, ___, p4) => p1 + p4
    )
}

// Input: 1024, 2048
// Output: "(+1 KB)"
function getDifferenceLabel(currentSize: number, previousSize: number) {
  const FIFTY_KILOBYTES = 1024 * 50
  const difference = currentSize - previousSize
  const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red('+' + fileSize)
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow('+' + fileSize)
  } else if (difference < 0) {
    return chalk.green(fileSize)
  }
  return ''
}

export function measureFileSizesBeforeBuild(buildFolder: string) {
  return new Promise<{ root: string; sizes: Record<string, number> }>(
    (resolve) => {
      recursive(buildFolder, (err, fileNames) => {
        let sizes = null
        if (!err && fileNames) {
          sizes = fileNames
            .filter(canReadAsset)
            .reduce<Record<string, number>>((memo, fileName) => {
              const contents = fs.readFileSync(fileName)
              const key = removeFileNameHash(buildFolder, fileName)
              memo[key] = gzipSize(contents)
              return memo
            }, {})
        }
        resolve({
          root: buildFolder,
          sizes: sizes ?? {},
        })
      })
    }
  )
}
