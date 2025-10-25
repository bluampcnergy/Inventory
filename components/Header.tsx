
import React from 'react';
import type { View } from '../App';
import type { User } from '../types';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  username: string;
  userRole: User['role'];
  onLogout: () => void;
}

const NavButton: React.FC<{
  viewName: View;
  currentView: View;
  setView: (view: View) => void;
  children: React.ReactNode;
}> = ({ viewName, currentView, setView, children }) => {
  const isActive = currentView === viewName;
  return (
    <button
      onClick={() => setView(viewName)}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 flex-shrink-0 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700'
      }`}
    >
      {children}
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentView, setView, username, userRole, onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      {/* Tier 1: Title, User Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">Plant Inventory</h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 hidden md:block mr-4">Welcome, {username}</span>
            <button
              onClick={onLogout}
              className="px-3 py-2 text-sm font-medium rounded-md text-red-600 bg-red-100 hover:bg-red-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Tier 2: Navigation */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-4 py-2 overflow-x-auto whitespace-nowrap">
            <NavButton viewName="received" currentView={currentView} setView={setView}>
              Raw Materials
            </NavButton>
            <NavButton viewName="wip" currentView={currentView} setView={setView}>
              Work-in-Progress
            </NavButton>
            <NavButton viewName="finished" currentView={currentView} setView={setView}>
              Finished Goods
            </NavButton>
            <NavButton viewName="summary" currentView={currentView} setView={setView}>
              Summary
            </NavButton>
            <NavButton viewName="log" currentView={currentView} setView={setView}>
              Activity Log
            </NavButton>
            {userRole === 'admin' && (
              <NavButton viewName="users" currentView={currentView} setView={setView}>
                User Management
              </NavButton>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;