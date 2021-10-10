export default [
  {
    path: '/',
    component: () => import('./index'),
  },
  {
    path: '/links',
    component: () => import('./links'),
  },
  {
    path: '/back-link',
    component: () => import('./back-link'),
  },
  {
    path: '/css',
    component: () => import('./css'),
  },
]
