# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Removed peer dependency `react-hot-loader`.
- Upgrade `workbox-webpack-plugin` version to v5 stable.

### Fixed
- Static assets not served with correct mime-type in production.
- Error page without `noindex, nofollow` robots rules.

## [0.1.6] - 2019-09-28
### Changed
- Replaced the usage of `webpack-node-externals` with a custom externals function to avoid duplicate
  React copies over several modules.

## [0.1.5] - 2019-09-27
### Fixed
- Add `@apollo/*` packages to externals whitelist, to avoid different React's from being imported.

## [0.1.4] - 2019-09-27
### Added
- Connect to chrome devtools inspector using the `inspector` node package.

### Changed
- Update proxy middleware to use config from the app's `package.json`.

### Removed
- Custom config added in template response, it should be configured in userland.

## [0.1.3] - 2019-09-27
### Fixed
- Error when running `rs build` of invalid call to `map`.

## [0.1.2] - 2019-09-27
### Fixed
- Sass imports not working (`File to import not found or unreadable`).
- Error when statically linking the package (`Error: Cannot find module 'react-hot-loader/babel'`).

## [0.1.1] - 2019-09-27
### Fixed
- Error in build script with missing `bfj` package.

## [0.1.0] - 2019-09-27
### Added
- Initial version of package with `rs` cli.
