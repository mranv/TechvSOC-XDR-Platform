import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/navigation/Sidebar";
import Topbar from "../components/navigation/Topbar";
import LiveActivityFeed from "../components/live/LiveActivityFeed";

function AppShell() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="saas-ui min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-500">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-[var(--orb-primary)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-80 w-80 rounded-full bg-[var(--orb-secondary)] blur-3xl" />
      </div>
      <div className="min-h-screen bg-grid-fade bg-[size:44px_44px]">
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onToggleSidebar={() => setSidebarOpen((current) => !current)} />
            <main
              className="flex-1 px-5 py-6 xl:px-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
      <LiveActivityFeed />
    </div>
  );
}

export default AppShell;
