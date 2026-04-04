import { useState, useEffect } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useI18n } from '../lib/i18n';
import { useTheme, THEMES } from '../lib/useTheme';
import { Button } from '../components/ui/button';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

export default function Profile() {
  const { t, lang, changeLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [pref, setPref] = useState(null);
  const [form, setForm] = useState({ department: '', job_title: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      setForm({ department: u.department || '', job_title: u.job_title || '', phone: u.phone || '' });
      const prefs = await base44.entities.UserPreference.filter({ user_email: u.email });
      setPref(prefs[0] || null);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    if (user) {
      const prefData = { user_email: user.email, theme, language: lang };
      if (pref) { await base44.entities.UserPreference.update(pref.id, prefData); }
      else { await base44.entities.UserPreference.create(prefData); }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = "w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  if (!user) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('profile')}</h1>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? t('savedSuccessfully') : t('save')}
        </Button>
      </div>

      {/* Avatar + basic info */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
          {user.full_name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{user.full_name}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-1 inline-block">{user.role?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Profile info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">{t('edit')} Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('department')}</label>
            <input className={inputCls} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('jobTitle')}</label>
            <input className={inputCls} value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{t('phone')}</label>
            <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h3 className="font-semibold text-foreground">Preferences</h3>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase">{t('language')}</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => changeLang(l.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${lang === l.code ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase">{t('theme')}</label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(th => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${theme === th.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary'}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border ${th.id === 'white' ? 'bg-white border-slate-300' : th.id === 'blue' ? 'bg-blue-500 border-blue-600' : th.id === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-green-500 border-green-600'}`} />
                {t(`theme${th.label}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}