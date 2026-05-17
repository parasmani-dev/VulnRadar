import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getWebhooks, saveWebhook, deleteWebhook, WebhookConfig } from '@/lib/webhook-utils';
import { Trash2, Plus, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WebhookSettings() {
  const [hooks, setHooks] = useState<WebhookConfig[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setHooks(getWebhooks());
  }, []);

  const handleAdd = () => {
    const newHook: WebhookConfig = {
      id: Date.now().toString(),
      name: 'New Webhook',
      url: '',
      type: 'slack',
      triggerOn: 'all',
      enabled: true,
    };
    saveWebhook(newHook);
    setHooks(getWebhooks());
  };

  const handleUpdate = (id: string, updates: Partial<WebhookConfig>) => {
    const hook = hooks.find(h => h.id === id);
    if (hook) {
      saveWebhook({ ...hook, ...updates });
      setHooks(getWebhooks());
    }
  };

  const handleDelete = (id: string) => {
    deleteWebhook(id);
    setHooks(getWebhooks());
    toast({ title: 'Webhook deleted' });
  };

  const handleTest = async (hook: WebhookConfig) => {
    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          hook.type === 'slack' ? { text: '🧪 Test message from VulnRadar' } :
          hook.type === 'discord' ? { content: '🧪 Test message from VulnRadar' } :
          { event: 'test' }
        ),
        mode: 'no-cors'
      });
      toast({ title: 'Test payload sent' });
    } catch {
      toast({ title: 'Test failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" /> Webhook Integrations
        </h3>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Webhook
        </Button>
      </div>

      {hooks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed">
          No webhooks configured. Add one to get notified when scans complete.
        </div>
      ) : (
        <div className="space-y-4">
          {hooks.map((hook) => (
            <div key={hook.id} className="p-4 rounded-md border border-border bg-card space-y-3 relative">
              <div className="flex items-center justify-between gap-4">
                <Input 
                  value={hook.name} 
                  onChange={e => handleUpdate(hook.id, { name: e.target.value })}
                  className="font-semibold border-none bg-transparent px-0 focus-visible:ring-0 h-7 text-base"
                  placeholder="Webhook Name"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{hook.enabled ? 'Enabled' : 'Disabled'}</span>
                  <Switch 
                    checked={hook.enabled}
                    onCheckedChange={c => handleUpdate(hook.id, { enabled: c })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hook.id)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Webhook URL</label>
                  <Input 
                    value={hook.url}
                    onChange={e => handleUpdate(hook.id, { url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Platform / Type</label>
                  <Select value={hook.type} onValueChange={(v: 'slack' | 'discord' | 'custom') => handleUpdate(hook.id, { type: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="custom">Custom (JSON)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Trigger On:</label>
                  <Select value={hook.triggerOn} onValueChange={(v: 'all' | 'high_critical') => handleUpdate(hook.id, { triggerOn: v })}>
                    <SelectTrigger className="h-7 text-xs border-transparent bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Scans</SelectItem>
                      <SelectItem value="high_critical">High/Critical Findings Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleTest(hook)} className="h-7 text-xs gap-1.5">
                  Send Test
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
