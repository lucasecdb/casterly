import NotFound from './NotFound'
import OtherPage from './OtherPage'
import App from './index'

export default [
  {
    element: <App />,
    path: '/',
  },
  {
    element: <OtherPage />,
    path: '/other-page',
  },
  {
    element: <NotFound />,
    path: '*',
  },
]
