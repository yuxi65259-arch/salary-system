<template>
  <div>
    <h3 style="margin-bottom: 16px">工资配置</h3>

    <el-card>
      <template #header>基本设置</template>
      <el-form :model="form" label-width="180px">
        <el-form-item label="默认基本工资(元)">
          <el-input-number v-model="form.default_base_salary" :min="0" :step="100" />
        </el-form-item>
        <el-form-item label="月标准工作天数">
          <el-input-number v-model="form.working_days_per_month" :min="1" :max="31" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>考勤扣款规则</template>
      <el-form :model="form" label-width="180px">
        <el-form-item label="迟到每分钟扣款(元)">
          <el-input-number v-model="form.late_deduct_per_minute" :min="0" :precision="1" :step="0.5" />
        </el-form-item>
        <el-form-item label="早退每分钟扣款(元)">
          <el-input-number v-model="form.early_deduct_per_minute" :min="0" :precision="1" :step="0.5" />
        </el-form-item>
        <el-form-item label="旷工每天扣款(元)">
          <el-input-number v-model="form.absent_deduct_per_day" :min="0" :step="10" />
        </el-form-item>
        <el-form-item label="事假每天扣款(元)">
          <el-input-number v-model="form.personal_leave_deduct_per_day" :min="0" :step="10" />
        </el-form-item>
        <el-form-item label="病假每天扣款(元)">
          <el-input-number v-model="form.sick_leave_deduct_per_day" :min="0" :step="10" />
        </el-form-item>
        <el-form-item label="加班每小时工资(元)">
          <el-input-number v-model="form.overtime_pay_per_hour" :min="0" :step="1" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>全勤奖设置</template>
      <el-form :model="form" label-width="180px">
        <el-form-item label="全勤奖金额(元)">
          <el-input-number v-model="form.full_attendance_bonus" :min="0" :step="10" />
        </el-form-item>
        <el-form-item label="允许最大迟到次数">
          <el-input-number v-model="form.full_attendance_max_late" :min="0" :max="31" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>补贴标准</template>
      <el-form :model="form" label-width="180px">
        <el-form-item label="餐补/天(元)">
          <el-input-number v-model="form.meal_subsidy_per_day" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="交通补贴/月(元)">
          <el-input-number v-model="form.transport_subsidy_per_month" :min="0" :step="10" />
        </el-form-item>
        <el-form-item label="住宿补贴/月(元)">
          <el-input-number v-model="form.housing_subsidy_per_month" :min="0" :step="10" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-button type="primary" size="large" style="margin-top: 20px" @click="save">保存配置</el-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { configDao } from '../../db/index.js'

const form = ref({})

onMounted(async () => {
  const saved = await configDao.get()
  form.value = saved || await configDao.getDefault()
})

async function save() {
  await configDao.save(form.value)
  ElMessage.success('配置已保存')
}
</script>
