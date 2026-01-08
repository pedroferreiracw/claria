import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarCheck, CalendarX, TrendingUp, Activity, Trophy } from "lucide-react";

interface StatsCardsProps {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalMeetings: number;
  noShowCount: number;
  totalActivities: number;
  // New props for deal feedbacks
  qualifiedCount: number;
  unqualifiedCount: number;
  noContactCount: number;
}

export function StatsCards({
  totalLeads,
  wonLeads,
  lostLeads,
  totalMeetings,
  noShowCount,
  totalActivities,
  qualifiedCount,
  unqualifiedCount,
  noContactCount,
}: StatsCardsProps) {
  // LTR = Lead to Revenue (won leads / total leads)
  const ltrRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";
  
  // No-show rate based on deal feedbacks (NO_CONTACT)
  const totalDealFeedbacks = qualifiedCount + unqualifiedCount + noContactCount;
  const noShowRate = totalDealFeedbacks > 0 
    ? ((noContactCount / totalDealFeedbacks) * 100).toFixed(1) 
    : "0";

  // Oportunidades = QUALIFIED deal feedbacks
  const opportunities = qualifiedCount;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Leads
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLeads}</div>
          <p className="text-xs text-muted-foreground">
            {wonLeads} ganhos · {lostLeads} perdidos
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            LTR (Lead to Revenue)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{ltrRate}%</div>
          <p className="text-xs text-muted-foreground">Taxa de conversão</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Oportunidades
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{opportunities}</div>
          <p className="text-xs text-muted-foreground">
            Reuniões qualificadas
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            No-show
          </CardTitle>
          <CalendarX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{noContactCount}</div>
          <p className="text-xs text-muted-foreground">Taxa: {noShowRate}%</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Atividades
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActivities}</div>
          <p className="text-xs text-muted-foreground">Total realizadas</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leads Ganhos
          </CardTitle>
          <Users className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{wonLeads}</div>
          <p className="text-xs text-muted-foreground">Convertidos com sucesso</p>
        </CardContent>
      </Card>
    </div>
  );
}
