import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel-900 px-6">
      <div className="rounded-[2rem] border border-white/10 bg-panel-800/80 p-10 text-center shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-200/70">
          TechvSOC XDR Platform
        </p>
        <h1 className="mt-4 text-5xl font-semibold text-white">404</h1>
        <p className="mt-3 text-slate-400">
          The route you requested is not available in this workspace.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
