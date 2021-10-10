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
]
