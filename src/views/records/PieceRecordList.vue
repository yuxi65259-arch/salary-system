<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>计件录入</h3>
      <div>
        <el-button @click="showBatchEntry">批量录入</el-button>
        <el-button type="primary" @click="showSingleForm">单条录入</el-button>
      </div>
    </div>

    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="6">
        <el-select v-model="filterWorker" placeholder="筛选工人" clearable filterable @change="loadData">
          <el-option v-for="w in workerList" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-select v-model="filterProcess" placeholder="筛选工序" clearable @change="loadData">
          <el-option v-for="p in processList" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-date-picker
          v-model="filterDate"
          type="date"
          placeholder="筛选日期"
          value-format="YYYY-MM-DD"
          @change="loadData"
        />
      </el-col>
      <el-col :span="4">
        <el-button @click="filterWorker=''; filterProcess=''; filterDate=''; loadData()">清除筛选</el-button>
      </el-col>
    </el-row>

    <el-table :data="records" border stripe max-height="calc(100vh - 280px)">
      <el-table-column prop="record_date" label="日期" width="110" />
      <el-table-column label="工人" width="90">
        <template #default="{ row }">{{ getWorkerName(row.worker_id) }}</template>
      </el-table-column>
      <el-table-column label="工序" width="120">
        <template #default="{ row }">{{ getProcessName(row.process_id) }}</template>
      </el-table-column>
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="unit_price_snapshot" label="单价" width="80">
        <template #default="{ row }">￥{{ row.unit_price_snapshot }}</template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          ￥{{ (row.quantity * row.unit_price_snapshot * (row.is_defective ? (1 - row.defective_ratio) : 1)).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="不合格" width="70">
        <template #default="{ row }">
          <el-tag v-if="row.is_defective" type="danger">不合格</el-tag>
          <el-tag v-else type="success">合格</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showSingleForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 单条录入弹窗 -->
    <el-dialog v-model="singleVisible" :title="editingId ? '编辑计件' : '录入计件'" width="450px" @closed="resetForm">
      <el-form :model="singleForm" label-width="90px">
        <el-form-item label="工人">
          <el-select v-model="singleForm.worker_id" filterable>
            <el-option v-for="w in activeWorkers" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="工序">
          <el-select v-model="singleForm.process_id" @change="onProcessChange">
            <el-option v-for="p in activeProcesses" :key="p.id" :label="`${p.name} (￥${p.unit_price}/${p.unit})`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="singleForm.record_date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="singleForm.quantity" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="不合格">
          <el-switch v-model="singleForm.is_defective" />
        </el-form-item>
        <el-form-item v-if="singleForm.is_defective" label="折价比例">
          <el-input-number v-model="singleForm.defective_ratio" :min="0" :max="1" :precision="2" :step="0.1" />
          <span style="margin-left: 8px; color: #909399">1=完全不计价，0.5=半价</span>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="singleForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="singleVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSingle">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量录入弹窗 -->
    <el-dialog v-model="batchVisible" title="批量录入计件" width="750px">
      <el-row :gutter="12" style="margin-bottom: 12px">
        <el-col :span="8">
          <el-date-picker v-model="batchDate" type="date" placeholder="日期" value-format="YYYY-MM-DD" />
        </el-col>
        <el-col :span="8">
          <el-select v-model="batchProcess" placeholder="工序" @change="onBatchProcessChange">
            <el-option v-for="p in activeProcesses" :key="p.id" :label="`${p.name} (￥${p.unit_price}/${p.unit})`" :value="p.id" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-button type="primary" @click="saveBatch">批量保存</el-button>
        </el-col>
      </el-row>
      <el-table :data="batchRows" border max-height="400px">
        <el-table-column label="工人" width="120">
          <template #default="{ row }">{{ row.workerName }}</template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row, $index }">
            <el-input-number v-model="row.quantity" :min="0" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="不合格" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.is_defective" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="备注">
          <template #default="{ row }">
            <el-input v-model="row.remark" size="small" />
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workerDao, processDao, pieceRecordDao } from '../../db/index.js'

