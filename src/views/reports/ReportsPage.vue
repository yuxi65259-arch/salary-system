<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>工资报表</h3>
      <div>
        <el-select v-model="filterMonth" placeholder="选择月份" style="width: 160px; margin-right: 12px" @change="loadData">
          <el-option v-for="m in availableMonths" :key="m" :label="m" :value="m" />
        </el-select>
        <el-button @click="exportExcel" :disabled="reports.length === 0">导出 Excel</el-button>
        <el-button type="primary" @click="printPayroll" :disabled="reports.length === 0" class="no-print">打印工资条</el-button>
      </div>
    </div>

    <!-- 汇总表 -->
    <el-table :data="reports" border stripe show-summary :summary-method="getSummaries" max-height="calc(100vh - 260px)">
      <el-table-column label="工人" width="90" fixed="left">
        <template #default="{ row }">{{ row.workerName }}</template>
      </el-table-column>
      <el-table-column prop="base_salary" label="基本工资" width="100" />
      <el-table-column prop="piece_total" label="计件工资" width="100" />
      <el-table-column prop="overtime_pay" label="加班工资" width="90" />
      <el-table-column prop="attendance_deduction" label="考勤扣款" width="100">
        <template #default="{ row }"><span style="color:#f56c6c">-{{ row.attendance_deduction }}</span></template>
      </el-table-column>
      <el-table-column prop="allowance_total" label="补贴" width="80" />
      <el-table-column prop="bonus_total" label="奖金" width="80" />
      <el-table-column prop="other_deduction" label="其他扣款" width="90">
        <template #default="{ row }"><span style="color:#f56c6c">-{{ row.other_deduction }}</span></template>
      </el-table-column>
      <el-table-column prop="gross_salary" label="应发" width="90" />
      <el-table-column prop="net_salary" label="实发" width="90" fixed="right">
        <template #default="{ row }">
          <strong style="color:#409eff">￥{{ row.net_salary }}</strong>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === '已发放' ? 'success' : 'warning'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="reports.length === 0 && filterMonth" description="该月没有工资记录" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { workerDao, salaryResultDao } from '../../db/index.js'
import * as XLSX from 'xlsx'

const filterMonth = ref('')
const reports = ref([])
const workerMap = ref({})
const allResults = ref([])

const availableMonths = computed(() => {
  const set = new Set(allResults.value.map(r => r.salary_month))
  return [...set].sort().reverse()
})

onMounted(async () => {
  const workers = await workerDao.getAll()
  workers.forEach(w => { workerMap.value[w.id] = w })
  allResults.value = await salaryResultDao.list({})
  if (availableMonths.value.length > 0) {
    filterMonth.value = availableMonths.value[0]
    await loadData()
  }
})

async function loadData() {
  if (!filterMonth.value) {
    reports.value = []
    return
  }
  const results = await salaryResultDao.list({ salary_month: filterMonth.value })
  reports.value = results.map(r => ({
    ...r,
    workerName: (workerMap.value[r.worker_id] || {}).name || '-'
  }))
}

function getSummaries(param) {
  const { columns, data } = param
  const sums = []
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = '合计'; return }
    sums[index] = data.reduce((acc, row) => acc + (Number(row[col.property]) || 0), 0).toFixed(2)
  })
  return sums
}

function exportExcel() {
  const data = reports.value.map(r => ({
    '工人': r.workerName,
    '基本工资': r.base_salary,
    '计件工资': r.piece_total,
    '加班工资': r.overtime_pay,
    '考勤扣款': -r.attendance_deduction,
    '补贴': r.allowance_total,
    '奖金': r.bonus_total,
    '其他扣款': -r.other_deduction,
    '应发': r.gross_salary,
    '实发': r.net_salary,
    '状态': r.status
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工资表')
  XLSX.writeFile(wb, `工资表_${filterMonth.value}.xlsx`)
  ElMessage.success('导出成功')
}

function printPayroll() {
  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工资条</title>
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; font-size: 14px; }
  .slip { border: 1px solid #000; margin: 10px 0; padding: 12px; page-break-inside: avoid; }
  .slip h3 { margin: 0 0 8px; text-align: center; }
  .slip table { width: 100%; border-collapse: collapse; }
  .slip td { padding: 4px 8px; border: 1px solid #ccc; }
  .slip .total { font-weight: bold; font-size: 16px; color: #409eff; }
  @media print { .slip { page-break-after: always; } }
</style></head><body>
${reports.value.map(r => `
<div class="slip">
  <h3>工资条 - ${filterMonth.value}</h3>
  <p>姓名：${r.workerName}</p>
  <table>
    <tr><td>基本工资</td><td>￥${r.base_salary}</td><td>计件工资</td><td>￥${r.piece_total}</td></tr>
    <tr><td>加班工资</td><td>￥${r.overtime_pay}</td><td>考勤扣款</td><td>-￥${r.attendance_deduction}</td></tr>
    <tr><td>补贴</td><td>￥${r.allowance_total}</td><td>奖金</td><td>￥${r.bonus_total}</td></tr>
    <tr><td>其他扣款</td><td>-￥${r.other_deduction}</td><td>应发合计</td><td>￥${r.gross_salary}</td></tr>
    <tr><td colspan="2" class="total">实发合计：￥${r.net_salary}</td><td colspan="2">${r.status}</td></tr>
  </table>
</div>
`).join('')}
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 500)
}
</script>
