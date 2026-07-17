import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Action = 'create' | 'activate' | 'deactivate' | 'unchanged';
interface PreviewRow { name: string; journey: string; action: Action; willBeActive: boolean; }
interface TestResult {
  ok: boolean;
  totalRows: number;
  plan: { create: number; activate: number; deactivate: number; unchanged: number; skipped: number };
  preview: PreviewRow[];
}
interface SyncResult {
  ok: boolean;
  syncedAt: string;
  totalRows: number;
  created: string[];
  updated: string[];
  deactivated: string[];
  reactivated: string[];
}

const ACTION_META: Record<Action, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  create:     { label: 'Novo',       variant: 'default' },
  activate:   { label: 'Reativar',   variant: 'default',   className: 'bg-emerald-500 hover:bg-emerald-500' },
  deactivate: { label: 'Inativar',   variant: 'destructive' },
  unchanged:  { label: 'Sem mudança', variant: 'outline' },
};

export default function SheetsSyncPage() {
  const [url, setUrl] = useState('');
  const [sheetName, setSheetName] = useState('Página1');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Action>('all');
  const [lastSync, setLastSync] = useState<string | null>(
    localStorage.getItem('sheets_last_sync')
  );

  const call = async (mode: 'test' | 'sync') => {
    setError(null);
    if (mode === 'test') { setTesting(true); setTestResult(null); setSyncResult(null); }
    else { setSyncing(true); setSyncResult(null); }
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sync-sheets', {
        body: { url, sheetName, mode },
      });
      if (fnError) {
        const details = (fnError as any).context ? await (fnError as any).context.text() : fnError.message;
        throw new Error(details);
      }
      if (data?.error) throw new Error(data.error);
      if (mode === 'test') {
        setTestResult(data);
        toast.success(`Prévia carregada — ${data.totalRows} linha(s)`);
      } else {
        setSyncResult(data);
        setTestResult(null);
        localStorage.setItem('sheets_last_sync', data.syncedAt);
        setLastSync(data.syncedAt);
        toast.success('Sincronização concluída');
      }
    } catch (err: any) {
      let msg = err.message ?? String(err);
      try { const p = JSON.parse(msg); msg = p.error ?? msg; } catch {}
      setError(msg);
      toast.error(msg);
    } finally {
      setTesting(false); setSyncing(false);
    }
  };

  const filteredPreview = testResult?.preview.filter(r => filter === 'all' || r.action === filter) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          Integração Google Sheets
        </h1>
        <p className="text-muted-foreground mt-1">
          Sincronize colaboradores a partir de uma planilha pública do Google Sheets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>
            Compartilhe a planilha como "Qualquer pessoa com o link — Leitor". Nenhum login Google é necessário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL da planilha</Label>
            <Input
              id="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sheet">Nome da aba</Label>
            <Input
              id="sheet"
              placeholder="Página1"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Colunas obrigatórias: <Badge variant="secondary">Nome do Colaborador</Badge>{' '}
            <Badge variant="secondary">Jornada do colaborador</Badge>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => call('test')} disabled={!url || !sheetName || testing || syncing}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Ver prévia
            </Button>
            <Button
              onClick={() => call('sync')}
              disabled={!url || !sheetName || testing || syncing || !testResult}
              title={!testResult ? 'Gere a prévia antes de sincronizar' : undefined}
            >
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Confirmar e sincronizar
            </Button>
          </div>
          {!testResult && (
            <p className="text-xs text-muted-foreground">
              Gere uma prévia primeiro para revisar os registros antes de sincronizar.
            </p>
          )}
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {new Date(lastSync).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Prévia da sincronização</CardTitle>
                <CardDescription>
                  {testResult.totalRows} linha(s) lidas da planilha. Revise antes de confirmar.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <PlanChip active={filter === 'all'}        onClick={() => setFilter('all')}        label="Todos"       count={testResult.preview.length} />
                <PlanChip active={filter === 'create'}     onClick={() => setFilter('create')}     label="Novos"       count={testResult.plan.create} tone="primary" />
                <PlanChip active={filter === 'activate'}   onClick={() => setFilter('activate')}   label="Reativar"    count={testResult.plan.activate} tone="success" />
                <PlanChip active={filter === 'deactivate'} onClick={() => setFilter('deactivate')} label="Inativar"    count={testResult.plan.deactivate} tone="warning" />
                <PlanChip active={filter === 'unchanged'}  onClick={() => setFilter('unchanged')}  label="Sem mudança" count={testResult.plan.unchanged} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-12">#</th>
                    <th className="text-left p-2">Nome do Colaborador</th>
                    <th className="text-left p-2">Jornada do colaborador</th>
                    <th className="text-left p-2">Ação prevista</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreview.map((r, i) => {
                    const meta = ACTION_META[r.action];
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium">{r.name || <span className="text-muted-foreground italic">(sem nome)</span>}</td>
                        <td className="p-2">
                          <Badge variant={r.willBeActive ? 'default' : 'secondary'}>
                            {r.journey || '—'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPreview.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum registro neste filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
            <div className="flex justify-end pt-4">
              <Button onClick={() => call('sync')} disabled={syncing || testing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmar e sincronizar {testResult.totalRows} registro(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {syncResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Novos SDRs" value={syncResult.created.length} tone="success" items={syncResult.created} />
          <StatCard label="Atualizados" value={syncResult.updated.length} tone="info" items={syncResult.updated} />
          <StatCard label="Inativados" value={syncResult.deactivated.length} tone="warning" items={syncResult.deactivated} />
          <StatCard label="Reativados" value={syncResult.reactivated.length} tone="success" items={syncResult.reactivated} />
        </div>
      )}
    </div>
  );
}

function PlanChip({ label, count, active, onClick, tone }: { label: string; count: number; active: boolean; onClick: () => void; tone?: 'primary' | 'success' | 'warning' }) {
  const toneClass = active
    ? tone === 'success' ? 'bg-emerald-500 text-white border-emerald-500'
    : tone === 'warning' ? 'bg-amber-500 text-white border-amber-500'
    : 'bg-primary text-primary-foreground border-primary'
    : 'bg-background hover:bg-muted';
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition ${toneClass}`}
    >
      {label} <span className="ml-1 opacity-80">{count}</span>
    </button>
  );
}

function StatCard({ label, value, tone, items }: { label: string; value: number; tone: 'success' | 'info' | 'warning'; items: string[] }) {
  const toneClass = {
    success: 'text-emerald-500',
    info: 'text-primary',
    warning: 'text-amber-500',
  }[tone];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-3xl ${toneClass}`}>{value}</CardTitle>
      </CardHeader>
      {items.length > 0 && (
        <CardContent className="text-xs text-muted-foreground max-h-32 overflow-auto">
          {items.map((n) => <div key={n}>• {n}</div>)}
        </CardContent>
      )}
    </Card>
  );
}
