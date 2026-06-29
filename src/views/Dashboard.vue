<template>
  <div>
    <h3 style="margin-bottom: 20px">仪表盘</h3>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover" style="margin-bottom: 20px; text-align: center">
          <div style="font-size: 14px; color: #909399">{{ card.label }}</div>
          <div style="font-size: 28px; font-weight: bold; color: #303133; margin: 10px 0">
            {{ card.value }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>快捷操作</template>
      <el-row :gutter="12">
        <el-col :span="4" v-for="btn in quickActions" :key="btn.label">
          <el-button type="primary" :style="{ width: '100%', marginBottom: '8px' }" @click="$router.push(btn.path)">
            {{ btn.label }}
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { workerDao, pieceRecordDao, salaryResultDao, configDao } from '../db/index.js'

const cards = ref([
  { label: '在职工人', value: 0 },
  { label: '本月计件记录', value: 0 },
  { label: '本月已发工资', value: 0 },
  { label: '本月未发工资', value: 0 }
])

const quickActions = [
  { label: '录计件', path: '/piece-records' },
  { label: '录考勤', path: '/attendance' },
  { label: '算工资', path: '/calculator' },
  { label: '看报表', path: '/reports' },
  { label: '备份数据', path: '/datamgmt' }
]

onMounted(async () => {
  cards.value[0].value = (await workerDao.getActive()).length

  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = ym + '-'

  const allPiece = await pieceRecordDao.list({ date_from: prefix + '01', date_to: prefix + '31' })
  cards.value[1].value = allPiece.length

  const results = await salaryResultDao.list({ salary_month: ym })
  cards.value[2].value = results.filter(r => r.status === '已发放').length
  cards.value[3].value = results.filter(r => r.status !== '已发放').length
})
</script>
