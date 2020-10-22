const log = (...messages) => {
  console.log('[HMR]', ...messages)
}

class HMRClient {
  constructor() {
    this.es = null

    window.addEventListener('beforeunload', this.close)
  }

  init = () => {
    const es = new EventSource('/__webpack-hmr')

    this.es = es

    es.addEventListener('open', this.onConnected)
    es.addEventListener('error', this.onDisconnected)
    es.addEventListener('message', this.onMessage)
  }

  close = () => {
    if (this.es == null) {
      return
    }

    this.es.removeEventListener('open', this.onConnected)
    this.es.removeEventListener('error', this.onDisconnected)
    this.es.removeEventListener('message', this.onMessage)

    this.es.close()
    this.es = null
  }

  onMessage = (event) => {
    if (event.data === '💓') {
      return
    }

    const message = JSON.parse(event.data)

    this.processMessage(message)
  }

  onConnected = () => {
    log('Connected')
  }

  onDisconnected = () => {
    log('Lost connection to event source')

    this.close()
    setTimeout(this.init, 1000)
  }

  processMessage = (message) => {
    switch (message.action) {
      case 'building': {
        log('Build started')
        break
      }
      case 'built':
        log('Built successfully')
      // eslint-disble-next-line no-fallthrough
      case 'sync': {
        let applyUpdate = true

        if (message.errors.length > 0) {
          applyUpdate = false
        }

        if (applyUpdate && module.hot.status() === 'idle') {
          module.hot
            .check(false)
            .then((outdatedModules) => {
              if (!outdatedModules) {
                return
              }

              return module.hot.apply({
                ignoreUnaccepted: true,
                ignoreDeclined: true,
                ignoreErrored: true,
              })
            })
            .catch((err) => {
              if (err.message.startsWith('NetworkError')) {
                return
              }

              log('An error occurred when applying the hot-module updates')
            })
        }

        break
      }
    }
  }
}

export function connectHMR() {
  const hmrClient = new HMRClient()

  hmrClient.init()
}
