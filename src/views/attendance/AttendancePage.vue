<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>考勤管理</h3>
      <div>
        <el-select v-model="department" placeholder="选择班组" style="width: 140px; margin-right: 12px" @change="loadMatrix">
          <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
        </el-select>
        <el-date-picker
          v-model="currentMonth"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          @change="loadMatrix"
          style="margin-right: 12px"
        />
        <el-button type="primary" @click="saveAll">保存考勤</el-button>
      </div>
    </div>

    <el-alert
      title="操作提示：点击单元格切换状态  |  出勤=对勾 ✓  |  迟到/早退/旷工/请假/加班=特殊标记  |  休息=空白"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 12px"
    />

    <div class="attendance-grid-wrapper" v-if="days.length > 0">
      <table class="attendance-grid">
        <thead>
          <tr>
            <th class="fixed-col">工人</th>
            <th v-for="d in days" :key="d.day" :class="{ weekend: d.isWeekend }">
              {{ d.day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in matrix" :key="row.worker_id">
            <td class="fixed-col worker-name">{{ row.workerName }}</td>
            <td
              v-for="d in days"
              :key="d.day"
              :class="['cell', getCellClass(row.worker_id, d.date), { weekend: d.isWeekend }]"
              @click="cycleStatus(row.worker_id, d.date)"
            >
              {{ getCellLabel(row.worker_id, d.date) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <el-empty v-else description="请选择月份和部门" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { workerDao, attendanceDao } from '../../db/index.js'

const STATUS_ORDER = ['', '出勤', '迟到', '早退', '旷工', '请假', '加班', '休息']
const STATUS_LABELS = { '出勤': '✓', '迟到': '迟', '早退': '退', '旷工': '旷', '请假': '假', '加班': '加', '休息': '休' }
const STATUS_COLORS = { '出勤': 'ok', '迟到': 'late', '早退': 'early', '旷工': 'absent', '请假': 'leave', '加班': 'overtime', '休息': 'rest' }

const currentMonth = ref(new Date().toISOString().slice(0, 7))
const department = ref('')
const departments = ref([])
const workers = ref([])
const records = ref([])
const matrix = ref([])

const days = computed(() => {
  if (!currentMonth.value) return []
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const result = []
  for (let d = 1; d <= lastDay; d++) {
    const date = `${currentMonth.value}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(y, m - 1, d).getDay()
    result.push({ day: d, date, isWeekend: dayOfWeek === 0 || dayOfWeek === 6 })
  }
  return result
})

onMounted(async () => {
  const all = await workerDao.getActive()
  departments.value = [...new Set(all.map(w => w.department).filter(Boolean))]
  if (departments.value.length > 0) {
    department.value = departments.value[0]
    await loadMatrix()
  }
})

async function loadMatrix() {
  if (!currentMonth.value || !department.value) return
  workers.value = (await workerDao.getActive()).filter(w => w.department === department.value)
  records.value = await attendanceDao.getByMonth(currentMonth.value)

  matrix.value = workers.value.map(w => {
    const row = { worker_id: w.id, workerName: w.name, cells: {} }
    records.value
      .filter(r => r.worker_id === w.id)
      .forEach(r => { row.cells[r.record_date] = r })
    return row
  })
}

function getRecord(workerId, date) {
  const row = matrix.value.find(m => m.worker_id === workerId)
  return row ? row.cells[date] : null
}

function getCellLabel(workerId, date) {
  const r = getRecord(workerId, date)
  return r ? (STATUS_LABELS[r.status] || '') : ''
}

function getCellClass(workerId, date) {
  const r = getRecord(workerId, date)
  return r ? STATUS_COLORS[r.status] || '' : ''
}

function cycleStatus(workerId, date) {
  const r = getRecord(workerId, date)
  const currentStatus = r ? r.status : ''
  const idx = STATUS_ORDER.indexOf(currentStatus)
  const nextIdx = (idx + 1) % STATUS_ORDER.length
  const newStatus = STATUS_ORDER[nextIdx]

  const record = {
    worker_id: workerId,
    record_date: date,
    status: newStatus || '出勤',
    late_minutes: newStatus === '迟到' ? 10 : 0,
    early_minutes: newStatus === '早退' ? 10 : 0,
    overtime_hours: 0,
    deduction_amount: 0
  }

  const row = matrix.value.find(m => m.worker_id === workerId)
  if (row) row.cells[date] = record
}

async function saveAll() {
  const allRecords = []
  matrix.value.forEach(row => {
    Object.values(row.cells).forEach(r => {
      if (r.status) {
        allRecords.push(r)
      }
    })
  })

  for (const r of allRecords) {
    await attendanceDao.put(r)
  }
  ElMessage.success(`保存成功，共 ${allRecords.length} 条考勤记录`)
  await loadMatrix()
}
</script>

<style scoped>
.attendance-grid-wrapper {
  overflow: auto;
  max-height: calc(100vh - 250px);
}
.attendance-grid {
  border-collapse: collapse;
  font-size: 12px;
}
.attendance-grid th, .attendance-grid td {
  border: 1px solid #dcdfe6;
  min-width: 36px;
  height: 30px;
  text-align: center;
  padding: 0 1px;
}
.attendance-grid th {
  background: #f5f7fa;
  position: sticky;
  top: 0;
  z-index: 2;
}
.attendance-grid th.weekend, .attendance-grid td.weekend {
  background: #fdf6ec;
}
.attendance-grid .fixed-col {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 1;
  min-width: 70px;
  font-weight: bold;
}
.attendance-grid th.fixed-col {
  z-index: 3;
}
.cell { cursor: pointer; user-select: none; }
.cell:hover { background: #ecf5ff !important; }
.ok { background: #f0f9eb; color: #67c23a; }
.late { background: #fdf6ec; color: #e6a23c; }
.early { background: #fdf6ec; color: #e6a23c; }
.absent { background: #fef0f0; color: #f56c6c; }
.leave { background: #f4f4f5; color: #909399; }
.overtime { background: #ecf5ff; color: #409eff; }
.rest { background: #f4f4f5; }
</style>
