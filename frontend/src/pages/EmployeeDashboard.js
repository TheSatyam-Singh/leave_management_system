import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { CalendarIcon, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Send, TrendingUp, FileText } from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("Paid");
  const [editingLeave, setEditingLeave] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [leavesRes, statsRes, heatmapRes] = await Promise.all([
        api.get("/leave/my"),
        api.get("/dashboard/stats"),
        api.get("/dashboard/heatmap"),
      ]);
      setLeaves(leavesRes.data);
      setStats(statsRes.data);
      setHeatmapData(heatmapRes.data);
    } catch (err) {
      toast.error("Failed to load data");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }
    if (startDate < new Date().setHours(0, 0, 0, 0)) {
      toast.error("Leave cannot be applied for past dates");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason,
        leave_type: leaveType
      };

      if (editingLeave) {
        await api.put(`/leave/${editingLeave.id}`, payload);
        toast.success("Leave updated successfully");
      } else {
        const res = await api.post("/leave/apply", payload);
        const analysis = res.data.analysis;
        const leaveData = res.data.leave;
        if (leaveData.status === "approved") {
          toast.success(`Leave auto-approved! Impact: ${analysis.impact_score}`);
        } else if (leaveData.status === "rejected") {
          toast.error(`Leave auto-rejected. Impact: ${analysis.impact_score}`);
        } else {
          toast.info(`Leave pending manager approval. Impact: ${analysis.impact_score}`);
        }
      }
      setDialogOpen(false);
      setEditingLeave(null);
      setStartDate(null);
      setEndDate(null);
      setReason("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit leave");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    setStartDate(new Date(leave.start_date));
    setEndDate(new Date(leave.end_date));
    setReason(leave.reason);
    setDialogOpen(true);
  };

  const handleDelete = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave?")) return;
    try {
      await api.delete(`/leave/${leaveId}`);
      toast.success("Leave cancelled");
      fetchData();
    } catch (err) {
      toast.error("Failed to cancel leave");
    }
  };

  const statusConfig = {
    approved: { icon: CheckCircle2, class: "status-approved", label: "Approved" },
    pending: { icon: Clock, class: "status-pending", label: "Pending" },
    rejected: { icon: XCircle, class: "status-rejected", label: "Rejected" },
  };

  const impactConfig = {
    Low: "impact-low",
    Medium: "impact-medium",
    High: "impact-high",
  };

  const approvedCount = leaves.filter((l) => l.status === "approved").length;
  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const rejectedCount = leaves.filter((l) => l.status === "rejected").length;

  // Build heatmap lookup
  const heatmapLookup = {};
  heatmapData.forEach((d) => { heatmapLookup[d.date] = d; });

  return (
    <div className="min-h-screen bg-background flex" data-testid="employee-dashboard">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="apply-leave-btn" className="bg-[#FF6B00] hover:bg-[#FF8533] text-foreground rounded-sm h-10 px-5 font-medium transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.25)]">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Apply Leave
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground max-w-md" data-testid="leave-apply-dialog">
                <DialogHeader>
                  <DialogTitle className="text-foreground text-lg">
                    {editingLeave ? "Update Leave Request" : "Request Leave"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleApply} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Start Date</label>
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                        <PopoverTrigger asChild>
                          <Button data-testid="start-date-btn" variant="outline" className="w-full justify-start bg-muted border-white/8 text-left h-10 rounded-sm text-foreground hover:bg-white/8">
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {startDate ? format(startDate, "MMM dd") : <span className="text-slate-500">Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-white/10" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setStartOpen(false); }} className="text-foreground" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>End Date</label>
                      <Popover open={endOpen} onOpenChange={setEndOpen}>
                        <PopoverTrigger asChild>
                          <Button data-testid="end-date-btn" variant="outline" className="w-full justify-start bg-muted border-white/8 text-left h-10 rounded-sm text-foreground hover:bg-white/8">
                            <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                            {endDate ? format(endDate, "MMM dd") : <span className="text-slate-500">Pick date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-white/10" align="start">
                          <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setEndOpen(false); }} className="text-foreground" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Reason</label>
                    <Input
                      data-testid="leave-reason-input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Brief description..."
                      className="bg-muted border-white/8 text-foreground placeholder:text-slate-600 h-10 rounded-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Leave Type</label>
                    <div className="flex gap-2">
                      {["Paid", "Unpaid"].map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={leaveType === t ? "default" : "outline"}
                          onClick={() => setLeaveType(t)}
                          className={`flex-1 h-10 rounded-sm ${leaveType === t ? 'bg-[#FF6B00] hover:bg-[#FF8533]' : 'bg-muted border-white/8 hover:bg-white/5'}`}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button data-testid="submit-leave-btn" type="submit" disabled={loading} className="w-full bg-[#FF6B00] hover:bg-[#FF8533] text-foreground h-10 rounded-sm font-medium">
                    <Send className="w-4 h-4 mr-1.5" />
                    {loading ? "Submitting..." : editingLeave ? "Update Request" : "Submit Request"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-muted border border-border mb-6 animate-fade-in-up stagger-1">
          {[
            { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "#10B981" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "#FF6B00" },
            { label: "Rejected", value: rejectedCount, icon: XCircle, color: "#EF4444" },
            { label: "Available Balance", value: stats?.leave_balance ?? 20, icon: Clock, color: "#3B82F6" },
            { label: "Team Availability", value: stats ? `${stats.availability}%` : "—", icon: TrendingUp, color: "#10B981" },
          ].slice(0, 4).map((s) => (
            <div key={s.label} className="bg-card p-5 card-hover" data-testid={`stat-${s.label.toLowerCase().replace(' ', '-')}`}>
              <div className="flex items-center gap-2 mb-3">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-muted border border-border">
          {/* Leave History */}
          <div className="lg:col-span-2 bg-card p-6 animate-fade-in-up stagger-2" data-testid="leave-history">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-medium text-foreground">Leave History</h3>
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {leaves.length} records
              </span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {leaves.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No leave records yet</p>
              ) : (
                leaves.map((leave) => {
                  const sc = statusConfig[leave.status] || statusConfig.pending;
                  return (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 bg-white/[0.02] border border-border rounded-sm card-hover"
                      data-testid={`leave-item-${leave.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">{leave.reason}</p>
                        <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {leave.start_date} → {leave.end_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className={`text-xs font-medium ${impactConfig[leave.impact_score] || ''}`}>
                                {leave.impact_score}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#0A0B0E] border-border text-xs">Impact Score</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Badge className={`${sc.class} text-[10px] px-2 py-0.5 rounded-sm font-mono`} data-testid={`leave-status-${leave.id}`}>
                          {sc.label}
                        </Badge>
                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => handleEdit(leave)}>
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(leave.id)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mini Heatmap */}
          <div className="bg-card p-6 animate-fade-in-up stagger-3" data-testid="mini-heatmap">
            <div className="flex items-center gap-2 mb-5">
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-medium text-foreground">Team Leave Map</h3>
            </div>
            <MiniHeatmap heatmapLookup={heatmapLookup} />
            <div className="flex items-center gap-3 mt-4 justify-center">
              {[
                { label: "None", bg: "bg-muted" },
                { label: "1", bg: "bg-[#10B981]/30" },
                { label: "2", bg: "bg-[#FF6B00]/50" },
                { label: "3+", bg: "bg-[#EF4444]/70" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-[1px] ${l.bg}`} />
                  <span className="text-[10px] text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniHeatmap({ heatmapLookup }) {
  const today = new Date();
  const days = [];
  for (let i = -7; i <= 21; i++) {
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

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-slate-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dateStr = d.toISOString().slice(0, 10);
          const isToday = dateStr === today.toISOString().slice(0, 10);
          const entry = heatmapLookup[dateStr];
          return (
            <TooltipProvider key={dateStr}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded-[2px] heatmap-cell cursor-pointer ${getColor(dateStr)} ${isToday ? 'ring-1 ring-[#FF6B00]/50' : ''}`}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#0A0B0E] border-white/10 text-xs">
                  <p className="font-medium">{dateStr}</p>
                  {entry ? (
                    <>
                      <p className="text-slate-400">{entry.count} on leave</p>
                      {entry.names && entry.names.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{entry.names.join(', ')}</p>
                      )}
                    </>
                  ) : <p className="text-slate-400">No leaves</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
