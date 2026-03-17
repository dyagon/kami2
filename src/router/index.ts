import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: () => import('@/apps/Home.vue') },
    { path: '/kami2', redirect: '/kami2/play' },
    {
      path: '/kami2/play',
      name: 'Kami2Play',
      component: () => import('@/apps/kami2/index.vue'),
      meta: { hideHeader: true },
    },
    {
      path: '/kami2/solve',
      name: 'Kami2Solve',
      component: () => import('@/apps/kami2/index.vue'),
      meta: { hideHeader: true },
    },
    { path: '/sudoku', name: 'Sudoku', component: () => import('@/apps/sudoku/index.vue') },
  ],
})

export default router
