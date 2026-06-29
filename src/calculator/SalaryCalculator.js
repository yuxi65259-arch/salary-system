/**
 * 工资计算引擎
 * 实发工资 = 基本工资 + 计件总工资 + 加班工资 + 全勤奖 + 补贴合计 + 奖金合计
 *           - 考勤扣款(迟到+早退+旷工+事假+病假) - 其他扣款
 */
export class SalaryCalculator {
  constructor(config, worker, pieceRecords, attendanceRecords, allowanceRecords) {
    this.config = config
    this.worker = worker
    this.pieceRecords = pieceRecords
    this.attendanceRecords = attendanceRecords
    this.allowanceRecords = allowanceRecords
  }

  calcBaseSalary() {
    return this.worker.base_salary || this.config.default_base_salary || 0
  }

  calcPieceTotal() {
    return this.pieceRecords.reduce((sum, r) => {
      if (r.is_defective && r.defective_ratio >= 1) return sum
      const rate = r.is_defective ? (1 - (r.defective_ratio || 0)) : 1
      return sum + (r.quantity * (r.unit_price_snapshot || 0) * rate)
    }, 0)
  }

  calcOvertimePay() {
    const overtimeHours = this.attendanceRecords
      .filter(a => a.status === '加班')
      .reduce((sum, a) => sum + (a.overtime_hours || 0), 0)
    return overtimeHours * (this.config.overtime_pay_per_hour || 0)
  }

  calcAttendanceDeduction() {
    let total = 0
    const lateMinutes = this.attendanceRecords
      .filter(a => a.status === '迟到')
      .reduce((sum, a) => sum + (a.late_minutes || 0), 0)
    total += lateMinutes * (this.config.late_deduct_per_minute || 0)

    const earlyMinutes = this.attendanceRecords
      .filter(a => a.status === '早退')
      .reduce((sum, a) => sum + (a.early_minutes || 0), 0)
    total += earlyMinutes * (this.config.early_deduct_per_minute || 0)

    const absentDays = this.attendanceRecords.filter(a => a.status === '旷工').length
    total += absentDays * (this.config.absent_deduct_per_day || 0)

    const personalLeaveDays = this.attendanceRecords.filter(a => a.status === '请假' && a.leave_type === '事假').length
    total += personalLeaveDays * (this.config.personal_leave_deduct_per_day || 0)

    const sickLeaveDays = this.attendanceRecords.filter(a => a.status === '请假' && a.leave_type === '病假').length
    total += sickLeaveDays * (this.config.sick_leave_deduct_per_day || 0)

    return Math.round(total * 100) / 100
  }

  calcFullAttendanceBonus() {
    const workingDays = this.config.working_days_per_month || 22
    const lateCount = this.attendanceRecords.filter(a => a.status === '迟到').length
    const absentCount = this.attendanceRecords.filter(a => a.status === '旷工').length
    const earlyCount = this.attendanceRecords.filter(a => a.status === '早退').length
    const personalLeaveCount = this.attendanceRecords.filter(a => a.status === '请假' && a.leave_type === '事假').length
    const attendanceDays = this.attendanceRecords.filter(a => a.status === '出勤' || a.status === '加班').length

    if (absentCount > 0) return 0
    if (lateCount > (this.config.full_attendance_max_late || 0)) return 0
    if (earlyCount > 0) return 0
    if (personalLeaveCount > 0) return 0
    if (attendanceDays < workingDays) return 0

    return this.config.full_attendance_bonus || 0
  }

  calcAllowanceTotal() {
    return this.allowanceRecords
      .filter(a => a.type === '补贴')
      .reduce((sum, a) => sum + (a.amount || 0), 0)
  }

  calcBonusTotal() {
    return this.allowanceRecords
      .filter(a => a.type === '奖金')
      .reduce((sum, a) => sum + (a.amount || 0), 0)
  }

  calcOtherDeduction() {
    return this.allowanceRecords
      .filter(a => a.type === '扣款' || a.type === '其他')
      .reduce((sum, a) => sum + (a.amount || 0), 0)
  }

  calculate() {
    const baseSalary = this.calcBaseSalary()
    const pieceTotal = Math.round(this.calcPieceTotal() * 100) / 100
    const overtimePay = Math.round(this.calcOvertimePay() * 100) / 100
    const attendanceDeduction = this.calcAttendanceDeduction()
    const fullAttendanceBonus = this.calcFullAttendanceBonus()
    const allowanceTotal = this.calcAllowanceTotal()
    const bonusTotal = this.calcBonusTotal()
    const otherDeduction = this.calcOtherDeduction()

    const grossSalary = Math.round(
      (baseSalary + pieceTotal + overtimePay + fullAttendanceBonus + allowanceTotal + bonusTotal) * 100
    ) / 100

    const netSalary = Math.round(
      (grossSalary - attendanceDeduction - otherDeduction) * 100
    ) / 100

    return {
      baseSalary,
      pieceTotal,
      overtimePay,
      attendanceDeduction,
      fullAttendanceBonus,
      allowanceTotal,
      bonusTotal,
      otherDeduction,
      grossSalary,
      netSalary
    }
  }
}
