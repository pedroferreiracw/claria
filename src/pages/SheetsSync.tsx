import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  ok: boolean;
  totalRows: number;
  preview: { name: string; journey: string }[];
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

export default function SheetsSyncPage() {
  const [url, setUrl] = useState('');
  const [sheetName, setSheetName] = useState('Página1');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(
    localStorage.getItem('sheets_last_sync')
  );

  const call = async (mode: 'test' | 'sync') => {
    setError(null);
    if (mode === 'test') { setTesting(true); setTestResult(null); }
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
        toast.success(`Conexão OK — ${data.totalRows} linhas encontradas`);
      } else {
        setSyncResult(data);
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
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Testar conexão
            </Button>
            <Button onClick={() => call('sync')} disabled={!url || !sheetName || testing || syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
          </div>
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
            <CardTitle>Prévia — {testResult.totalRows} linha(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Nome do Colaborador</th>
                    <th className="text-left p-2">Jornada do colaborador</th>
                  </tr>
                </thead>
                <tbody>
                  {testResult.preview.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2">
                        <Badge variant={r.journey.toLowerCase() === 'ativo' ? 'default' : 'secondary'}>
                          {r.journey || '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
