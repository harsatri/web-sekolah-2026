import { useEffect, useMemo, useState } from 'react'
import { useSchools } from '../contexts/SchoolContext.jsx'
import { apiJson } from '../utils/api.js'

function parseDateSafe(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const raw = String(value)
  const parsed = new Date(raw.includes(' ') ? raw.replace(' ', 'T') : raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function useSuperAdminData() {
  const { schools } = useSchools()
  const [allUsers, setAllUsers] = useState([])
  const [simulationLogs, setSimulationLogs] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [criteriaRequests, setCriteriaRequests] = useState([])

  useEffect(() => {
    let cancelled = false
    const refreshData = async () => {
      try {
        const [users, simulations, activities, requests] = await Promise.all([
          apiJson('/api/users'),
          apiJson('/api/eligibility-submissions'),
          apiJson('/api/activity-logs'),
          apiJson('/api/criteria-requests'),
        ])
        if (cancelled) return
        setAllUsers(Array.isArray(users) ? users : [])
        setSimulationLogs(Array.isArray(simulations) ? simulations : [])
        setActivityLogs(Array.isArray(activities) ? activities : [])
        setCriteriaRequests(Array.isArray(requests) ? requests : [])
      } catch {
        if (cancelled) return
        setAllUsers([])
        setSimulationLogs([])
        setActivityLogs([])
        setCriteriaRequests([])
      }
    }
    refreshData()
    window.addEventListener('focus', refreshData)
    return () => {
      window.removeEventListener('focus', refreshData)
      cancelled = true
    }
  }, [])

  const adminUsers = useMemo(() => allUsers.filter((item) => item.role === 'school_admin'), [allUsers])
  const regularUsers = useMemo(() => allUsers.filter((item) => item.role === 'user'), [allUsers])

  const stats = useMemo(() => {
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const simulationsLastWeek = simulationLogs.filter((s) => {
      const date = parseDateSafe(s.submittedAt)
      return date ? date > lastWeek : false
    }).length
    const usersLastWeek = regularUsers.filter(u => new Date(u.createdAt) > lastWeek).length
    const adminsLastWeek = adminUsers.filter(a => new Date(a.createdAt) > lastWeek).length

    return {
      totalUsers: regularUsers.length,
      usersDelta: usersLastWeek,
      totalSchools: schools.length,
      totalAdmins: adminUsers.length,
      adminsDelta: adminsLastWeek,
      totalSimulations: simulationLogs.length,
      simulationsDelta: simulationsLastWeek,
      totalActivities: activityLogs.length,
      activeRules: 7, // Placeholder or fetch from backend if available
    }
  }, [regularUsers, schools.length, adminUsers, simulationLogs, activityLogs.length])

  const pendingRequests = useMemo(() => {
    return criteriaRequests.filter(r => r.status === 'pending')
  }, [criteriaRequests])

  const simulationDetails = useMemo(() => {
    return [...simulationLogs]
      .sort((a, b) => {
        const bTime = parseDateSafe(b.submittedAt)?.getTime() || 0
        const aTime = parseDateSafe(a.submittedAt)?.getTime() || 0
        return bTime - aTime
      })
      .map((item) => ({
        id: item.id,
        submittedAt: item.submittedAt,
        accountName: item.userName || '-',
        accountEmail: item.userEmail || '-',
        candidateName: item.input?.candidateName || '-',
        score: item.result?.score ?? 0,
        status: item.result?.status || '-',
        recommendations: (item.recommendations || []).map((rec) => rec.schoolName).join(', ') || '-',
      }))
  }, [simulationLogs])

  const criteriaNotifications = useMemo(() => {
    return [...activityLogs]
      .filter((item) => item.type === 'criteria_updated')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [activityLogs])

  const monthlyUsage = useMemo(() => {
    const currentMonth = new Date()
    const labels = []
    const data = []
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1)
      const monthLabel = monthDate.toLocaleString('id-ID', { month: 'short', year: '2-digit' })
      labels.push(monthLabel)

      const count = simulationLogs.filter((item) => {
        if (!item.submittedAt) return false
        const date = parseDateSafe(item.submittedAt)
        if (!date) return false
        return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear()
      }).length
      data.push(count)
    }
    return labels.map((label, index) => ({ label, value: data[index] }))
  }, [simulationLogs])

  const formatDateTime = (isoValue) => {
    if (!isoValue) return '-'
    return new Date(isoValue).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const persistUsers = async (nextUsers) => {
    await apiJson('/api/users/bulk', { method: 'PUT', body: nextUsers })
    setAllUsers(nextUsers)
  }

  const getStatusLabel = (item) => (item.active === false ? 'Nonaktif' : 'Aktif')

  return {
    allUsers,
    adminUsers,
    regularUsers,
    simulationDetails,
    criteriaNotifications,
    monthlyUsage,
    stats,
    formatDateTime,
    persistUsers,
    getStatusLabel,
    criteriaRequests,
    pendingRequests,
    activityLogs,
  }
}
