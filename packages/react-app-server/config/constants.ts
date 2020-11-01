import path from 'path'

export const STATIC_FOLDER = 'static'
export const STATIC_RUNTIME_PATH = path.join(STATIC_FOLDER, 'runtime')
export const STATIC_WEBPACK_PATH = path.join(STATIC_FOLDER, 'webpack')
export const STATIC_CHUNKS_PATH = path.join(STATIC_FOLDER, 'chunks')
export const STATIC_MEDIA_PATH = path.join(STATIC_FOLDER, 'media')
export const STATIC_ENTRYPOINTS_PATH = path.join(STATIC_FOLDER, 'entrypoints')

export const STATIC_RUNTIME_MAIN = path.join(STATIC_RUNTIME_PATH, 'main')
export const STATIC_RUNTIME_WEBPACK = path.join(STATIC_RUNTIME_PATH, 'webpack')
export const STATIC_RUNTIME_HOT = path.join(STATIC_RUNTIME_PATH, 'hot')

export const STATIC_ENTRYPOINTS_ERROR = path.join(
  STATIC_ENTRYPOINTS_PATH,
  'error'
)
export const STATIC_ENTRYPOINTS_ROUTES = path.join(
  STATIC_ENTRYPOINTS_PATH,
  'routes'
)
export const STATIC_ENTRYPOINTS_ROUTES_MANIFEST = path.join(
  STATIC_ENTRYPOINTS_PATH,
  'routes-manifest'
)

export const ASSET_MANIFEST_FILE = 'asset-manifest.json'
export const COMPONENTS_MANIFEST_FILE = 'components-manifest.json'
export const ROUTE_ASSETS_FILE = 'route-assets.json'

// match: static/component/:name
export const COMPONENT_NAME_REGEX = /^static[/\\]components[/\\](.*)$/
