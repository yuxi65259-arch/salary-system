<template>
  <div>
    <h3 style="margin-bottom: 16px">数据管理</h3>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>数据备份</template>
          <p style="margin-bottom: 12px; color: #909399">将所有数据导出为 JSON 文件，用于备份或迁移到其他电脑。</p>
          <el-button type="primary" @click="exportData">导出全部数据</el-button>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card>
          <template #header>数据恢复</template>
          <p style="margin-bottom: 12px; color: #909399">从之前导出的 JSON 备份文件恢复数据。</p>
          <div>
            <input
              type="file"
              accept=".json"
              ref="fileInput"
              style="display: none"
              @change="handleFileImport"
            />
            <el-button type="warning" @click="$refs.fileInput.click()">导入 JSON 备份</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>系统信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="在职工人">
          {{ stats.workers }} 人
        </el-descriptions-item>
        <el-descriptions-item label="工序数">
          {{ stats.processes }} 个
        </el-descriptions-item>
        <el-descriptions-item label="计件记录">
          {{ stats.pieceRecords }} 条
        </el-descriptions-item>
        <el-descriptions-item label="考勤记录">
          {{ stats.attendance }} 条
        </el-descriptions-item>
        <el-descriptions-item label="工资记录">
          {{ stats.salaryResults }} 条
        </el-descriptions-item>
        <el-descriptions-item label="补贴/扣款记录">
          {{ stats.allowances }} 条
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header><span style="color: #f56c6c">危险操作</span></template>
      <el-button type="danger" @click="clearAll">清空全部数据</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import db from '../../db/index.js'
import { workerDao, processDao, pieceRecordDao, attendanceDao, allowanceDao, salaryResultDao } from '../../db/index.js'

const fileInput = ref(null)
const stats = ref({
  workers: 0, processes: 0, pieceRecords: 0, attendance: 0, salaryResults: 0, allowances: 0
})

onMounted(refreshStats)

async function refreshStats() {
  stats.value.workers = await workerDao.count()
  stats.value.processes = await processDao.count()
  stats.value.pieceRecords = await db.piece_records.count()
  stats.value.attendance = await db.attendance.count()
  stats.value.salaryResults = await db.salary_results.count()
  stats.value.allowances = await db.allowance_records.count()
}

async function exportData() {
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    workers: await db.workers.toArray(),
    process_def: await db.process_def.toArray(),
    piece_records: await db.piece_records.toArray(),
    attendance: await db.attendance.toArray(),
    salary_config: await db.salary_config.toArray(),
    allowance_records: await db.allowance_records.toArray(),
    salary_results: await db.salary_results.toArray()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `工资系统备份_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('数据导出成功')
}

async function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.version) throw new Error('无效的备份文件')

    await ElMessageBox.confirm(
      `即将导入备份数据：${data.workers?.length || 0} 名工人、${data.piece_records?.length || 0} 条计件记录等。现有数据将被覆盖，确定继续？`,
      '确认导入',
      { type: 'warning', confirmButtonText: '确定导入', cancelButtonText: '取消' }
    )

    await db.workers.clear()
    await db.process_def.clear()
    await db.piece_records.clear()
    await db.attendance.clear()
    await db.salary_config.clear()
    await db.allowance_records.clear()
    await db.salary_results.clear()

    if (data.workers?.length) await db.workers.bulkAdd(data.workers)
    if (data.process_def?.length) await db.process_def.bulkAdd(data.process_def)
    if (data.piece_records?.length) await db.piece_records.bulkAdd(data.piece_records)
    if (data.attendance?.length) await db.attendance.bulkAdd(data.attendance)
    if (data.salary_config?.length) await db.salary_config.bulkAdd(data.salary_config)
    if (data.allowance_records?.length) await db.allowance_records.bulkAdd(data.allowance_records)
    if (data.salary_results?.length) await db.salary_results.bulkAdd(data.salary_results)

    await refreshStats()
    ElMessage.success('数据恢复成功')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('导入失败: ' + e.message)
    }
  }

  event.target.value = ''
}

async function clearAll() {
  try {
    await ElMessageBox.confirm(
      '此操作将删除系统中所有数据（工人、计件记录、考勤、工资记录等），且不可恢复！请先导出数据备份。',
      '危险操作',
      { type: 'error', confirmButtonText: '我确定要清空', cancelButtonText: '取消' }
    )
    await ElMessageBox.confirm('请再次确认：你已做好数据备份了吗？', '二次确认', { type: 'error', confirmButtonText: '确认清空' })

    await db.workers.clear()
    await db.process_def.clear()
    await db.piece_records.clear()
    await db.attendance.clear()
    await db.salary_config.clear()
    await db.allowance_records.clear()
    await db.salary_results.clear()

    await refreshStats()
    ElMessage.success('所有数据已清空')
  } catch { /* cancelled */ }
}
</script>
