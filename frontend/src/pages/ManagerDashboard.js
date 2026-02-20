import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Cell } from "recharts";
import { format, differenceInDays } from "date-fns";
import {
  CheckCircle2, XCircle, Clock, Users, TrendingUp, AlertTriangle,
  Calendar as CalendarIcon, BarChart3, Briefcase, ChevronRight
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [teamStatus, setTeamStatus] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("requests");

  const fetchData = useCallback(async () => {
    try {
      const [leavesRes, statsRes, teamRes, chartRes, heatmapRes, projectsRes] = await Promise.all([
        api.get("/leave/all"),
        api.get("/dashboard/stats"),
        api.get("/dashboard/team-availability"),
        api.get("/dashboard/chart-data"),
        api.get("/dashboard/heatmap"),
        api.get("/projects"),
      ]);
      setLeaves(leavesRes.data);
      setStats(statsRes.data);
      setTeamStatus(teamRes.data);
      setChartData(chartRes.data);
      setHeatmapData(heatmapRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      toast.error("Failed to load data");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (leaveId, action) => {
    try {
      await api.put(`/leave/${action}/${leaveId}`);
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const heatmapLookup = {};
  heatmapData.forEach((d) => { heatmapLookup[d.date] = d; });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-[#0A0B0E] border border-white/10 p-3 rounded-sm shadow-xl text-xs">
        <p className="text-foreground font-medium mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-slate-400">
            <span style={{ color: p.color }}>{p.name}</span>: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex" data-testid="manager-dashboard">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Command Center</h1>
            <p className="text-slate-500 text-sm mt-0.5">{user?.department} Department Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <div className="flex items-center gap-2" data-testid="pending-count-badge">
              <div className="flex items-center gap-2" data-testid="pending-count-badge">
                <div className="h-8 px-3 flex items-center gap-1.5 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span className="text-xs font-medium text-[#FF6B00]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {pendingLeaves.length} pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-muted border border-border mb-6 animate-fade-in-up stagger-1">
          {[
            { label: "Total Team", value: stats?.total_employees || 0, icon: Users, color: "#FFFFFF" },
            { label: "Active Now", value: stats?.active_employees || 0, icon: TrendingUp, color: "#10B981" },
            { label: "On Leave", value: stats?.on_leave_today || 0, icon: CalendarIcon, color: "#FF6B00" },
            { label: "Availability", value: stats ? `${stats.availability}%` : "—", icon: BarChart3, color: "#3B82F6" },
            { label: "Pending", value: stats?.pending_requests || 0, icon: Clock, color: "#FF6B00" },
          ].map((s) => (
            <div key={s.label} className="bg-card p-5 card-hover" data-testid={`mgr-stat-${s.label.toLowerCase().replace(' ', '-')}`}>
              <div className="flex items-center gap-2 mb-3">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in-up stagger-2">
          <TabsList className="bg-muted border border-border rounded-sm h-9 p-0.5" data-testid="manager-tabs">
            <TabsTrigger value="requests" className="rounded-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-foreground text-slate-400 text-xs px-4" data-testid="tab-requests">
              Requests
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-foreground text-slate-400 text-xs px-4" data-testid="tab-analytics">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="rounded-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-foreground text-slate-400 text-xs px-4" data-testid="tab-heatmap">
              Heatmap
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-sm data-[state=active]:bg-[#FF6B00] data-[state=active]:text-foreground text-slate-400 text-xs px-4" data-testid="tab-projects">
              Projects
            </TabsTrigger>
          </TabsList>

          {/* REQUESTS TAB */}
          <TabsContent value="requests" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-muted border border-border">
              {/* Pending Requests */}
              <div className="lg:col-span-2 bg-card p-6" data-testid="pending-requests-panel">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF6B00]" />
                  Pending Approvals
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {pendingLeaves.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-12">All clear - no pending requests</p>
                  ) : (
                    pendingLeaves.map((leave) => (
                      <div key={leave.id} className="p-4 bg-white/[0.02] border border-border rounded-sm card-hover" data-testid={`pending-leave-${leave.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">{leave.user_name}</span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                {leave.department}
                              </span>
                              <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400 font-mono px-1.5 py-0">
                                {leave.leave_type || 'Paid'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{leave.reason}</p>
                            <p className="text-[10px] text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {leave.start_date} → {leave.end_date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`text-xs font-medium ${leave.impact_score === 'High' ? 'text-[#EF4444]' : leave.impact_score === 'Medium' ? 'text-[#FF6B00]' : 'text-[#10B981]'}`}>
                              {leave.impact_score}
                            </span>
                            <Button
                              data-testid={`approve-btn-${leave.id}`}
                              size="sm"
                              onClick={() => handleAction(leave.id, "approve")}
                              className="h-7 px-3 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] rounded-sm text-xs border border-[#10B981]/20"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              data-testid={`reject-btn-${leave.id}`}
                              size="sm"
                              onClick={() => handleAction(leave.id, "reject")}
                              className="h-7 px-3 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] rounded-sm text-xs border border-[#EF4444]/20"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Team Status */}
              <div className="bg-card p-6" data-testid="team-status-panel">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#3B82F6]" />
                  Team Status
                </h3>
                <div className="space-y-2">
                  {teamStatus.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-border rounded-sm" data-testid={`team-member-${member.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${member.on_leave ? 'bg-[#FF6B00]' : 'bg-[#10B981]'}`} />
                        <span className="text-sm text-foreground">{member.name}</span>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider ${member.on_leave ? 'text-[#FF6B00]' : 'text-[#10B981]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {member.on_leave ? "On Leave" : "Active"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-muted border border-border">
              {/* Bar Chart */}
              <div className="bg-card p-6" data-testid="workload-chart">
                <h3 className="text-sm font-medium text-foreground mb-6 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
                  Workload Distribution
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RTooltip content={<CustomTooltip />} />
                      <Bar dataKey="active" name="Active" fill="#10B981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="on_leave" name="On Leave" fill="#FF6B00" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-[1px] bg-[#10B981]" />
                    <span className="text-[10px] text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Active</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-[1px] bg-[#FF6B00]" />
                    <span className="text-[10px] text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>On Leave</span>
                  </div>
                </div>
              </div>

              {/* All Leaves Overview */}
              <div className="bg-card p-6" data-testid="all-leaves-panel">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#FF6B00]" />
                  All Leave Records
                </h3>
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {leaves.slice(0, 15).map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-border rounded-sm" data-testid={`all-leave-${leave.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground font-medium">{leave.user_name}</span>
                          <span className="text-[10px] text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{leave.start_date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-[10px] font-medium ${leave.impact_score === 'High' ? 'text-[#EF4444]' : leave.impact_score === 'Medium' ? 'text-[#FF6B00]' : 'text-[#10B981]'}`}>
                          {leave.impact_score}
                        </span>
                        <Badge className={`status-${leave.status} text-[10px] px-2 py-0.5 rounded-sm font-mono`}>
                          {leave.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* HEATMAP TAB */}
          <TabsContent value="heatmap" className="mt-4">
            <div className="bg-card border border-border p-6" data-testid="full-heatmap">
              <h3 className="text-sm font-medium text-foreground mb-6 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#FF6B00]" />
                Team Leave Distribution Heatmap
              </h3>
              <FullHeatmap heatmapLookup={heatmapLookup} />
              <div className="flex items-center gap-4 mt-6 justify-center">
                {[
                  { label: "No leaves", bg: "bg-muted" },
                  { label: "1 person", bg: "bg-[#10B981]/30" },
                  { label: "2 people", bg: "bg-[#FF6B00]/50" },
                  { label: "3+ people", bg: "bg-[#EF4444]/70" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded-[2px] ${l.bg}`} />
                    <span className="text-xs text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="mt-4">
            <div className="bg-card border border-border p-6" data-testid="projects-panel">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#3B82F6]" />
                Upcoming Deadlines
              </h3>
              <div className="space-y-2">
                {projects.map((proj) => {
                  const daysLeft = differenceInDays(new Date(proj.deadline), new Date());
                  const urgent = daysLeft <= 5;
                  return (
                    <div key={proj.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-border rounded-sm card-hover" data-testid={`project-${proj.id}`}>
                      <div>
                        <p className="text-sm text-foreground font-medium">{proj.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          Deadline: {proj.deadline}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{proj.team_members?.length || 0} members</span>
                        <Badge className={`${urgent ? 'status-rejected' : 'status-approved'} text-[10px] px-2 py-0.5 rounded-sm font-mono`}>
                          {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FullHeatmap({ heatmapLookup }) {
  const today = new Date();
  const days = [];
  for (let i = -14; i <= 45; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }

  const getColor = (dateStr) => {
    const entry = heatmapLookup[dateStr];
    if (!entry || entry.count === 0) return "bg-muted";
    if (entry.count === 1) return "bg-[#10B981]/30";
    if (entry.count === 2) return "bg-[#FF6B00]/50";
    return "bg-[#EF4444]/70";
  };

  const weeks = [];
  let currentWeek = [];
  const firstDayOfWeek = days[0].getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }
  days.forEach((d) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-[500px]">
        <div className="flex flex-col gap-1 mr-1 pt-5">
          {dayLabels.map((d) => (
            <div key={d} className="h-6 flex items-center">
              <span className="text-[9px] text-slate-600 w-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wi === 0 && week[0] === null ? null : (
              <div className="text-center text-[9px] text-slate-600 h-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {week.find(d => d)?.getDate() <= 7 ? format(week.find(d => d) || new Date(), 'MMM') : ''}
              </div>
            )}
            {wi === 0 && !week.find(d => d) ? <div className="h-4" /> : null}
            {week.map((d, di) => {
              if (!d) return <div key={di} className="w-6 h-6" />;
              const dateStr = d.toISOString().slice(0, 10);
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const entry = heatmapLookup[dateStr];
              return (
                <TooltipProvider key={dateStr}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`w-6 h-6 rounded-[2px] heatmap-cell cursor-pointer ${getColor(dateStr)} ${isToday ? 'ring-1 ring-[#FF6B00]' : ''}`} />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0A0B0E] border-white/10 text-xs">
                      <p className="font-medium">{format(d, 'MMM dd, yyyy')}</p>
                      {entry ? (
                        <>
                          <p className="text-slate-400">{entry.count} on leave</p>
                          <p className="text-slate-500 text-[10px]">{entry.names?.join(', ')}</p>
                        </>
                      ) : (
                        <p className="text-slate-400">No leaves</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
