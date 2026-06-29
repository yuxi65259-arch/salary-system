<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>工人管理</h3>
      <el-button type="primary" @click="showForm(null)">添加工人</el-button>
    </div>

    <el-row :gutter="12" style="margin-bottom: 12px">
      <el-col :span="6">
        <el-input v-model="keyword" placeholder="搜索姓名/工号" clearable @input="loadData" />
      </el-col>
      <el-col :span="4">
        <el-select v-model="filterDept" placeholder="部门筛选" clearable @change="loadData">
          <el-option v-for="d in departments" :key="d" :label="d" :value="d" />
        </el-select>
      </el-col>
      <el-col :span="4">
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable @change="loadData">
          <el-option label="在职" value="在职" />
          <el-option label="离职" value="离职" />
        </el-select>
      </el-col>
    </el-row>

    <el-table :data="workers" border stripe style="width: 100%" max-height="calc(100vh - 260px)">
      <el-table-column prop="worker_no" label="工号" width="100" />
      <el-table-column prop="name" label="姓名" width="90" />
      <el-table-column prop="gender" label="性别" width="60" />
      <el-table-column prop="department" label="部门" width="100" />
      <el-table-column prop="position" label="岗位" width="100" />
      <el-table-column prop="base_salary" label="基本工资" width="100">
        <template #default="{ row }">￥{{ row.base_salary }}</template>
      </el-table-column>
      <el-table-column prop="hire_date" label="入职日期" width="110" />
      <el-table-column prop="phone" label="电话" width="120" />
      <el-table-column prop="status" label="状态" width="70">
        <template #default="{ row }">
          <el-tag :type="row.status === '在职' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showForm(row)">编辑</el-button>
          <el-button
            v-if="row.status === '在职'"
            size="small"
            type="warning"
            @click="setStatus(row, '离职')"
          >离职</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑工人' : '添加工人'"
      width="500px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="90px">
        <el-form-item label="工号"><el-input v-model="form.worker_no" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="性别">
          <el-select v-model="form.gender"><el-option label="男" value="男" /><el-option label="女" value="女" /></el-select>
        </el-form-item>
        <el-form-item label="部门"><el-input v-model="form.department" /></el-form-item>
        <el-form-item label="岗位"><el-input v-model="form.position" /></el-form-item>
        <el-form-item label="身份证号"><el-input v-model="form.id_card" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="入职日期">
          <el-date-picker v-model="form.hire_date" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="基本工资">
          <el-input-number v-model="form.base_salary" :min="0" :step="100" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workerDao, configDao } from '../../db/index.js'

const workers = ref([])
const departments = ref([])
const keyword = ref('')
const filterDept = ref('')
const filterStatus = ref('')
const formVisible = ref(false)
const editingId = ref(null)
const form = ref({})

const defaultForm = () => ({
  worker_no: '', name: '', gender: '男', department: '', position: '',
  id_card: '', phone: '', hire_date: '', base_salary: 3000, remark: ''
})

onMounted(async () => {
  await loadData()
  const all = await workerDao.getAll()
  departments.value = [...new Set(all.map(w => w.department).filter(Boolean))]
})

async function loadData() {
  workers.value = await workerDao.list({
    keyword: keyword.value,
    department: filterDept.value,
    status: filterStatus.value
  })
}

function showForm(row) {
  if (row) {
    editingId.value = row.id
    form.value = { ...row }
  } else {
    editingId.value = null
    form.value = defaultForm()
  }
  formVisible.value = true
}

async function save() {
  if (!form.value.name || !form.value.worker_no) {
    ElMessage.warning('姓名和工号不能为空')
    return
  }
  if (editingId.value) {
    await workerDao.update(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await workerDao.add(form.value)
    ElMessage.success('添加成功')
  }
  formVisible.value = false
  await loadData()
}

function resetForm() {
  form.value = defaultForm()
  editingId.value = null
}

async function setStatus(row, status) {
  await workerDao.update(row.id, { status })
  ElMessage.success(`已标记为${status}`)
  await loadData()
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除工人「${row.name}」吗？此操作不可恢复。`, '警告', { type: 'warning' })
    await workerDao.remove(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch { /* cancelled */ }
}
</script>
