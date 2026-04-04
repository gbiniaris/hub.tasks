import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, ChevronDown, Sun, Moon, Globe, Palette, Check } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme, THEMES } from '../lib/useTheme';
import { base44 } from '../api/base44Client';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'} bg-card border border-border rounded-xl shadow-lg z-50 min-w-48 py-1`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function TopBar({ sidebarWidth }) {
  const { t, lang, changeLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
    base44.entities.Notification.filter({ is_read: false }).then(n => {
      setNotifications(n.slice(0, 10));
      setUnreadCount(n.length);
    }).catch(() => {});
  }, []);

  const markAllRead = async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleLogout = () => base44.auth.logout('/');

  return (
    <header
      className="fixed top-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 gap-3 z-20 transition-all duration-200"
      style={{ left: sidebarWidth }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:bg-background outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Language */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Globe className="w-4 h-4" />
              <span className="uppercase text-xs font-semibold">{lang}</span>
            </button>
          }
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              {l.label}
              {lang === l.code && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </Dropdown>

        {/* Theme */}
        <Dropdown
          trigger={
            <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Palette className="w-4 h-4" />
            </button>
          }
        >
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('theme')}</div>
          {THEMES.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full border ${th.id === 'white' ? 'bg-white border-slate-300' : th.id === 'blue' ? 'bg-blue-500 border-blue-600' : th.id === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-green-500 border-green-600'}`} />
                {t(`theme${th.label}`)}
              </span>
              {theme === th.id && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </Dropdown>

        {/* Notifications */}
        <Dropdown
          trigger={
            <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          }
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold">{t('notifications')}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">{t('markAllRead')}</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('noNotifications')}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3 hover:bg-accent border-b border-border last:border-0 cursor-pointer">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </Dropdown>

        {/* User Menu */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-semibold text-foreground leading-tight">{user?.full_name || 'User'}</span>
                <span className="text-xs text-muted-foreground leading-tight capitalize">{user?.role || ''}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
            </button>
          }
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors">
            <User className="w-4 h-4" /> {t('profile')}
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> {t('logout')}
          </button>
        </Dropdown>
      </div>
    </header>
  );
}