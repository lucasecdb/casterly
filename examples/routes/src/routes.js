export default [
  {
    component: () => import('./index'),
    path: '/',
  },
  {
    component: () => import('./OtherPage'),
    path: '/other-page',
    children: [
      {
        component: () => import('./OtherPageChildren'),
        path: '/child',
      },
    ],
  },
  {
    component: () => import('./NotFound'),
    path: '*',
  },
]
