import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { base44 } from '../../api/base44Client';
import { Button } from '../ui/button';

export default function TaskTimer({ task, onUpdate }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds in this session
  const intervalRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const start = () => {
    startRef.current = Date.now() - elapsed * 1000;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    setRunning(true);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const stop = async () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (elapsed === 0) return;
    const hoursAdded = elapsed / 3600;
    const newActual = parseFloat(((task.actual_hours || 0) + hoursAdded).toFixed(2));
    await base44.entities.Task.update(task.id, { actual_hours: newActual });
    setElapsed(0);
    onUpdate?.();
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Time Tracker</h3>
      <div className="flex items-center gap-3">
        <div className={`font-mono text-2xl font-bold tabular-nums ${running ? 'text-primary' : 'text-foreground'}`}>
          {fmt(elapsed)}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {!running ? (
            <Button size="sm" onClick={start} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={pause} className="gap-1.5">
              <Pause className="w-3.5 h-3.5" /> Pause
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={stop} disabled={elapsed === 0} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            <Square className="w-3.5 h-3.5" /> Stop & Save
          </Button>
        </div>
      </div>
      {task.actual_hours > 0 && (
        <p className="text-xs text-muted-foreground mt-2">Total logged: <span className="font-semibold text-foreground">{task.actual_hours}h</span></p>
      )}
    </div>
  );
}