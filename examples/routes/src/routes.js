export default [
  {
    component: () => import('./index'),
    path: '/',
  },
  {
    component: () => import('./OtherPage'),
    path: '/other-page',
    props: {
      name: 'Jon',
    },
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
