import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getSchedules, saveSchedule, deleteSchedule, calculateNextRun, ScheduledScan } from '@/lib/schedule-utils';
import { Trash2, Plus, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ScheduleSettings() {
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setSchedules(getSchedules());
  }, []);

  const handleAdd = () => {
    const newSchedule: ScheduledScan = {
      id: Date.now().toString(),
      target: '',
      frequency: 'weekly',
      nextRun: calculateNextRun('weekly'),
      enabled: true,
    };
    saveSchedule(newSchedule);
    setSchedules(getSchedules());
  };

  const handleUpdate = (id: string, updates: Partial<ScheduledScan>) => {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
      if (updates.frequency && updates.frequency !== schedule.frequency) {
        updates.nextRun = calculateNextRun(updates.frequency);
      }
      saveSchedule({ ...schedule, ...updates });
      setSchedules(getSchedules());
    }
  };

  const handleDelete = (id: string) => {
    deleteSchedule(id);
    setSchedules(getSchedules());
    toast({ title: 'Schedule deleted' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" /> Automated Scans
        </h3>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed">
          No automated scans configured. Add one to run periodic scans.
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-4 rounded-md border border-border bg-card space-y-3 relative">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Target Domain</label>
                  <Input 
                    value={schedule.target} 
                    onChange={e => handleUpdate(schedule.id, { target: e.target.value })}
                    className="font-mono text-sm h-8"
                    placeholder="example.com"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">{schedule.enabled ? 'Active' : 'Paused'}</span>
                  <Switch 
                    checked={schedule.enabled}
                    onCheckedChange={c => handleUpdate(schedule.id, { enabled: c })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-muted-foreground">Frequency:</label>
                  <Select value={schedule.frequency} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => handleUpdate(schedule.id, { frequency: v })}>
                    <SelectTrigger className="h-7 text-xs border-transparent bg-secondary w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Next run: <span className="text-foreground">{new Date(schedule.nextRun).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
