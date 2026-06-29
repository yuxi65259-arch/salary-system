import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'workers',
        name: 'Workers',
        component: () => import('../views/workers/WorkerList.vue'),
        meta: { title: '工人管理' }
      },
      {
        path: 'processes',
        name: 'Processes',
        component: () => import('../views/processes/ProcessList.vue'),
        meta: { title: '工序管理' }
      },
      {
        path: 'piece-records',
        name: 'PieceRecords',
        component: () => import('../views/records/PieceRecordList.vue'),
        meta: { title: '计件录入' }
      },
      {
        path: 'attendance',
        name: 'Attendance',
        component: () => import('../views/attendance/AttendancePage.vue'),
        meta: { title: '考勤管理' }
      },
      {
        path: 'allowances',
        name: 'Allowances',
        component: () => import('../views/allowances/AllowancePage.vue'),
        meta: { title: '补贴/扣款' }
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('../views/config/SalaryConfigPage.vue'),
        meta: { title: '工资配置' }
      },
      {
        path: 'calculator',
        name: 'Calculator',
        component: () => import('../views/calculator/SalaryCalcPage.vue'),
        meta: { title: '工资计算' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/reports/ReportsPage.vue'),
        meta: { title: '工资报表' }
      },
      {
        path: 'datamgmt',
        name: 'DataMgmt',
        component: () => import('../views/datamgmt/DataMgmtPage.vue'),
        meta: { title: '数据管理' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
