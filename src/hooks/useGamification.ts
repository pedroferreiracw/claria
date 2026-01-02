import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge, SDRBadge, SDRStreak, MonthlyScore } from '@/types/goals';
import { toast } from 'sonner';

// Badges
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('points', { ascending: false });

      if (error) throw error;
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        criteria: row.criteria,
        points: row.points,
        createdAt: new Date(row.created_at),
      })) as Badge[];
    },
  });
}

export function useSDRBadges(sdrId?: string) {
  return useQuery({
    queryKey: ['sdr-badges', sdrId],
    queryFn: async () => {
      let query = supabase
        .from('sdr_badges')
        .select(`
          *,
          badges (*)
        `)
        .order('earned_at', { ascending: false });

      if (sdrId) {
        query = query.eq('sdr_id', sdrId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((row: any) => ({
        id: row.id,
        sdrId: row.sdr_id,
        badgeId: row.badge_id,
        earnedAt: new Date(row.earned_at),
        badge: row.badges as Badge,
      })) as SDRBadge[];
    },
  });
}

export function useAwardBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sdrId, badgeId }: { sdrId: string; badgeId: string }) => {
      const { data, error } = await supabase
        .from('sdr_badges')
        .insert({
          sdr_id: sdrId,
          badge_id: badgeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-badges'] });
      toast.success('Badge conquistado! 🎉');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        // Duplicate - badge already earned
        return;
      }
      console.error('Error awarding badge:', error);
    },
  });
}

// Streaks
export function useSDRStreaks() {
  return useQuery({
    queryKey: ['sdr-streaks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_streaks')
        .select('*')
        .order('current_streak', { ascending: false });

      if (error) throw error;
      
      return data.map((row: any) => ({
        id: row.id,
        sdrId: row.sdr_id,
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastActivityDate: row.last_activity_date ? new Date(row.last_activity_date) : undefined,
        streakType: row.streak_type,
        updatedAt: new Date(row.updated_at),
      })) as SDRStreak[];
    },
  });
}

export function useUpdateStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sdrId: string) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current streak
      const { data: existing } = await supabase
        .from('sdr_streaks')
        .select('*')
        .eq('sdr_id', sdrId)
        .single();

      if (existing) {
        const lastActivity = existing.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = existing.current_streak;
        if (lastActivity === yesterdayStr) {
          newStreak += 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        }

        const { error } = await supabase
          .from('sdr_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, existing.longest_streak),
            last_activity_date: today,
          })
          .eq('sdr_id', sdrId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sdr_streaks')
          .insert({
            sdr_id: sdrId,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: today,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-streaks'] });
    },
  });
}

// Monthly Scores
export function useMonthlyScores(month?: number, year?: number) {
  return useQuery({
    queryKey: ['monthly-scores', month, year],
    queryFn: async () => {
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      const { data, error } = await supabase
        .from('monthly_scores')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .order('rank_position', { ascending: true });

      if (error) throw error;
      
      return data.map((row: any) => ({
        id: row.id,
        sdrId: row.sdr_id,
        month: row.month,
        year: row.year,
        totalPoints: row.total_points,
        evaluationsCount: row.evaluations_count,
        averageScore: row.average_score,
        conversionRate: row.conversion_rate,
        rankPosition: row.rank_position,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      })) as MonthlyScore[];
    },
  });
}

export function useUpdateMonthlyScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sdrId, 
      totalPoints, 
      evaluationsCount, 
      averageScore, 
      conversionRate 
    }: { 
      sdrId: string; 
      totalPoints: number; 
      evaluationsCount: number; 
      averageScore: number; 
      conversionRate: number;
    }) => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const { data: existing } = await supabase
        .from('monthly_scores')
        .select('*')
        .eq('sdr_id', sdrId)
        .eq('month', month)
        .eq('year', year)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('monthly_scores')
          .update({
            total_points: totalPoints,
            evaluations_count: evaluationsCount,
            average_score: averageScore,
            conversion_rate: conversionRate,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('monthly_scores')
          .insert({
            sdr_id: sdrId,
            month,
            year,
            total_points: totalPoints,
            evaluations_count: evaluationsCount,
            average_score: averageScore,
            conversion_rate: conversionRate,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-scores'] });
    },
  });
}
