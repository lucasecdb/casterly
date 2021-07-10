import { Routes } from '@casterly/components'
import { RootBrowser } from '@casterly/components/browser'
import ReactDOM from 'react-dom'

ReactDOM.hydrateRoot(
  document.getElementById('app'),
  <RootBrowser>
    <Routes />
  </RootBrowser>
)
