import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { SchoolProvider } from './contexts/SchoolContext.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import SystemLayout from './layouts/SystemLayout.jsx'
import Home from './pages/public/Home.jsx'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import Kelayakan from './pages/public/Kelayakan.jsx'
import SuperAdminLayout from './pages/super-admin/SuperAdminLayout.jsx'
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard.jsx'
import SuperAdminMonitoring from './pages/super-admin/SuperAdminMonitoring.jsx'
import SuperAdminSimulations from './pages/super-admin/SuperAdminSimulations.jsx'
import SuperAdminAdmins from './pages/super-admin/SuperAdminAdmins.jsx'
import SuperAdminUsers from './pages/super-admin/SuperAdminUsers.jsx'
import SuperAdminDatabase from './pages/super-admin/SuperAdminDatabase.jsx'
import SchoolAdminLayout from './pages/school-admin/SchoolAdminLayout.jsx'
import SchoolAdminOverview from './pages/school-admin/SchoolAdminOverview.jsx'
import SchoolAdminProfile from './pages/school-admin/SchoolAdminProfile.jsx'
import SchoolAdminCriteria from './pages/school-admin/SchoolAdminCriteria.jsx'
import SchoolAdminRecommendedUsers from './pages/school-admin/SchoolAdminRecommendedUsers.jsx'
import SchoolAdminRecommendedUserDetail from './pages/school-admin/SchoolAdminRecommendedUserDetail.jsx'
import SchoolDetail from './pages/public/SchoolDetail.jsx'

import SuperAdminCriteriaRequests from './pages/super-admin/SuperAdminCriteriaRequests.jsx'
import SuperAdminActivityLogs from './pages/super-admin/SuperAdminActivityLogs.jsx'
import SuperAdminSchools from './pages/super-admin/SuperAdminSchools.jsx'

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/kelayakan" element={<Kelayakan />} />
              <Route path="/sekolah/:id" element={<SchoolDetail />} />
            </Route>
            <Route element={<SystemLayout />}>
              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="simulasi" element={<SuperAdminSimulations />} />
                <Route path="master-sekolah" element={<SuperAdminSchools />} />
                <Route path="pengajuan-kriteria" element={<SuperAdminCriteriaRequests />} />
                <Route path="admin-sekolah" element={<SuperAdminAdmins />} />
                <Route path="pengguna" element={<SuperAdminUsers />} />
                <Route path="log-aktivitas" element={<SuperAdminActivityLogs />} />
                <Route path="database" element={<SuperAdminDatabase />} />
              </Route>
              <Route path="/school-admin" element={<SchoolAdminLayout />}>
                <Route index element={<SchoolAdminOverview />} />
                <Route path="profil" element={<SchoolAdminProfile />} />
                <Route path="pengajuan-kriteria" element={<SchoolAdminCriteria />} />
                <Route path="kriteria" element={<SchoolAdminCriteria />} />
                <Route path="pengguna-direkomendasikan" element={<SchoolAdminRecommendedUsers />} />
                <Route path="pengguna-direkomendasikan/:submissionId" element={<SchoolAdminRecommendedUserDetail />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </SchoolProvider>
    </AuthProvider>
  )
}
