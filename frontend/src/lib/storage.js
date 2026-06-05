const KEY = 'clearpath_checks'

export function getChecks() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

export function saveCheck(report) {
  const checks = getChecks()
  const idx = checks.findIndex(c => c.checkId === report.checkId)
  if (idx >= 0) checks[idx] = report
  else checks.unshift(report)
  localStorage.setItem(KEY, JSON.stringify(checks.slice(0, 100)))
}

export function getCheck(checkId) {
  return getChecks().find(c => c.checkId === checkId) || null
}
