import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "../components/navigation/ThemeSwitcher";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] px-6 py-10 text-[var(--text-primary)] transition-colors duration-500">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-[2rem] border border-[var(--brand-border)] bg-[var(--surface-card)] p-10 shadow-glow"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-muted)]">
              TechvSOC XDR Platform
            </p>
            <ThemeSwitcher />
          </div>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-tight text-[var(--text-primary)]">
            Unified security operations for lean teams.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            Correlate logs, monitor hosts, review detections, and run lightweight
            scanning from a single control surface built for modern infrastructure.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "FastAPI backend",
              "React command center",
              "Endpoint telemetry agent",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-4 text-sm text-[var(--text-secondary)]"
              >
                {item}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          <form
            onSubmit={handleSubmit}
            className="w-full rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-card)] p-8 shadow-glow"
          >
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Sign in</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Access the TechvSOC XDR Platform control center.
            </p>

            <div className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--interactive)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">Password</span>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--interactive)]"
                />
              </label>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-2xl bg-[var(--interactive)] px-4 py-3 font-semibold text-[var(--interactive-contrast)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <p className="mt-6 text-sm text-[var(--text-muted)]">
              Need an account?{" "}
              <Link to="/register" className="text-[var(--interactive)] hover:opacity-80">
                Register here
              </Link>
            </p>
          </form>
        </motion.section>
      </div>
    </div>
  );
}

export default LoginPage;
