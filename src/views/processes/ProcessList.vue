<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3>工序管理</h3>
      <el-button type="primary" @click="showForm(null)">添加工序</el-button>
    </div>

    <el-table :data="processes" border stripe style="width: 100%">
      <el-table-column prop="code" label="编号" width="100" />
      <el-table-column prop="name" label="工序名称" width="150" />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="unit" label="计价单位" width="100" />
      <el-table-column prop="unit_price" label="单价(元)" width="100" />
      <el-table-column prop="is_active" label="状态" width="80">
        <template #default="{ row }">
          <el-switch
            :model-value="row.is_active"
            @change="(val) => toggleActive(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑工序' : '添加工序'"
      width="450px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="90px">
        <el-form-item label="编号"><el-input v-model="form.code" placeholder="如 P001" /></el-form-item>
        <el-form-item label="工序名称"><el-input v-model="form.name" placeholder="如：裁剪" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" placeholder="如：机加工" /></el-form-item>
        <el-form-item label="计价单位"><el-input v-model="form.unit" placeholder="如：件" /></el-form-item>
        <el-form-item label="单价(元)">
          <el-input-number v-model="form.unit_price" :min="0" :precision="2" :step="0.1" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
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
import { processDao } from '../../db/index.js'

const processes = ref([])
const formVisible = ref(false)
const editingId = ref(null)
const form = ref({})

onMounted(() => loadData())

async function loadData() {
  processes.value = await processDao.getAll()
}

function showForm(row) {
  if (row) {
    editingId.value = row.id
    form.value = { ...row }
  } else {
    editingId.value = null
    form.value = { code: '', name: '', category: '', unit: '件', unit_price: 0, remark: '' }
  }
  formVisible.value = true
}

async function save() {
  if (!form.value.name || !form.value.code) {
    ElMessage.warning('编号和名称不能为空')
    return
  }
  if (editingId.value) {
    await processDao.update(editingId.value, form.value)
    ElMessage.success('修改成功')
  } else {
    await processDao.add(form.value)
    ElMessage.success('添加成功')
  }
  formVisible.value = false
  await loadData()
}

function resetForm() {
  form.value = {}
  editingId.value = null
}

async function toggleActive(row, val) {
  await processDao.update(row.id, { is_active: val })
  await loadData()
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除工序「${row.name}」吗？`, '警告', { type: 'warning' })
    await processDao.remove(row.id)
    ElMessage.success('已删除')
    await loadData()
  } catch { /* cancelled */ }
}
</script>
