import path from 'path'

export const STATIC_FOLDER = 'static'
export const STATIC_RUNTIME_PATH = path.join(STATIC_FOLDER, 'runtime')
export const STATIC_CHUNKS_PATH = path.join(STATIC_FOLDER, 'chunks')
export const STATIC_MEDIA_PATH = path.join(STATIC_FOLDER, 'media')
export const STATIC_COMPONENTS_PATH = path.join(STATIC_FOLDER, 'components')

export const STATIC_RUNTIME_MAIN = path.join(STATIC_RUNTIME_PATH, 'main')
export const STATIC_RUNTIME_WEBPACK = path.join(STATIC_RUNTIME_PATH, 'webpack')

export const ASSET_MANIFEST_FILE = 'asset-manifest.json'
export const PAGES_MANIFEST_FILE = 'pages-manifest.json'

// match: static/component/:name
export const COMPONENT_NAME_REGEX = /^static[/\\]components[/\\](.*)$/
