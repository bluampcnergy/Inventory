
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ReceivedGoods from './components/ReceivedGoods';
import WorkInProgress from './components/WorkInProgress';
import FinishedGoods from './components/FinishedGoods';
import Summary from './components/Reports';
import Auth from './components/Auth';
import ViewLog from './components/ViewLog';
import UserManagement from './components/UserManagement';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { ReceivedGood, Recipe, WIPItem, FinishedGood, RepairItem, User, LogEntry } from './types';
import { DUMMY_RECEIVED_GOODS, DUMMY_RECIPES, DUMMY_WIP_ITEMS, DUMMY_FINISHED_GOODS } from './dummyData';

export type View = 'received' | 'wip' | 'finished' | 'summary' | 'log' | 'users';

const App: React.FC = () => {
  const [view, setView] = useState<View>('received');
  
  // Auth state
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);

  // App data state
  const [receivedGoods, setReceivedGoods] = useLocalStorage<ReceivedGood[]>('receivedGoods', DUMMY_RECEIVED_GOODS);
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', DUMMY_RECIPES);
  const [wipItems, setWipItems] = useLocalStorage<WIPItem[]>('wipItems', DUMMY_WIP_ITEMS);
  const [finishedGoods, setFinishedGoods] = useLocalStorage<FinishedGood[]>('finishedGoods', DUMMY_FINISHED_GOODS);
  const [repairItems, setRepairItems] = useLocalStorage<RepairItem[]>('repairItems', []);
  const [logs, setLogs] = useLocalStorage<LogEntry[]>('logs', []);

  const addLogEntry = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      username: currentUser.username,
      action,
      details,
    };
    setLogs(prev => [newLog, ...prev]);
  }, [setLogs, currentUser]);

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    const user = users.find(u => u.username === username);
    if (user && user.password === password) {
      setCurrentUser(user);
      addLogEntry('User Logged In', `User '${username}' logged in.`);
      return null;
    }
    return 'Invalid username or password.';
  };

  const handleSignUp = async (username: string, password: string): Promise<string | null> => {
    if (users.length > 0) {
      return 'Sign-up is disabled. Please contact an administrator to create an account.';
    }
    const userExists = users.some(u => u.username === username);
    if (userExists) {
      return 'A user with this email already exists.';
    }
    const newUser: User = { 
      username, 
      password,
      role: 'admin',
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    addLogEntry('Admin Registered', `New admin user '${username}' created.`);
    return null;
  };

  const handleLogout = () => {
    if(currentUser) {
      addLogEntry('User Logged Out', `User '${currentUser.username}' logged out.`);
    }
    setCurrentUser(null);
  };
  
  const handleAddUser = (username: string, password: string): string | null => {
    if (currentUser?.role !== 'admin') {
        return 'Permission denied.';
    }
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        return 'A user with this email already exists.';
    }
    const newUser: User = { username, password, role: 'user' };
    setUsers([...users, newUser]);
    addLogEntry('User Created', `Admin '${currentUser.username}' created new user '${username}'.`);
    return null;
  };

  const handleDeleteUser = (usernameToDelete: string): string | null => {
    if (currentUser?.role !== 'admin') {
        return 'Permission denied.';
    }
    if (usernameToDelete === currentUser.username) {
        return "You cannot delete your own account.";
    }
    setUsers(users.filter(user => user.username !== usernameToDelete));
    addLogEntry('User Deleted', `Admin '${currentUser.username}' deleted user '${usernameToDelete}'.`);
    return null;
  }


  const renderView = useCallback(() => {
    switch (view) {
      case 'received':
        return <ReceivedGoods receivedGoods={receivedGoods} setReceivedGoods={setReceivedGoods} addLogEntry={addLogEntry} />;
      case 'wip':
        return <WorkInProgress
          wipItems={wipItems}
          setWipItems={setWipItems}
          receivedGoods={receivedGoods}
          setReceivedGoods={setReceivedGoods}
          recipes={recipes}
          setRecipes={setRecipes}
          setFinishedGoods={setFinishedGoods}
          repairItems={repairItems}
          setRepairItems={setRepairItems}
          finishedGoods={finishedGoods}
          addLogEntry={addLogEntry}
        />;
      case 'finished':
        return <FinishedGoods 
          finishedGoods={finishedGoods} 
          setFinishedGoods={setFinishedGoods}
          recipes={recipes} 
          receivedGoods={receivedGoods} 
          setRepairItems={setRepairItems}
          addLogEntry={addLogEntry}
        />;
      case 'summary':
        return <Summary receivedGoods={receivedGoods} finishedGoods={finishedGoods} recipes={recipes} wipItems={wipItems} logs={logs} />;
      case 'log':
        return <ViewLog logs={logs} />;
      case 'users':
        return currentUser && currentUser.role === 'admin' ? (
          <UserManagement 
            users={users} 
            onAddUser={handleAddUser} 
            onDeleteUser={handleDeleteUser} 
            currentUser={currentUser} 
          />
        ) : <div className="text-center p-8 text-red-600 font-semibold">Access Denied</div>;
      default:
        return <ReceivedGoods receivedGoods={receivedGoods} setReceivedGoods={setReceivedGoods} addLogEntry={addLogEntry} />;
    }
  }, [view, receivedGoods, recipes, wipItems, finishedGoods, repairItems, logs, users, currentUser, addLogEntry, setReceivedGoods, setWipItems, setFinishedGoods, setRepairItems, setRecipes]);

  // If no user is logged in, show the Auth screen.
  if (!currentUser) {
    return <Auth onLogin={handleLogin} onSignUp={handleSignUp} isSignUpAllowed={users.length === 0} />;
  }

  // Otherwise, show the main application.
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header 
        currentView={view} 
        setView={setView} 
        username={currentUser.username} 
        userRole={currentUser.role}
        onLogout={handleLogout} 
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
    </div>
  );
};

export default App;