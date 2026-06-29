<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>工资计算</h3>
      <div>
        <el-date-picker
          v-model="calcMonth"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          style="margin-right: 12px"
        />
        <el-button type="primary" @click="calculate" :loading="calculating">计算工资</el-button>
        <el-button type="success" @click="confirmAll" :disabled="results.length === 0">全部确认</el-button>
      </div>
    </div>

    <el-alert
      v-if="calcNote"
      :title="calcNote"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />

    <el-table :data="results" border stripe max-height="calc(100vh - 260px)">
      <el-table-column label="工人" width="90" fixed="left">
        <template #default="{ row }">{{ row.workerName }}</template>
      </el-table-column>
      <el-table-column label="基本工资" width="100">
        <template #default="{ row }">￥{{ row.baseSalary }}</template>
      </el-table-column>
      <el-table-column label="计件工资" width="100">
        <template #default="{ row }">￥{{ row.pieceTotal }}</template>
      </el-table-column>
      <el-table-column label="加班工资" width="90">
        <template #default="{ row }">￥{{ row.overtimePay }}</template>
      </el-table-column>
      <el-table-column label="考勤扣款" width="100">
        <template #default="{ row }">
          <span style="color: #f56c6c">-￥{{ row.attendanceDeduction }}</span>
        </template>
      </el-table-column>
      <el-table-column label="全勤奖" width="90">
        <template #default="{ row }">￥{{ row.fullAttendanceBonus }}</template>
      </el-table-column>
      <el-table-column label="补贴" width="90">
        <template #default="{ row }">￥{{ row.allowanceTotal }}</template>
      </el-table-column>
      <el-table-column label="奖金" width="90">
        <template #default="{ row }">￥{{ row.bonusTotal }}</template>
      </el-table-column>
      <el-table-column label="其他扣款" width="100">
        <template #default="{ row }">
          <span style="color: #f56c6c">-￥{{ row.otherDeduction }}</span>
        </template>
      </el-table-column>
      <el-table-column label="应发合计" width="110">
        <template #default="{ row }">
          <strong>￥{{ row.grossSalary }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="实发合计" width="110" fixed="right">
        <template #default="{ row }">
          <strong style="color: #409eff; font-size: 15px">￥{{ row.netSalary }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetail(row)">明细</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="results.length === 0 && !calculating" description="选择月份后点击「计算工资」" />

    <!-- 明细弹窗 -->
    <el-dialog v-model="detailVisible" title="工资明细" width="500px">
      <el-descriptions v-if="detailRow" :column="1" border>
        <el-descriptions-item label="工人">{{ detailRow.workerName }}</el-descriptions-item>
        <el-descriptions-item label="基本工资">￥{{ detailRow.baseSalary }}</el-descriptions-item>
        <el-descriptions-item label="计件工资">￥{{ detailRow.pieceTotal }}</el-descriptions-item>
        <el-descriptions-item label="加班工资">￥{{ detailRow.overtimePay }}</el-descriptions-item>
        <el-descriptions-item label="考勤扣款"><span style="color:#f56c6c">-￥{{ detailRow.attendanceDeduction }}</span></el-descriptions-item>
        <el-descriptions-item label="全勤奖">￥{{ detailRow.fullAttendanceBonus }}</el-descriptions-item>
        <el-descriptions-item label="补贴">￥{{ detailRow.allowanceTotal }}</el-descriptions-item>
        <el-descriptions-item label="奖金">￥{{ detailRow.bonusTotal }}</el-descriptions-item>
        <el-descriptions-item label="其他扣款"><span style="color:#f56c6c">-￥{{ detailRow.otherDeduction }}</span></el-descriptions-item>
        <el-descriptions-item label="应发合计"><strong>￥{{ detailRow.grossSalary }}</strong></el-descriptions-item>
        <el-descriptions-item label="实发合计">
          <strong style="color:#409eff;font-size:16px">￥{{ detailRow.netSalary }}</strong>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { workerDao, pieceRecordDao, attendanceDao, allowanceDao, configDao, salaryResultDao } from '../../db/index.js'
import { SalaryCalculator } from '../../calculator/SalaryCalculator.js'

const calcMonth = ref(new Date().toISOString().slice(0, 7))
const results = ref([])
const calculating = ref(false)
const calcNote = ref('')
const detailVisible = ref(false)
const detailRow = ref(null)

async function calculate() {
  if (!calcMonth.value) {
    ElMessage.warning('请选择月份')
    return
  }
  calculating.value = true
  calcNote.value = ''

  try {
    const config = await configDao.get()
    if (!config) {
      calcNote.value = '请先在「工资配置」中设置计算参数'
      results.value = []
      return
    }

    const workers = await workerDao.getActive()
    if (workers.length === 0) {
      ElMessage.warning('没有在职工人')
      results.value = []
      return
    }

    const allResults = []

    for (const worker of workers) {
      const pieceRecords = await pieceRecordDao.getByWorkerAndMonth(worker.id, calcMonth.value)
      const attendanceRecords = await attendanceDao.getByWorkerAndMonth(worker.id, calcMonth.value)
      const allowanceRecs = await allowanceDao.getByWorkerAndMonth(worker.id, calcMonth.value)

      const calculator = new SalaryCalculator(config, worker, pieceRecords, attendanceRecords, allowanceRecs)
      const detail = calculator.calculate()

      allResults.push({
        worker_id: worker.id,
        workerName: worker.name,
        salary_month: calcMonth.value,
        ...detail,
        status: '草稿'
      })
    }

    results.value = allResults
    ElMessage.success(`计算完成，共 ${allResults.length} 名工人`)
  } catch (e) {
    ElMessage.error('计算出错: ' + e.message)
  } finally {
    calculating.value = false
  }
}

async function confirmAll() {
  const items = results.value.map(r => ({
    worker_id: r.worker_id,
    salary_month: r.salary_month,
    base_salary: r.baseSalary,
    piece_total: r.pieceTotal,
    overtime_pay: r.overtimePay,
    attendance_deduction: r.attendanceDeduction,
    allowance_total: r.allowanceTotal,
    bonus_total: r.bonusTotal,
    other_deduction: r.otherDeduction,
    gross_salary: r.grossSalary,
    net_salary: r.netSalary,
    calculation_detail: JSON.stringify(r),
    calculated_at: new Date().toISOString(),
    status: '已确认'
  }))
  await salaryResultDao.batchPut(items)
  results.value.forEach(r => { r.status = '已确认' })
  ElMessage.success('工资已全部确认并保存')
}

function showDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}
</script>
