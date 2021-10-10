export const notFound = {
  component: () => import('./not-found'),
}

export default [
  {
    path: '/',
    component: () => import('./index'),
  },
  {
    path: '/back-link',
    component: () => import('./back-link'),
  },
  {
    path: '/page-with-not-found-link',
    component: () => import('./page-with-not-found-link'),
  },
]
