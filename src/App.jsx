import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { I18nProvider } from './lib/i18n';
import Layout from './components/Layout';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import TeamTasks from './pages/TeamTasks';
import TaskDetail from './pages/TaskDetail';
import KanbanBoard from './pages/KanbanBoard';
import CalendarView from './pages/CalendarView';
import ApprovalQueue from './pages/ApprovalQueue';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import RolesPermissions from './pages/admin/RolesPermissions';
import Responsibilities from './pages/admin/Responsibilities';
import AdminSettings from './pages/admin/Settings';
import AuditLog from './pages/admin/AuditLog';
import Dashboard from './pages/Dashboard';
import ProjectDashboard from './pages/ProjectDashboard';
import TeamDashboard from './pages/TeamDashboard';
import UserDashboard from './pages/UserDashboard';
import PMODashboard from './pages/PMODashboard';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/project" element={<ProjectDashboard />} />
        <Route path="/dashboard/team" element={<TeamDashboard />} />
        <Route path="/dashboard/user" element={<UserDashboard />} />
        <Route path="/dashboard/pmo" element={<PMODashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/team-tasks" element={<TeamTasks />} />
        <Route path="/kanban" element={<KanbanBoard />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/approvals" element={<ApprovalQueue />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:id" element={<TeamDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin/roles" element={<RolesPermissions />} />
        <Route path="/admin/responsibilities" element={<Responsibilities />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/audit-log" element={<AuditLog />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <I18nProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </I18nProvider>
    </AuthProvider>
  )
}

export default App