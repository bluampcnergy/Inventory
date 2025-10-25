
import React, { useState, useEffect } from 'react';

// Define the props interface for the Auth component
interface AuthProps {
  onLogin: (username: string, password: string) => Promise<string | null>;
  onSignUp: (username: string, password: string) => Promise<string | null>;
  isSignUpAllowed: boolean;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onSignUp, isSignUpAllowed }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSignUpAllowed) {
        setIsLoginView(true);
    }
  }, [isSignUpAllowed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (isLoginView) {
      const loginError = await onLogin(username, password);
      if (loginError) {
        setError(loginError);
      }
    } else {
      if (!isSignUpAllowed) {
        setError("Sign-up is disabled.");
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setIsLoading(false);
        return;
      }
      const signUpError = await onSignUp(username, password);
      if (signUpError) {
        setError(signUpError);
      }
    }
    setIsLoading(false);
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Plant Inventory</h1>
        </div>
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isLoginView ? 'Login to your Account' : 'Create Admin Account'}
        </h2>
        
        { !isLoginView && isSignUpAllowed && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-sm text-blue-800">
            Welcome! The first user to register will become the administrator of this system.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">{error}</div>}
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Email Address</label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="email"
                autoComplete="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLoginView ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {!isLoginView && (
            <div>
              <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || (!isLoginView && !isSignUpAllowed)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Sign Up')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
            {isSignUpAllowed ? (
                 <>
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={toggleView} className="font-medium text-blue-600 hover:text-blue-500 ml-1">
                        {isLoginView ? 'Sign up' : 'Login'}
                    </button>
                 </>
            ) : (
                <span>Contact an administrator to get an account.</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default Auth;