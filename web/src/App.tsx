import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { PhoneShell, BottomNav } from './components/Shell';
import { Spinner } from './components/ui';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Jobs } from './pages/Jobs';
import { Score } from './pages/Score';
import { Wallet } from './pages/Wallet';
import { Profile } from './pages/Profile';
import { Browse } from './pages/Browse';
import { PostJob } from './pages/PostJob';
import { Orders } from './pages/Orders';
import { JobDetail } from './pages/JobDetail';
import { VerifyIdentity } from './pages/VerifyIdentity';
import { Admin } from './pages/Admin';
import { Cv } from './pages/Cv';
import { Contracts } from './pages/Contracts';
import { ContractDetail } from './pages/ContractDetail';
import { Guarantors } from './pages/Guarantors';
import { Legal } from './pages/Legal';
import { Notifications } from './pages/Notifications';
import { PublicProfile } from './pages/PublicProfile';
import { Certifications } from './pages/Certifications';
import { Assessment } from './pages/Assessment';
import { Landing } from './pages/Landing';
import { Enterprises } from './pages/Enterprises';
import { EnterpriseConsole } from './pages/EnterpriseConsole';
import { EnterpriseWeb } from './pages/EnterpriseWeb';
import { Credit } from './pages/Credit';
import { Certificate } from './pages/Certificate';

function AppLayout() {
  const { user, loading, mode } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <PhoneShell>
        <Spinner label="Loading Serategna…" />
      </PhoneShell>
    );
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return (
    <PhoneShell>
      <div className={`flex h-full flex-col ${mode === 'worker' ? 'role-worker' : 'role-employer'}`}>
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="home" element={<Home />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="score" element={<Score />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="profile" element={<Profile />} />
            <Route path="browse" element={<Browse />} />
            <Route path="post" element={<PostJob />} />
            <Route path="orders" element={<Orders />} />
            <Route path="job/:id" element={<JobDetail />} />
            <Route path="verify" element={<VerifyIdentity />} />
            <Route path="cv" element={<Cv />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contract/:id" element={<ContractDetail />} />
            <Route path="guarantors" element={<Guarantors />} />
            <Route path="legal" element={<Legal />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="certifications" element={<Certifications />} />
            <Route path="assessment" element={<Assessment />} />
            <Route path="enterprise" element={<EnterpriseConsole />} />
            <Route path="credit" element={<Credit />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </PhoneShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/enterprises" element={<Enterprises />} />
      {/* Enterprises hire entirely on the WEB (browser layout), not the phone app. */}
      <Route path="/hire" element={<EnterpriseWeb />} />
      <Route path="/login" element={<Login />} />
      <Route path="/p/:id" element={<PublicProfile />} />
      <Route path="/cert/:id" element={<Certificate />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/app/*" element={<AppLayout />} />
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  );
}
