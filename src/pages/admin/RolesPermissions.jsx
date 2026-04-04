import { useState, useEffect } from 'react';
import { Shield, Check } from 'lucide-react';
import { base44 } from '../../api/base44Client';
import { useI18n } from '../../lib/i18n';

export default function RolesPermissions() {
  const { t } = useI18n();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePerms, setRolePerms] = useState([]);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Role.list('-level', 20),
      base44.entities.Permission.list('-created_date', 50),
      base44.entities.RolePermission.list('-created_date', 200),
    ]).then(([r, p, rp]) => {
      const sorted = [...r].sort((a, b) => a.level - b.level);
      setRoles(sorted);
      setPermissions(p);
      setRolePerms(rp);
      if (sorted.length) setActiveRole(sorted[0]);
    });
  }, []);

  const hasPermission = (roleId, permId) => rolePerms.some(rp => rp.role_id === roleId && rp.permission_id === permId);

  const CATEGORY_COLORS = {
    users: 'bg-blue-100 text-blue-700',
    roles: 'bg-purple-100 text-purple-700',
    projects: 'bg-green-100 text-green-700',
    tasks: 'bg-amber-100 text-amber-700',
    teams: 'bg-cyan-100 text-cyan-700',
    reports: 'bg-indigo-100 text-indigo-700',
    settings: 'bg-slate-100 text-slate-700',
    audit: 'bg-red-100 text-red-700',
  };

  const categories = [...new Set(permissions.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('roles')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage role-based access control</p>
      </div>

      <div className="grid grid-cols-4 gap-6" style={{ minHeight: '60vh' }}>
        {/* Role list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Roles</h3>
          </div>
          <div className="divide-y divide-border">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${activeRole?.id === role.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
              >
                <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${activeRole?.id === role.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${activeRole?.id === role.id ? 'text-primary' : 'text-foreground'}`}>{role.name}</p>
                  <p className="text-xs text-muted-foreground">Level {role.level}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Permission matrix */}
        <div className="col-span-3 bg-card border border-border rounded-xl overflow-hidden">
          {!activeRole ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Select a role</div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{activeRole.name}</h3>
                  <p className="text-xs text-muted-foreground">{activeRole.description}</p>
                </div>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 80px)' }}>
                {categories.map(cat => {
                  const catPerms = permissions.filter(p => p.category === cat);
                  return (
                    <div key={cat}>
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mb-3 uppercase tracking-wide ${CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-600'}`}>
                        {cat}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {catPerms.map(perm => {
                          const granted = hasPermission(activeRole.id, perm.id);
                          return (
                            <div key={perm.id} className={`flex items-start gap-3 p-3 rounded-xl border ${granted ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${granted ? 'bg-green-500' : 'bg-muted border border-border'}`}>
                                {granted && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${granted ? 'text-green-800' : 'text-muted-foreground'}`}>{perm.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {perm.actions?.map(a => (
                                    <span key={a} className="text-xs bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground">{a}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}