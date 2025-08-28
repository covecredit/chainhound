import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import BlockExplorer from "./pages/BlockExplorer";
import CaseManager from "./pages/CaseManager";
import TagManager from "./pages/TagManager";
import SmartContractAuditor from "./pages/SmartContractAuditor";
import BlockWatcher from "./pages/BlockWatcher";
import Settings from "./pages/Settings";
import Footer from "./components/Footer";
import StatusBar from "./components/StatusBar";
import { Web3Provider } from "./contexts/Web3Context";

const App: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("chainhound_dark_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedDarkMode === null || savedDarkMode === "true" || prefersDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (performance.navigation.type === 1) {
      const meta = document.createElement("meta");
      meta.httpEquiv = "Cache-Control";
      meta.content = "no-cache, no-store, must-revalidate";
      document.head.appendChild(meta);

      const pragma = document.createElement("meta");
      pragma.httpEquiv = "Pragma";
      pragma.content = "no-cache";
      document.head.appendChild(pragma);

      const expires = document.createElement("meta");
      expires.httpEquiv = "Expires";
      expires.content = "0";
      document.head.appendChild(expires);
    }

    const savedSidebarState = localStorage.getItem("chainhound_sidebar_collapsed");
    if (savedSidebarState !== null) {
      setSidebarCollapsed(savedSidebarState === "true");
    }
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("chainhound_sidebar_collapsed", String(newState));
  };

  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900">
          <header className="bg-indigo-700 text-white shadow-md dark:bg-indigo-900 w-full">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-full">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="h-8 w-8" />
                  <div className="absolute top-6 left-1 text-[6px] font-mono text-indigo-200">
                    01100001 01100011
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">ChainHound</h1>
                  <p className="text-xs text-indigo-200">
                    hunt for suspicious blockchain activity
                  </p>
                </div>
              </div>
              <button
                className="md:hidden p-2 rounded-md hover:bg-indigo-600 focus:outline-none"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </header>

          <div className="flex flex-1 w-full">
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
                onClick={toggleMobileMenu}
              ></div>
            )}

            <div
              className={`${
                mobileMenuOpen ? "block" : "hidden"
              } md:block fixed md:relative z-30 md:z-0 h-full transition-all duration-300 ease-in-out ${
                sidebarCollapsed ? "w-12" : "w-64"
              }`}
            >
              {sidebarCollapsed ? (
                <div className="w-12 bg-gray-800 text-white h-full dark:bg-gray-900 flex flex-col items-center py-4">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-full hover:bg-gray-700 mb-6"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <Navbar
                    collapsed={true}
                    onNavItemClick={() => setMobileMenuOpen(false)}
                  />
                </div>
              ) : (
                <div className="relative w-64 bg-gray-800 text-white h-full dark:bg-gray-900">
                  {mobileMenuOpen && (
                    <button
                      className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-700 md:hidden"
                      onClick={toggleMobileMenu}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  <Navbar
                    collapsed={false}
                    onNavItemClick={() => setMobileMenuOpen(false)}
                  />
                  <button
                    onClick={toggleSidebar}
                    className="absolute top-4 right-2 p-2 rounded-full hover:bg-gray-700 text-white hidden md:block"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <main className="flex-1 p-4 overflow-auto w-full max-w-full">
              <div className="container mx-auto max-w-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/blocks" element={<BlockExplorer />} />
                  <Route path="/transactions" element={<BlockExplorer />} />
                  <Route path="/cases" element={<CaseManager />} />
                  <Route path="/tags" element={<TagManager />} />
                  <Route path="/smart-contract-auditor" element={<SmartContractAuditor />} />
                  <Route path="/block-watcher" element={<BlockWatcher />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>
          </div>

          <StatusBar />
          <Footer />
        </div>
      </Router>
    </Web3Provider>
  );
};

export default App;