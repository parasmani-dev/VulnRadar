import { useState, useCallback, useRef } from 'react';
import { Terminal, Crosshair, Zap, Radio, History, ArrowLeftRight, Trash2, Download, FileJson, FileSpreadsheet, FileCode, File, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import TerminalOutput from '@/components/TerminalOutput';
import ScanProgress from '@/components/ScanProgress';
import ScanReport from '@/components/ScanReport';
import ScanSkeleton from '@/components/ScanSkeleton';
import ScanComparison from '@/components/ScanComparison';
import WebhookSettings from '@/components/WebhookSettings';
import { type ScanResult, SCAN_PHASES } from '@/lib/scanner-data';
import { performRealScan } from '@/lib/scanner-api';
import { saveScan, getHistory, clearHistory, type StoredScan } from '@/lib/scan-history';
import { useToast } from '@/hooks/use-toast';
import { exportToCsv, exportToJson, exportToMarkdown, exportToXml, exportToPdf } from '@/lib/export-utils';
import { dispatchWebhooks } from '@/lib/webhook-utils';
import vulnRadarLogo from '@/assets/vulnradar-logo.png';

type ScanState = 'idle' | 'scanning' | 'complete' | 'error';

const Index = () => {
  const [target, setTarget] = useState('');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [history, setHistory] = useState<StoredScan[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareScans, setCompareScans] = useState<[ScanResult | null, ScanResult | null]>([null, null]);
  const { toast } = useToast();
  const logsRef = useRef<string[]>([]);

  const addLog = useCallback((log: string) => {
    logsRef.current = [...logsRef.current, log];
    setLogs([...logsRef.current]);
  }, []);

  const startScan = useCallback(async () => {
    if (!target.trim()) return;

    setScanState('scanning');
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
    logsRef.current = [];
    setLogs([]);
    setResult(null);
    setErrorMsg('');
    setShowHistory(false);
    setShowWebhooks(false);
    setCompareMode(false);

    try {
      const scanResult = await performRealScan(
        target.trim(),
        addLog,
        (phase, progress) => {
          setCurrentPhaseIndex(phase);
          setPhaseProgress(progress);
        }
      );

      setResult(scanResult);
      setScanState('complete');
      saveScan(scanResult);
      dispatchWebhooks(scanResult);
      toast({ title: 'Scan Complete', description: `Found ${scanResult.vulnerabilities.length} findings for ${target}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setErrorMsg(msg);
      setScanState('error');
      toast({ title: 'Scan Failed', description: msg, variant: 'destructive' });
    }
  }, [target, addLog, toast]);

  const openHistory = () => {
    setHistory(getHistory());
    setShowHistory(true);
    setShowWebhooks(false);
    setCompareMode(false);
    setCompareScans([null, null]);
  };

  const openWebhooks = () => {
    setShowWebhooks(true);
    setShowHistory(false);
    setCompareMode(false);
    setCompareScans([null, null]);
  };

  const loadScan = (stored: StoredScan) => {
    setResult(stored.result);
    setTarget(stored.result.target);
    setScanState('complete');
    setShowHistory(false);
    setLogs([]);
  };

  const selectForCompare = (stored: StoredScan) => {
    if (!compareScans[0]) {
      setCompareScans([stored.result, null]);
      toast({ title: 'First scan selected', description: `Select a second scan to compare with ${stored.result.target}` });
    } else if (!compareScans[1]) {
      setCompareScans([compareScans[0], stored.result]);
      setShowHistory(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-full flex items-center justify-between h-16 px-8">
          <div className="flex items-center gap-3">
            <img src={vulnRadarLogo} alt="VulnRadar" className="w-8 h-8" />
            <span className="font-bold text-xl text-foreground tracking-tight">
              VULN<span className="text-primary">RADAR</span>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded ml-1 hidden sm:inline">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={openWebhooks}
              className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-secondary border border-transparent hover:border-border"
            >
              <Settings className="w-4 h-4" />
              <span>Integrations</span>
            </button>
            <button
              onClick={openHistory}
              className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-secondary border border-transparent hover:border-border"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
            <span className="flex items-center gap-2 text-sm font-mono text-muted-foreground pr-2">
              <Radio className="w-4 h-4 text-primary" />
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>LIVE SCAN</span>
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-8 py-8">
        {showWebhooks && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Integrations</h2>
              <Button variant="outline" size="sm" onClick={() => setShowWebhooks(false)}>Close</Button>
            </div>
            <WebhookSettings />
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Scan History
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCompareMode(!compareMode); setCompareScans([null, null]); }}
                  className={`gap-1.5 text-xs ${compareMode ? 'border-primary text-primary' : ''}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Compare
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { clearHistory(); setHistory([]); toast({ title: 'History cleared' }); }}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>

            {compareMode && compareScans[0] && !compareScans[1] && (
              <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
                ✓ First scan selected: <span className="font-mono">{compareScans[0].target}</span> — now select the second scan
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No scans saved yet. Run a scan to see it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map(scan => {
                  const critCount = scan.result.vulnerabilities.filter(v => v.severity === 'critical').length;
                  const totalVulns = scan.result.vulnerabilities.length;
                  return (
                    <div className="group relative">
                      <button
                        onClick={() => compareMode ? selectForCompare(scan) : loadScan(scan)}
                        className="w-full text-left p-4 rounded-md border border-border bg-card hover:border-primary/50 hover:bg-secondary/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-primary truncate mr-8">{scan.result.target}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{new Date(scan.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-foreground">{totalVulns} vulns</span>
                          {critCount > 0 && <span className="text-severity-critical">{critCount} crit</span>}
                          <span className="text-muted-foreground">SSL: {scan.result.sslInfo.grade}</span>
                        </div>
                      </button>
                      
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm border border-border">
                              <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPdf(scan.result, 'scan-report-container')} className="gap-2 cursor-pointer">
                              <FileText className="w-3.5 h-3.5" /> Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToJson(scan.result)} className="gap-2 cursor-pointer">
                              <FileJson className="w-3.5 h-3.5" /> Export JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToCsv(scan.result)} className="gap-2 cursor-pointer">
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToMarkdown(scan.result)} className="gap-2 cursor-pointer">
                              <File className="w-3.5 h-3.5" /> Export Markdown
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToXml(scan.result)} className="gap-2 cursor-pointer">
                              <FileCode className="w-3.5 h-3.5" /> Export XML
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Comparison View */}
        {compareScans[0] && compareScans[1] && !showHistory && (
          <ScanComparison
            scanA={compareScans[0]}
            scanB={compareScans[1]}
            onClose={() => { setCompareScans([null, null]); setCompareMode(false); }}
          />
        )}

        {/* Hero / Input Section */}
        {!showHistory && !compareScans[1] && (scanState === 'idle' || scanState === 'error') && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] sm:min-h-[60vh] text-center space-y-6 sm:space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 text-sm font-mono text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                <Zap className="w-3.5 h-3.5" /> REAL-TIME SECURITY SCANNER
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground tracking-tight">
                Vuln<span className="text-primary">Radar</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Production-grade vulnerability scanner — DNS, HTTP headers, SSL/TLS, subdomain enumeration, sensitive file detection, port probing, SQLi/XSS testing, and Certificate Transparency analysis.
              </p>
            </div>

            {errorMsg && (
              <div className="w-full max-w-lg rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <div className="w-full max-w-2xl space-y-4">
              <div className="relative">
                <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && startScan()}
                  placeholder="Enter target domain (e.g., example.com)"
                  className="pl-10 h-12 bg-secondary border-border font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/30"
                />
              </div>
              <Button
                onClick={startScan}
                disabled={!target.trim()}
                className="w-full h-12 font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Terminal className="w-4 h-4" />
                Initialize Live Scan
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 sm:gap-10 mt-8 sm:mt-10 text-center max-w-3xl w-full">
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">DNS</div>
                <div className="text-sm text-muted-foreground mt-1">Real Records</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">SSL</div>
                <div className="text-sm text-muted-foreground mt-1">Live Analysis</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">FILES</div>
                <div className="text-sm text-muted-foreground mt-1">Exposure Check</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">SUBS</div>
                <div className="text-sm text-muted-foreground mt-1">Enumeration</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">PORTS</div>
                <div className="text-sm text-muted-foreground mt-1">Service Probe</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">SQLi</div>
                <div className="text-sm text-muted-foreground mt-1">XSS Testing</div>
              </div>
            </div>
          </div>
        )}

        {/* Scanning View */}
        {scanState === 'scanning' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Live Scanning</h2>
                <p className="text-sm font-mono text-primary">{target}</p>
              </div>
              <div className="text-xs font-mono text-muted-foreground animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Phase {Math.min(currentPhaseIndex + 1, SCAN_PHASES.length)}/{SCAN_PHASES.length}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TerminalOutput logs={logs} isActive={true} />
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Scan Progress</h3>
                <ScanProgress currentPhaseIndex={currentPhaseIndex} phaseProgress={phaseProgress} />
              </div>
            </div>
          </div>
        )}

        {/* Results View */}
        {scanState === 'complete' && result && !showHistory && !(compareScans[0] && compareScans[1]) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Scan Complete — Real Results</h2>
                <p className="text-sm font-mono text-primary">{result.target}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => { setScanState('idle'); setTarget(''); setLogs([]); }}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border text-foreground hover:bg-secondary"
                >
                  <Crosshair className="w-4 h-4" /> New Scan
                </Button>
              </div>
            </div>

            <ScanReport result={result} />

            <details className="rounded-md border border-border">
              <summary className="px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:bg-secondary/50">
                Raw Scan Output ({logs.length} lines)
              </summary>
              <TerminalOutput logs={logs} isActive={false} />
            </details>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
