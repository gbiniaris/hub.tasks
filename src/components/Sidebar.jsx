import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  CheckSquare, FolderOpen, Users, BarChart2, Shield, ChevronDown, ChevronRight,
  Settings, ClipboardList, Calendar, UserCheck, Building2, List, LayoutGrid,
  ScrollText, BookOpen, LayoutDashboard, TrendingUp, Briefcase
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';

const NAV = [
  {
    key: 'dashboards', icon: LayoutDashboard, labelKey: 'dashboard',
    children: [
      { path: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
      { path: '/dashboard/project', labelKey: 'projects', icon: FolderOpen },
      { path: '/dashboard/team', labelKey: 'teams', icon: Building2 },
      { path: '/dashboard/user', labelKey: 'myTasks', icon: UserCheck },
      { path: '/dashboard/pmo', label: 'PMO', icon: Briefcase },
    ]
  },
  {
    key: 'tasks', icon: CheckSquare, labelKey: 'tasks',
    children: [
      { path: '/tasks', labelKey: 'tasks', icon: List },
      { path: '/my-tasks', labelKey: 'myTasks', icon: UserCheck },
      { path: '/team-tasks', labelKey: 'teamTasks', icon: Users },
      { path: '/kanban', labelKey: 'kanban', icon: LayoutGrid },
      { path: '/calendar', labelKey: 'calendar', icon: Calendar },
      { path: '/approvals', labelKey: 'approvals', icon: ClipboardList },
    ]
  },
  { key: 'projects', icon: FolderOpen, labelKey: 'projects', path: '/projects' },
  { key: 'teams', icon: Building2, labelKey: 'teams', path: '/teams' },
  { key: 'users', icon: Users, labelKey: 'users', path: '/users' },
  { key: 'reports', icon: BarChart2, labelKey: 'reports', path: '/reports' },
  {
    key: 'admin', icon: Shield, labelKey: 'admin',
    children: [
      { path: '/admin/roles', labelKey: 'roles', icon: BookOpen },
      { path: '/admin/responsibilities', labelKey: 'responsibilities', icon: ScrollText },
      { path: '/admin/settings', labelKey: 'settings', icon: Settings },
      { path: '/admin/audit-log', labelKey: 'auditLog', icon: ClipboardList },
    ]
  },
];

export default function Sidebar({ collapsed, onCollapse }) {
  const { t } = useI18n();
  const location = useLocation();
  const [expanded, setExpanded] = useState({ dashboards: true, tasks: false, admin: false });

  const isActive = (path) => location.pathname === path;
  const isGroupActive = (item) => item.children?.some(c => location.pathname.startsWith(c.path));

  const toggleGroup = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col z-30 transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <span className="font-bold text-sidebar-primary text-base tracking-tight truncate">TaskHub</span>
        )}
        <button
          onClick={onCollapse}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <ChevronRight className={cn('w-4 h-4 transition-transform', !collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((item) => {
          if (item.children) {
            const open = expanded[item.key];
            const groupActive = isGroupActive(item);
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleGroup(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                    groupActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>}
                  {!collapsed && (open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                </button>
                {!collapsed && open && (
                  <div className="ml-3 mt-0.5 space-y-0.5 pl-3 border-l border-sidebar-border">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                          isActive(child.path)
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{child.label || t(child.labelKey)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.key}
              to={item.path}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}