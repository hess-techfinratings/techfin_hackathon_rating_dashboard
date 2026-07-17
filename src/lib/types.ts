export interface RatingRequest {
  no_req: string
  md5_no_biz: string
  da_calc: string
  grade_type: string | null
  cv_dm_base: string | null
  cv_num_grade: number | null
  cv_char_grade: string | null
  n_dm_base: string | null
  n_num_grade: number | null
  n_char_grade: string | null
  k_dm_base: string | null
  k_num_grade: number | null
  k_char_grade: string | null
  mis_cd_error: string | null
  mis_msg_error: string | null
  fs_cd_error: string | null
  fs_msg_error: string | null
}

export interface FinancialStatementRow {
  id: number
  no_req: string
  da_calc: string | null
  dm_base: string | null
  gisu: number | null
  dm_fndbegin: string | null
  dm_fndend: string | null
  fn_data_gb: "BS" | "IS"
  acct_cd: string | null
  acct_nm: string | null
  amt: number | string | null
}

export interface OverviewStats {
  total_requests: number
  cv_graded: number
  type_fs: number
  type_mis_fs: number
  type_mis: number
  type_none: number
  distinct_companies: number
  companies_with_financials: number
}

export interface GradeDistributionRow {
  agency: "crediview" | "nice" | "cretop"
  char_grade: string
  grade_order: number | null
  cnt: number
}

export interface MonthlyTrendViewRow {
  month: string
  total: number
  graded: number
  ungraded: number
}

export interface AgencyDivergenceRow {
  agency: "nice" | "cretop"
  notch_diff: number
  cnt: number
}

export interface ErrorCodeRow {
  system: "MIS" | "FS"
  code: string
  sample_msg: string | null
  cnt: number
}

export interface CompanySummary {
  no_req: string
  da_calc: string
  grade_type: string | null
  cv_char_grade: string | null
  cv_num_grade: number | null
  n_char_grade: string | null
  k_char_grade: string | null
  latest_fiscal_end: string | null
  total_assets: number | string | null
  revenue: number | string | null
  net_income: number | string | null
}
