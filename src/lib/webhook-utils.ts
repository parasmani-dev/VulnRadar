import { ScanResult } from './scanner-data';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  type: 'slack' | 'discord' | 'custom';
  triggerOn: 'all' | 'high_critical';
  enabled: boolean;
}

export function getWebhooks(): WebhookConfig[] {
  try {
    const data = localStorage.getItem('vulnradar_webhooks');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWebhook(config: WebhookConfig) {
  const hooks = getWebhooks();
  const existing = hooks.findIndex(h => h.id === config.id);
  if (existing >= 0) hooks[existing] = config;
  else hooks.push(config);
  localStorage.setItem('vulnradar_webhooks', JSON.stringify(hooks));
}

export function deleteWebhook(id: string) {
  const hooks = getWebhooks().filter(h => h.id !== id);
  localStorage.setItem('vulnradar_webhooks', JSON.stringify(hooks));
}

export async function dispatchWebhooks(result: ScanResult) {
  const hooks = getWebhooks().filter(h => h.enabled);
  if (hooks.length === 0) return;

  const critCount = result.vulnerabilities.filter(v => v.severity === 'critical').length;
  const highCount = result.vulnerabilities.filter(v => v.severity === 'high').length;
  const hasHighOrCrit = critCount > 0 || highCount > 0;

  for (const hook of hooks) {
    if (hook.triggerOn === 'high_critical' && !hasHighOrCrit) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any = {};
    
    if (hook.type === 'slack') {
      payload = {
        text: `🚨 *VulnRadar Scan Complete: ${result.target}*\nCritical: ${critCount} | High: ${highCount} | SSL: ${result.sslInfo.grade}\nFound ${result.vulnerabilities.length} total vulnerabilities.`
      };
    } else if (hook.type === 'discord') {
      payload = {
        content: `🚨 **VulnRadar Scan Complete: ${result.target}**\nCritical: ${critCount} | High: ${highCount} | SSL: ${result.sslInfo.grade}\nFound ${result.vulnerabilities.length} total vulnerabilities.`
      };
    } else {
      payload = {
        event: 'scan_complete',
        target: result.target,
        critical: critCount,
        high: highCount,
        total: result.vulnerabilities.length,
        sslGrade: result.sslInfo.grade,
      };
    }

    try {
      await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // often needed for blind webhook dispatching to avoid CORS errors in browser
      });
    } catch (err) {
      console.error(`Failed to dispatch webhook to ${hook.url}`, err);
    }
  }
}
