import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AuthFormProps {
  role: "student" | "admin";
  mode: "login" | "register";
}

const AuthForm = ({ role, mode }: AuthFormProps) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    collegeName: "",
    department: "",
    studentId: "",
    organization: "",
    adminRole: "Admin",
    contactNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "register") {
      if (!form.fullName.trim()) e.fullName = "Name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 6) e.password = "Min 6 characters";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";

      if (role === "student") {
        if (!form.collegeName.trim()) e.collegeName = "Required";
        if (!form.department.trim()) e.department = "Required";
        if (!form.studentId.trim()) e.studentId = "Required";
      } else {
        if (!form.organization.trim()) e.organization = "Required";
        if (!form.department.trim()) e.department = "Required";
        if (!form.contactNumber.trim()) e.contactNumber = "Required";
      }
    } else {
      if (!form.email.trim()) e.email = "Email is required";
      if (!form.password) e.password = "Password is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await login(form.email, form.password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Welcome back!");
          navigate(role === "student" ? "/student/dashboard" : "/admin/dashboard");
        }
      } else {
        const metadata: Record<string, string> = {
          full_name: form.fullName,
          role,
          department: form.department,
        };
        if (role === "student") {
          metadata.college_name = form.collegeName;
          metadata.student_id = form.studentId;
        } else {
          metadata.organization = form.organization;
          metadata.admin_role = form.adminRole;
          metadata.contact_number = form.contactNumber;
        }

        const { error } = await register(form.email, form.password, metadata);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Account created!");
          navigate(role === "student" ? "/student/dashboard" : "/admin/dashboard");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";
  const roleLabel = role === "student" ? "Student" : "Admin";

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg bg-primary-foreground/5 border text-primary-foreground placeholder:text-primary-foreground/30 
    focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200
    ${errors[field] ? "border-destructive/60" : "border-primary-foreground/10"}`;

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/select-role")}
          className="flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground mb-6 
            transition-colors duration-200 text-sm active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to role selection
        </button>

        <div className="glass-card rounded-2xl p-8 opacity-0 animate-fade-in-scale">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl gradient-bg-horizontal flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-primary-foreground text-lg">Veritas AI</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-primary-foreground mt-4 mb-1">
            {isLogin ? `${roleLabel} Login` : `${roleLabel} Registration`}
          </h2>
          <p className="text-primary-foreground/50 text-sm mb-6">
            {isLogin ? "Enter your credentials to continue" : "Create your account to get started"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <Field label="Full Name" error={errors.fullName}>
                <input className={inputClass("fullName")} placeholder="Enter your full name"
                  value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
              </Field>
            )}

            <Field label="Email" error={errors.email}>
              <input className={inputClass("email")} type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => update("email", e.target.value)} />
            </Field>

            <Field label="Password" error={errors.password}>
              <div className="relative">
                <input className={inputClass("password")} type={showPassword ? "text" : "password"}
                  placeholder="••••••••" value={form.password} onChange={(e) => update("password", e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {!isLogin && (
              <>
                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <input className={inputClass("confirmPassword")} type="password" placeholder="••••••••"
                    value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
                </Field>

                {role === "student" ? (
                  <>
                    <Field label="College Name" error={errors.collegeName}>
                      <input className={inputClass("collegeName")} placeholder="Your college"
                        value={form.collegeName} onChange={(e) => update("collegeName", e.target.value)} />
                    </Field>
                    <Field label="Department" error={errors.department}>
                      <input className={inputClass("department")} placeholder="e.g. Computer Science"
                        value={form.department} onChange={(e) => update("department", e.target.value)} />
                    </Field>
                    <Field label="Student ID" error={errors.studentId}>
                      <input className={inputClass("studentId")} placeholder="Your student ID"
                        value={form.studentId} onChange={(e) => update("studentId", e.target.value)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Organization / Institution" error={errors.organization}>
                      <input className={inputClass("organization")} placeholder="Your organization"
                        value={form.organization} onChange={(e) => update("organization", e.target.value)} />
                    </Field>
                    <Field label="Role" error={errors.adminRole}>
                      <select className={inputClass("adminRole")}
                        value={form.adminRole} onChange={(e) => update("adminRole", e.target.value)}>
                        <option value="Admin">Admin</option>
                        <option value="Instructor">Instructor</option>
                        <option value="Exam Controller">Exam Controller</option>
                      </select>
                    </Field>
                    <Field label="Department" error={errors.department}>
                      <input className={inputClass("department")} placeholder="e.g. Engineering"
                        value={form.department} onChange={(e) => update("department", e.target.value)} />
                    </Field>
                    <Field label="Contact Number" error={errors.contactNumber}>
                      <input className={inputClass("contactNumber")} placeholder="+1 234 567 890"
                        value={form.contactNumber} onChange={(e) => update("contactNumber", e.target.value)} />
                    </Field>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg gradient-bg-horizontal text-primary-foreground font-semibold 
                hover:opacity-90 active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-60"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-primary-foreground/50 text-sm mt-5">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              to={isLogin ? `/${role}/register` : `/${role}/login`}
              className="text-primary-foreground/80 hover:text-primary-foreground underline transition-colors"
            >
              {isLogin ? "Register" : "Login"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-primary-foreground/70 text-sm mb-1.5 font-medium">{label}</label>
    {children}
    {error && <p className="text-destructive/80 text-xs mt-1">{error}</p>}
  </div>
);

export default AuthForm;
