import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function KPICard({ title, value, subtitle, trend, trendLabel, color = 'blue', icon: IconComponent, onClick, drillTo }) {
  const Icon = IconComponent;
  const navigate = useNavigate();

  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',   icon: 'bg-blue-100 text-blue-600' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100',  icon: 'bg-green-100 text-green-600' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100',    icon: 'bg-red-100 text-red-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100',  icon: 'bg-amber-100 text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-600' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-100',  icon: 'bg-slate-100 text-slate-600' },
  };
  const c = colors[color] || colors.blue;
  const clickable = onClick || drillTo;

  const handleClick = () => {
    if (onClick) onClick();
    else if (drillTo) navigate(drillTo);
  };

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      className={`bg-card border ${c.border} rounded-xl p-5 flex flex-col gap-3 transition-all ${clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className={`text-3xl font-bold ${c.text}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {trend > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          ) : trend < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground'}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}