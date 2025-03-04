import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Network, Layers, FolderKanban, Settings } from 'lucide-react';

interface NavbarProps {
  onNavItemClick?: () => void;
  collapsed?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onNavItemClick, collapsed = false }) => {
  const handleNavClick = () => {
    if (onNavItemClick) {
      onNavItemClick();
    }
  };
  
  if (collapsed) {
    return (
      <nav className="w-12 bg-gray-800 text-white flex flex-col items-center py-4 dark:bg-gray-900">
        <div className="space-y-6">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center justify-center p-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
            }
            onClick={handleNavClick}
            title="Dashboard"
          >
            <Home className="h-5 w-5" />
          </NavLink>
          
          <NavLink 
            to="/blocks" 
            className={({ isActive }) => 
              `flex items-center justify-center p-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
            }
            onClick={handleNavClick}
            title="Block Explorer"
          >
            <Network className="h-5 w-5" />
          </NavLink>
          
          <NavLink 
            to="/cases" 
            className={({ isActive }) => 
              `flex items-center justify-center p-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
            }
            onClick={handleNavClick}
            title="Case Manager"
          >
            <FolderKanban className="h-5 w-5" />
          </NavLink>
          
          <NavLink 
            to="/settings" 
            className={({ isActive }) => 
              `flex items-center justify-center p-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
            }
            onClick={handleNavClick}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </NavLink>
        </div>
      </nav>
    );
  }
  
  return (
    <nav className="w-64 bg-gray-800 text-white p-4 h-full dark:bg-gray-900">
      <div className="space-y-6">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-gray-400">Main</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
                }
                onClick={handleNavClick}
              >
                <Home className="h-5 w-5 mr-3" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/blocks" 
                className={({ isActive }) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
                }
                onClick={handleNavClick}
              >
                <Network className="h-5 w-5 mr-3" />
                Block Explorer
              </NavLink>
            </li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xs uppercase tracking-wider text-gray-400">Case Management</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <NavLink 
                to="/cases" 
                className={({ isActive }) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
                }
                onClick={handleNavClick}
              >
                <FolderKanban className="h-5 w-5 mr-3" />
                Case Manager
              </NavLink>
            </li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xs uppercase tracking-wider text-gray-400">System</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <NavLink 
                to="/settings" 
                className={({ isActive }) => 
                  `flex items-center px-3 py-2 rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-gray-700'}`
                }
                onClick={handleNavClick}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;