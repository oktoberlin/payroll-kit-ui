repo: oktoberlin/payroll-kit
branch: main

## Last sync
date: 2026-10-12T03:10:21Z

### Updated in this project
- Designed the PayrollKit web UI (light + dark) from the Django API's models, roles and lifecycle
- Payslip figures computed from the seed data and calculation rules (illustrative tax table)
- Design tokens (CSS variables + Tailwind config) and a component sheet

## Screen map
| Screen | Repo files |
|---|---|
| Login, roles, shell | README.md, payroll/permissions.py, payroll/management/commands/seed_demo.py |
| Dashboard, Payroll runs, Run detail | payroll/models.py (PayrollRun, Payslip), payroll/services/runs.py |
| Payslip drawer / My payslips | payroll/services/calculation.py, payroll/services/ytd.py, payroll/management/commands/seed_demo.py |
| Employees, CSV import | payroll/models.py (Employee), payroll/services/csv_import.py |
| Pay periods, Timesheets | payroll/models.py (PayPeriod, TimesheetEntry) |
| Deductions & benefits | payroll/models.py (DeductionType, EmployeeDeduction) |
| Tax tables | payroll/models.py (TaxTable, TaxBracket), seed_demo.py |
| Audit log | payroll/models.py (AuditLog), payroll/services/audit.py |
