<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>补贴 / 奖金 / 扣款</h3>
      <el-button type="primary" @click="showForm(null)">添加记录</el-button>
    </div>

    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="4">
        <el-select v-model="filterMonth" placeholder="月份筛选" clearable @change="loadData">
          <el-option v-for="m in months" :key="m" :label="m" :value="m" />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-select v-model="filterType" placeholder="类型筛选" clearable @change="loadData">
          <el-option label="奖金" value="奖金" />
          <el-option label="补贴" value="补贴" />
          <el-option label="扣款" value="扣款" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-col>
    </el-row>

    <el-table :data="allowances" border stripe max-height="calc(100vh - 260px)">
      <el-table-column label="工人" width="90">
        <template #default="{ row }">{{ getWorkerName(row.worker_id) }}</template>
      </el-table-column>
      <el-table-column prop="record_month" label="月份" width="100" />
      <el-table-column prop="type" label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.type === '扣款' ? 'danger' : row.type === '奖金' ? 'success' : 'primary'">
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="subtype" label="子类别" width="100" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          <span :style="{ color: row.type === '扣款' ? '#f56c6c' : '#67c23a' }">
            {{ row.type === '扣款' ? '-' : '+' }}￥{{ row.amount }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="说明" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑记录' : '添加记录'"
      width="450px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="90px">
        <el-form-item label="工人">
          <el-select v-model="form.worker_id" filterable>
            <el-option v-for="w in activeWorkers" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份"><el-input v-model="form.record_month" placeholder="如 2025-01" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option label="奖金" value="奖金" />
            <el-option label="补贴" value="补贴" />
            <el-option label="扣款" value="扣款" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="子类别"><el-input v-model="form.subtype" placeholder="如：全勤奖、餐补、罚款" /></el-form-item>
        <el-form-item label="金额(元)">
          <el-input-number v-model="form.amount" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="说明"><el-input v-model="form.note" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workerDao, allowanceDao } from '../../db/index.js'

const allowances = ref([])
const workerList = ref([])
const formVisible = ref(false)
const editingId = ref(null)
const form = ref({})
const filterMonth = ref('')
const filterType = ref('')

const months = computed(() => {
  const set = new Set(allowances.value.map(a => a.record_month))
  return [...set].sort().reverse()
})

const activeWorkers = computed(() => workerList.value.filter(w => w.status === '在职'))

onMounted(async () => {
  workerList.value = await workerDao.getAll()
  await loadData()
})

async function loadData() {
  allowances.value = await allowanceDao.list({
    record_month: filterMonth.value || undefined,
    type: filterType.value || undefined
  })
}

function getWorkerName(id) {
  const w = workerList.value.find(x => x.id === id)
  return w ? w.name : '-'
}

function showForm(row) {
  if (row) {
    editingId.value = row.id
    form.value = { ...row }
  } else {
    editingId.value = null
    form.value = { worker_id: null, record_month: '', type: '补贴', subtype: '', amount: 0, note: '' }
  }
  formVisible.value = true
}

async function save() {
  if (!form.value.worker_id || !form.value.record_month) {
    ElMessage.warning('请填写工人和月份')
    return
  }
  if (editingId.value) {
    await allowanceDao.update(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await allowanceDao.add(form.value)
    ElMessage.success('添加成功')
  }
  formVisible.value = false
  await loadData()
}

function resetForm() {
  form.value = {}
  editingId.value = null
}

async function remove(row) {
  try {
    await ElMessageBox.confirm('确定删除此条记录吗？', '警告', { type: 'warning' })
    await allowanceDao.remove(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch { /* cancelled */ }
}
</script>
