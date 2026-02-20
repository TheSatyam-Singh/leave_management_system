import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Shield, BarChart3, Calendar, Users } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    department: "Engineering",
  });
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Redirect if already logged in
  if (user) {
    navigate(user.role === "manager" ? "/manager" : "/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post("/login", { email: form.email, password: form.password });
        login(res.data.token, res.data.user);
        toast.success("Welcome back!");
        navigate(res.data.user.role === "manager" ? "/manager" : "/dashboard");
      } else {
        const res = await api.post("/register", form);
        login(res.data.token, res.data.user);
        toast.success("Account created!");
        navigate(res.data.user.role === "manager" ? "/manager" : "/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: "Smart Workload Rules", desc: "AI-driven leave approvals" },
    { icon: BarChart3, label: "Real-time Analytics", desc: "Team availability insights" },
    { icon: Calendar, label: "Leave Heatmaps", desc: "Visual distribution view" },
    { icon: Users, label: "Team Management", desc: "Department-wide oversight" },
  ];

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-[#0A0B0E] relative z-10">
        <div className="max-w-[360px] w-full mx-auto">
          {/* Logo */}
          <div className="mb-12 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#FF6B00] rounded-sm flex items-center justify-center">
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>B</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Balance</span>
            </div>
            <p className="text-slate-500 text-xs uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Leave & Workload Intelligence
            </p>
          </div>

          {/* Title */}
          <div className="mb-8 animate-fade-in-up stagger-1">
            <h1 className="text-2xl font-bold text-white mb-1">
              {isLogin ? "Sign in" : "Create account"}
            </h1>
            <p className="text-slate-500 text-sm">
              {isLogin ? "Enter your credentials to continue" : "Set up your workspace account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up stagger-2" data-testid="auth-form">
            {!isLogin && (
              <>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Full Name</label>
                  <Input
                    data-testid="register-name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-[#FF6B00]/50 h-11 rounded-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Role</label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger data-testid="register-role-select" className="bg-white/5 border-white/8 text-white h-11 rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#16181D] border-white/10">
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Department</label>
                    <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                      <SelectTrigger data-testid="register-dept-select" className="bg-white/5 border-white/8 text-white h-11 rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#16181D] border-white/10">
                        {["Engineering", "Marketing", "HR", "Design", "Product"].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Email</label>
              <Input
                data-testid="email-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                className="bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-[#FF6B00]/50 h-11 rounded-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1.5 block" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Password</label>
              <Input
                data-testid="password-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                className="bg-white/5 border-white/8 text-white placeholder:text-slate-600 focus:border-[#FF6B00]/50 h-11 rounded-sm"
                required
              />
            </div>

            <Button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B00] hover:bg-[#FF8533] text-white h-11 rounded-sm font-medium transition-all hover:shadow-[0_0_20px_rgba(255,107,0,0.25)] mt-2"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center animate-fade-in-up stagger-3">
            <button
              data-testid="toggle-auth-mode"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-[#FF6B00] transition-colors"
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-3 bg-white/[0.03] border border-white/5 rounded-sm animate-fade-in-up stagger-4" data-testid="demo-credentials">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Demo Credentials</p>
            <div className="space-y-1 text-xs text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <p>Manager: manager@balance.io / manager123</p>
              <p>Employee: satyam.singh@balance.io / employee123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-[#0F1115] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />
        </div>

        <div className="relative z-10 max-w-lg px-12">
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight animate-fade-in-up">
            Intelligent leave<br />management
          </h2>
          <p className="text-slate-500 text-base mb-12 leading-relaxed animate-fade-in-up stagger-1">
            Automated workload balancing with smart approval rules. Know your team's capacity before making decisions.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div
                key={f.label}
                className={`p-4 bg-[#16181D] border border-white/5 rounded-sm card-hover animate-fade-in-up stagger-${i + 2}`}
              >
                <f.icon className="w-5 h-5 text-[#FF6B00] mb-3" />
                <p className="text-white text-sm font-medium mb-0.5">{f.label}</p>
                <p className="text-slate-500 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
