import Dexie from 'dexie'

const db = new Dexie('SalarySystem')

db.version(1).stores({
  workers: '++id, worker_no, department, status',
  process_def: '++id, code, category, is_active',
  piece_records: '++id, worker_id, process_id, record_date, [worker_id+record_date]',
  attendance: '++id, worker_id, record_date, status, [worker_id+record_date]',
  salary_config: '++id',
  allowance_records: '++id, worker_id, record_month, type, [worker_id+record_month]',
  salary_results: '++id, worker_id, salary_month, status, [worker_id+salary_month]'
})

// ==================== Workers ====================
export const workerDao = {
  async list(filter = {}) {
    let coll = db.workers
    if (filter.department) coll = coll.where('department').equals(filter.department)
    if (filter.status) coll = coll.filter(w => w.status === filter.status)
    return filter.keyword
      ? coll.filter(w => w.name.includes(filter.keyword) || w.worker_no.includes(filter.keyword)).toArray()
      : coll.toArray()
  },
  async getAll() { return db.workers.toArray() },
  async getActive() { return db.workers.filter(w => w.status === '在职').toArray() },
  async getById(id) { return db.workers.get(Number(id)) },
  async add(worker) { return db.workers.add({ ...worker, status: '在职', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  async update(id, data) { return db.workers.update(Number(id), { ...data, updated_at: new Date().toISOString() }) },
  async remove(id) { return db.workers.delete(Number(id)) },
  async count() { return db.workers.count() }
}

// ==================== Process Def ====================
export const processDao = {
  async list(filter = {}) {
    let coll = db.process_def
    if (filter.category) coll = coll.filter(p => p.category === filter.category)
    if (filter.is_active !== undefined) coll = coll.filter(p => p.is_active === filter.is_active)
    return coll.toArray()
  },
  async getAll() { return db.process_def.toArray() },
  async getActive() { return db.process_def.filter(p => p.is_active).toArray() },
  async getById(id) { return db.process_def.get(Number(id)) },
  async add(proc) { return db.process_def.add({ ...proc, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  async update(id, data) { return db.process_def.update(Number(id), { ...data, updated_at: new Date().toISOString() }) },
  async remove(id) { return db.process_def.delete(Number(id)) },
  async count() { return db.process_def.count() }
}

// ==================== Piece Records ====================
export const pieceRecordDao = {
  async list(filter = {}) {
    let coll = db.piece_records
    if (filter.worker_id) coll = coll.where('worker_id').equals(Number(filter.worker_id))
    if (filter.process_id) coll = coll.filter(r => r.process_id === Number(filter.process_id))
    if (filter.date_from) coll = coll.filter(r => r.record_date >= filter.date_from)
    if (filter.date_to) coll = coll.filter(r => r.record_date <= filter.date_to)
    return coll.reverse().sortBy('record_date')
  },
  async getByWorkerAndMonth(workerId, yearMonth) {
    const prefix = yearMonth + '-'
    return db.piece_records
      .where('[worker_id+record_date]')
      .between([Number(workerId), prefix + '01'], [Number(workerId), prefix + '31'], true, true)
      .toArray()
  },
  async getById(id) { return db.piece_records.get(Number(id)) },
  async add(record) { return db.piece_records.add({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  async update(id, data) { return db.piece_records.update(Number(id), { ...data, updated_at: new Date().toISOString() }) },
  async remove(id) { return db.piece_records.delete(Number(id)) },
  async batchAdd(records) { return db.piece_records.bulkAdd(records.map(r => ({ ...r, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }))) }
}

// ==================== Attendance ====================
export const attendanceDao = {
  async list(filter = {}) {
    let coll = db.attendance
    if (filter.worker_id) coll = coll.where('worker_id').equals(Number(filter.worker_id))
    if (filter.date_from) coll = coll.filter(a => a.record_date >= filter.date_from)
    if (filter.date_to) coll = coll.filter(a => a.record_date <= filter.date_to)
    return coll.toArray()
  },
  async getByWorkerAndMonth(workerId, yearMonth) {
    const prefix = yearMonth + '-'
    return db.attendance
      .where('[worker_id+record_date]')
      .between([Number(workerId), prefix + '01'], [Number(workerId), prefix + '31'], true, true)
      .toArray()
  },
  async getByMonth(yearMonth) {
    const prefix = yearMonth + '-'
    return db.attendance
      .where('record_date')
      .between(prefix + '01', prefix + '31', true, true)
      .toArray()
  },
  async getByWorkerAndDate(workerId, date) {
    return db.attendance
      .where('[worker_id+record_date]')
      .equals([Number(workerId), date])
      .first()
  },
  async getById(id) { return db.attendance.get(Number(id)) },
  async add(record) { return db.attendance.add({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  async update(id, data) { return db.attendance.update(Number(id), { ...data, updated_at: new Date().toISOString() }) },
  async remove(id) { return db.attendance.delete(Number(id)) },
  async put(record) {
    const existing = await db.attendance
      .where('[worker_id+record_date]')
      .equals([Number(record.worker_id), record.record_date])
      .first()
    if (existing) {
      return db.attendance.update(existing.id, { ...record, updated_at: new Date().toISOString() })
    } else {
      return db.attendance.add({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    }
  }
}

// ==================== Salary Config ====================
export const configDao = {
  async get() {
    const configs = await db.salary_config.toArray()
    return configs.length > 0 ? configs[0] : null
  },
  async save(config) {
    const existing = await db.salary_config.toArray()
    if (existing.length > 0) {
      return db.salary_config.update(existing[0].id, { ...config, updated_at: new Date().toISOString() })
    } else {
      return db.salary_config.add({ ...config, updated_at: new Date().toISOString() })
    }
  },
  async getDefault() {
    return {
      default_base_salary: 3000,
      late_deduct_per_minute: 1,
      early_deduct_per_minute: 1,
      absent_deduct_per_day: 200,
      personal_leave_deduct_per_day: 150,
      sick_leave_deduct_per_day: 50,
      overtime_pay_per_hour: 25,
      full_attendance_bonus: 300,
      full_attendance_max_late: 0,
      meal_subsidy_per_day: 15,
      transport_subsidy_per_month: 100,
      housing_subsidy_per_month: 200,
      working_days_per_month: 22,
      updated_at: new Date().toISOString()
    }
  }
}

// ==================== Allowance Records ====================
export const allowanceDao = {
  async list(filter = {}) {
    let coll = db.allowance_records
    if (filter.worker_id) coll = coll.where('worker_id').equals(Number(filter.worker_id))
    if (filter.record_month) coll = coll.filter(a => a.record_month === filter.record_month)
    if (filter.type) coll = coll.filter(a => a.type === filter.type)
    return coll.reverse().sortBy('record_month')
  },
  async getByWorkerAndMonth(workerId, recordMonth) {
    return db.allowance_records
      .where('[worker_id+record_month]')
      .equals([Number(workerId), recordMonth])
      .toArray()
  },
  async getById(id) { return db.allowance_records.get(Number(id)) },
  async add(record) { return db.allowance_records.add({ ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) },
  async update(id, data) { return db.allowance_records.update(Number(id), { ...data, updated_at: new Date().toISOString() }) },
  async remove(id) { return db.allowance_records.delete(Number(id)) }
}

// ==================== Salary Results ====================
export const salaryResultDao = {
  async list(filter = {}) {
    let coll = db.salary_results
    if (filter.salary_month) coll = coll.where('salary_month').equals(filter.salary_month)
    if (filter.status) coll = coll.filter(r => r.status === filter.status)
    return coll.reverse().sortBy('salary_month')
  },
  async getByWorkerAndMonth(workerId, salaryMonth) {
    return db.salary_results
      .where('[worker_id+salary_month]')
      .equals([Number(workerId), salaryMonth])
      .first()
  },
  async getById(id) { return db.salary_results.get(Number(id)) },
  async add(result) { return db.salary_results.add({ ...result, created_at: new Date().toISOString() }) },
  async update(id, data) { return db.salary_results.update(Number(id), data) },
  async remove(id) { return db.salary_results.delete(Number(id)) },
  async batchPut(results) {
    for (const r of results) {
      const existing = await db.salary_results
        .where('[worker_id+salary_month]')
        .equals([Number(r.worker_id), r.salary_month])
        .first()
      if (existing) {
        await db.salary_results.update(existing.id, r)
      } else {
        await db.salary_results.add(r)
      }
    }
  }
}

export default db
