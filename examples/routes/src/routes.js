export default [
  {
    component: () => import('./index'),
    path: '/',
  },
  {
    component: () => import('./OtherPage'),
    path: '/other-page',
  },
  {
    component: () => import('./NotFound'),
    path: '*',
  },
]
