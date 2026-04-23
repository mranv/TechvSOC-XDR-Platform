import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import ThemeSwitcher from "../components/navigation/ThemeSwitcher";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
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
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to register.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] px-6 py-10 text-[var(--text-primary)] transition-colors duration-500">
      <div className="mx-auto max-w-3xl">
        <motion.form
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-card)] p-8 shadow-glow"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--brand-muted)]">
              TechvSOC XDR Platform
            </p>
            <ThemeSwitcher />
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
            Create your workspace account
          </h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            The first account becomes platform admin. Later self-registration defaults to viewer.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">Full name</span>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--interactive)]"
              />
            </label>

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
                minLength={8}
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
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-6 text-sm text-[var(--text-muted)]">
            Already registered?{" "}
            <Link to="/login" className="text-[var(--interactive)] hover:opacity-80">
              Go to sign in
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}

export default RegisterPage;