const records = ref([])
const workerList = ref([])
const processList = ref([])
const filterWorker = ref('')
const filterProcess = ref('')
const filterDate = ref('')
const singleVisible = ref(false)
const batchVisible = ref(false)
const editingId = ref(null)
const singleForm = ref({})
const batchDate = ref('')
const batchProcess = ref(null)

const activeWorkers = computed(() => workerList.value.filter(w => w.status === '在职'))
const activeProcesses = computed(() => processList.value.filter(p => p.is_active))

const singleDefault = () => ({
  worker_id: null, process_id: null, record_date: new Date().toISOString().slice(0, 10),
  quantity: 0, unit_price_snapshot: 0, is_defective: false, defective_ratio: 1, remark: ''
})

const batchRows = ref([])

onMounted(async () => {
  workerList.value = await workerDao.getAll()
  processList.value = await processDao.getAll()
  await loadData()
})

async function loadData() {
  records.value = await pieceRecordDao.list({
    worker_id: filterWorker.value,
    process_id: filterProcess.value,
    date_from: filterDate.value || undefined,
    date_to: filterDate.value || undefined
  })
}

function getWorkerName(id) {
  const w = workerList.value.find(x => x.id === id)
  return w ? w.name : '-'
}
function getProcessName(id) {
  const p = processList.value.find(x => x.id === id)
  return p ? p.name : '-'
}

function showSingleForm(row) {
  if (row) {
    editingId.value = row.id
    singleForm.value = { ...row }
  } else {
    editingId.value = null
    singleForm.value = singleDefault()
  }
  singleVisible.value = true
}

function onProcessChange(val) {
  const p = processList.value.find(x => x.id === val)
  if (p) singleForm.value.unit_price_snapshot = p.unit_price
}

async function saveSingle() {
  if (!singleForm.value.worker_id || !singleForm.value.process_id) {
    ElMessage.warning('请选择工人和工序')
    return
  }
  if (editingId.value) {
    await pieceRecordDao.update(editingId.value, singleForm.value)
    ElMessage.success('修改成功')
  } else {
    singleForm.value.total_amount = singleForm.value.quantity * singleForm.value.unit_price_snapshot
    await pieceRecordDao.add(singleForm.value)
    ElMessage.success('录入成功')
  }
  singleVisible.value = false
  await loadData()
}

function showBatchEntry() {
  batchDate.value = new Date().toISOString().slice(0, 10)
  batchProcess.value = null
  batchRows.value = activeWorkers.value.map(w => ({
    worker_id: w.id,
    workerName: w.name,
    quantity: 0,
    is_defective: false,
    remark: ''
  }))
  batchVisible.value = true
}

function onBatchProcessChange(val) {
  // 切换工序后不需要重新构建列表，批量保存时会使用
}

async function saveBatch() {
  if (!batchProcess.value) {
    ElMessage.warning('请选择工序')
    return
  }
  const proc = processList.value.find(p => p.id === batchProcess.value)
  const items = batchRows.value
    .filter(r => r.quantity > 0)
    .map(r => ({
      worker_id: r.worker_id,
      process_id: batchProcess.value,
      record_date: batchDate.value,
      quantity: r.quantity,
      unit_price_snapshot: proc.unit_price,
      total_amount: r.quantity * proc.unit_price,
      is_defective: r.is_defective,
      defective_ratio: r.is_defective ? 1 : 0,
      remark: r.remark
    }))
  if (items.length === 0) {
    ElMessage.warning('没有有效的录入数据')
    return
  }
  await pieceRecordDao.batchAdd(items)
  ElMessage.success(`批量录入 ${items.length} 条记录成功`)
  batchVisible.value = false
  await loadData()
}

function resetForm() {
  singleForm.value = singleDefault()
  editingId.value = null
}

async function remove(row) {
  try {
    await ElMessageBox.confirm('确定删除此条记录吗？', '警告', { type: 'warning' })
    await pieceRecordDao.remove(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch { /* cancelled */ }
}
</script>
