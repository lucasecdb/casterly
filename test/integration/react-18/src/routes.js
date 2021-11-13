export default [
  {
    path: '/partial-hydration',
    component: () => import('./partial-hydration'),
  },
  {
    path: '/preload-data',
    component: () => import('./preload-data'),
  },
  {
    path: '/outer',
    component: () => import('./outer-layout'),
    children: [
      {
        path: 'inner',
        component: () => import('./preload-data'),
      },
    ],
  },
  {
    path: '/outer-preloaded',
    component: () => import('./outer-preload'),
    children: [
      {
        path: 'inner',
        component: () => import('./inner-without-preload'),
      },
    ],
  },
]
