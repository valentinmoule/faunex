import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Activity, Camera, TrendingUp, Clock, UserCheck, Repeat } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type Period = 7 | 30 | 90 | 'custom';

interface AnalyticsData {
  range: { startISO: string; endISO: string; days: number };
  kpis: {
    dau: number; wau: number; mau: number;
    totalUsers: number; totalCaptures: number;
    avgCapturesPerUser: number;
    usersWithCapture: number; usersWithCaptureRate: number;
    loginsInPeriod: number; avgLoginsPerUser: number;
    avgTimeBetweenCapturesHours: number;
  };
  series: {
    newUsersByWeek: { week: string; count: number }[];
    loginsByWeek: { week: string; count: number }[];
    capturesByDay: { date: string; count: number }[];
  };
  topUsers: { user_id: string; name: string; captures: number }[];
  retention: { j1: number; j7: number; j30: number; cohortSizes: { j1: number; j7: number; j30: number } };
  newVsReturning: { new: number; returning: number };
}

const PIE_COLORS = ['hsl(152, 55%, 38%)', 'hsl(40, 80%, 60%)'];

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState<Period>(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const body: any = period === 'custom'
        ? { start: customStart || undefined, end: customEnd || undefined }
        : { days: period };
      const { data: res, error } = await supabase.functions.invoke('admin-analytics', { body });
      if (cancelled) return;
      if (error) {
        setError(error.message || 'Erreur de chargement');
      } else {
        setData(res as AnalyticsData);
      }
      setLoading(false);
    };
    if (period !== 'custom' || (customStart && customEnd)) load();
    return () => { cancelled = true; };
  }, [period, customStart, customEnd]);

  const newVsReturningData = useMemo(() => data ? [
    { name: 'Nouveaux', value: data.newVsReturning.new },
    { name: 'Récurrents', value: data.newVsReturning.returning },
  ] : [], [data]);

  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmtNum = (v: number) => v.toLocaleString('fr-FR');
  const fmtHours = (h: number) => {
    if (!h) return '—';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 24) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} j`;
  };

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {[7, 30, 90].map(d => (
          <Button
            key={d}
            size="sm"
            variant={period === d ? 'default' : 'outline'}
            onClick={() => setPeriod(d as Period)}
            className="rounded-full text-xs"
          >
            {d}j
          </Button>
        ))}
        <Button
          size="sm"
          variant={period === 'custom' ? 'default' : 'outline'}
          onClick={() => setPeriod('custom')}
          className="rounded-full text-xs"
        >
          Perso
        </Button>
        {period === 'custom' && (
          <div className="flex gap-1.5 items-center text-xs">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-2 py-1 rounded-md bg-background border border-border" />
            <span>→</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-2 py-1 rounded-md bg-background border border-border" />
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground font-display text-sm">Chargement…</p>
        </div>
      )}

      {error && (
        <Card className="p-4 text-sm text-destructive">{error}</Card>
      )}

      {data && !loading && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi icon={<Activity className="w-4 h-4" />} label="DAU" value={fmtNum(data.kpis.dau)} hint="actifs 24h" />
            <Kpi icon={<Activity className="w-4 h-4" />} label="WAU" value={fmtNum(data.kpis.wau)} hint="actifs 7j" />
            <Kpi icon={<Activity className="w-4 h-4" />} label="MAU" value={fmtNum(data.kpis.mau)} hint="actifs 30j" />
            <Kpi icon={<Users className="w-4 h-4" />} label="Utilisateurs" value={fmtNum(data.kpis.totalUsers)} hint="total" />
            <Kpi icon={<Camera className="w-4 h-4" />} label="Captures" value={fmtNum(data.kpis.totalCaptures)} hint="total" />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Moy. captures / user" value={data.kpis.avgCapturesPerUser.toFixed(1)} />
            <Kpi icon={<UserCheck className="w-4 h-4" />} label="Avec ≥1 capture" value={fmtNum(data.kpis.usersWithCapture)} hint={fmtPct(data.kpis.usersWithCaptureRate)} />
            <Kpi icon={<Repeat className="w-4 h-4" />} label="Connexions / user" value={data.kpis.avgLoginsPerUser.toFixed(1)} hint={`${fmtNum(data.kpis.loginsInPeriod)} sur période`} />
            <Kpi icon={<Clock className="w-4 h-4" />} label="Temps entre captures" value={fmtHours(data.kpis.avgTimeBetweenCapturesHours)} />
            <Kpi label="Rétention J1" value={fmtPct(data.retention.j1)} hint={`cohorte ${data.retention.cohortSizes.j1}`} />
            <Kpi label="Rétention J7" value={fmtPct(data.retention.j7)} hint={`cohorte ${data.retention.cohortSizes.j7}`} />
            <Kpi label="Rétention J30" value={fmtPct(data.retention.j30)} hint={`cohorte ${data.retention.cohortSizes.j30}`} />
          </div>

          {/* Captures over time */}
          <ChartCard title="Évolution des captures">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.series.capturesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(152, 55%, 38%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Nouveaux utilisateurs / semaine">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.series.newUsersByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(152, 55%, 38%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Connexions / semaine">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.series.loginsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(40, 80%, 55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Nouveaux vs récurrents (période)">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={newVsReturningData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {newVsReturningData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 explorateurs (captures)">
              <div className="space-y-1.5">
                {data.topUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune donnée sur la période.</p>
                )}
                {data.topUsers.map((u, i) => (
                  <div key={u.user_id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 truncate font-display font-semibold text-foreground">{u.name}</span>
                    <span className="text-primary font-bold">{u.captures}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

const Kpi = ({ icon, label, value, hint }: { icon?: React.ReactNode; label: string; value: string; hint?: string }) => (
  <Card className="p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      {icon}
      <span className="text-[10px] uppercase font-display font-semibold tracking-wide">{label}</span>
    </div>
    <div className="text-xl font-display font-bold text-foreground leading-tight">{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
  </Card>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-3">
    <h3 className="text-xs font-display font-bold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
    {children}
  </Card>
);

export default AnalyticsDashboard;
