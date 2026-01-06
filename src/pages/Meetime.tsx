import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plug, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMeetime } from "@/hooks/useMeetime";
import { useSDRs } from "@/hooks/useSDRs";
import { MeetimeFilters } from "@/components/meetime/MeetimeFilters";
import { LeadsTable } from "@/components/meetime/LeadsTable";
import { ActivitiesTable } from "@/components/meetime/ActivitiesTable";
import { MeetingsTable } from "@/components/meetime/MeetingsTable";
import { StatsCards } from "@/components/meetime/StatsCards";

export default function MeetimePage() {
  const {
    config,
    leads,
    activities,
    meetings,
    isLoading,
    saveConfig,
    isSaving,
    syncMeetime,
    isSyncing,
  } = useMeetime();

  const { data: sdrs = [] } = useSDRs();

  const [apiToken, setApiToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleSaveConfig = () => {
    if (!apiToken.trim()) return;
    saveConfig({ apiToken });
    setApiToken("");
  };

  const handleSync = () => {
    syncMeetime();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSdrFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          lead.name?.toLowerCase().includes(search) ||
          lead.company?.toLowerCase().includes(search) ||
          lead.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      // SDR filter
      if (sdrFilter !== "all" && lead.sdr_id !== sdrFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchTerm, statusFilter, sdrFilter]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // SDR filter
      if (sdrFilter !== "all" && activity.sdr_id !== sdrFilter) {
        return false;
      }

      // Date filters
      if (startDate && activity.execution_date) {
        const activityDate = new Date(activity.execution_date);
        if (activityDate < startDate) return false;
      }

      if (endDate && activity.execution_date) {
        const activityDate = new Date(activity.execution_date);
        if (activityDate > endDate) return false;
      }

      return true;
    });
  }, [activities, sdrFilter, startDate, endDate]);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      // SDR filter
      if (sdrFilter !== "all" && meeting.sdr_id !== sdrFilter) {
        return false;
      }

      // Date filters
      if (startDate && meeting.scheduled_at) {
        const meetingDate = new Date(meeting.scheduled_at);
        if (meetingDate < startDate) return false;
      }

      if (endDate && meeting.scheduled_at) {
        const meetingDate = new Date(meeting.scheduled_at);
        if (meetingDate > endDate) return false;
      }

      return true;
    });
  }, [meetings, sdrFilter, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalLeads: filteredLeads.length,
      wonLeads: filteredLeads.filter((l) => l.status === "won").length,
      lostLeads: filteredLeads.filter((l) => l.status === "lost").length,
      totalMeetings: filteredMeetings.length,
      noShowCount: filteredMeetings.filter((m) => m.no_show).length,
      totalActivities: filteredActivities.length,
    };
  }, [filteredLeads, filteredMeetings, filteredActivities]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integração Meetime</h1>
          <p className="text-muted-foreground">
            Sincronize dados do seu time de pré-vendas
          </p>
        </div>

        {/* Configuration Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Configuração
                </CardTitle>
                <CardDescription>
                  Conecte sua conta Meetime para sincronizar dados
                </CardDescription>
              </div>
              {config?.is_connected && (
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!config?.is_connected ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiToken">Token da API</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    placeholder="Insira o token de API do Meetime"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtenha em: Dashboard Meetime → Integrações → API
                  </p>
                </div>
                <Button onClick={handleSaveConfig} disabled={isSaving || !apiToken.trim()}>
                  {isSaving ? "Salvando..." : "Conectar"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Última sincronização:{" "}
                    {config.last_sync_at
                      ? format(new Date(config.last_sync_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })
                      : "Nunca"}
                  </span>
                </div>
                <Button onClick={handleSync} disabled={isSyncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {config?.is_connected && (
          <>
            {/* Stats Cards */}
            <StatsCards
              totalLeads={stats.totalLeads}
              wonLeads={stats.wonLeads}
              lostLeads={stats.lostLeads}
              totalMeetings={stats.totalMeetings}
              noShowCount={stats.noShowCount}
              totalActivities={stats.totalActivities}
            />

            {/* Filters */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <MeetimeFilters
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  sdrFilter={sdrFilter}
                  onSdrChange={setSdrFilter}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                  sdrs={sdrs}
                  onClearFilters={clearFilters}
                />
              </CardContent>
            </Card>

            {/* Data Tabs */}
            <Tabs defaultValue="leads" className="space-y-4">
              <TabsList>
                <TabsTrigger value="leads">Leads ({filteredLeads.length})</TabsTrigger>
                <TabsTrigger value="activities">Atividades ({filteredActivities.length})</TabsTrigger>
                <TabsTrigger value="meetings">Agendamentos ({filteredMeetings.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="leads">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <LeadsTable leads={filteredLeads} sdrs={sdrs} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activities">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <ActivitiesTable activities={filteredActivities} sdrs={sdrs} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="meetings">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <MeetingsTable meetings={filteredMeetings} sdrs={sdrs} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!config?.is_connected && (
          <Card className="glass-card">
            <CardContent className="pt-6 text-center py-12">
              <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Conecte sua conta Meetime</h3>
              <p className="text-muted-foreground">
                Insira o token da API para começar a sincronizar dados do seu time de pré-vendas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
