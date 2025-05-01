import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Home from './components/Home';
import History from './components/History';
import ProposalViewer from './components/ProposalViewer';
import { StandaloneProposalViewer } from './components/StandaloneProposalViewer';
import Login from './components/Login';
import Register from './components/Register';
import { ProposalProvider } from './contexts/ProposalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { testSupabaseConnection } from './lib/supabaseClient';
import { LoadingSpinner } from './components/LoadingSpinner';
import { config } from './config';

function AuthFooter() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      navigate('/login');
    }
  };

  const buttonClasses = "flex items-center px-4 py-2 rounded-md font-medium transition-colors";

  if (loading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-center">
          <LoadingSpinner size="small" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-gray-600">
          {user ? (
            <span>Signed in as: {user.email}</span>
          ) : (
            <span>Not signed in</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => navigate('/register')}
                className={`${buttonClasses} bg-green-600 text-white hover:bg-green-700`}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </button>
              <button
                onClick={handleSignOut}
                className={`${buttonClasses} bg-red-600 text-white hover:bg-red-700`}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className={`${buttonClasses} bg-[#175071] text-white hover:bg-[#134660]`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSharedView = location.pathname.startsWith('/shared/') || (location.pathname.startsWith('/proposal/') && location.search.includes('shared=true'));

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const connected = await testSupabaseConnection();
        if (!connected) {
          console.error('Failed to establish connection to Supabase after multiple attempts');
          // You might want to show a user-friendly error message here
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // You might want to show a user-friendly error message here
      }
    };

    initializeApp();
  }, []);

  // Ensure we're not showing the header on shared proposal views
  const showHeader = !isSharedView;

  return (
    <AuthProvider>
      <ProposalProvider>
        <div className="min-h-screen bg-gray-100 pb-20">
          {showHeader && (
            <header className="bg-white py-4 px-8 shadow-md">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <button 
                  onClick={() => navigate(config.app.routes.home)}
                  className="text-2xl font-semibold text-[#175071] hover:text-[#134660]"
                >
                  {config.app.name}
                </button>
                <div className="space-x-4">
                  <button 
                    onClick={() => navigate(config.app.routes.home)} 
                    className="px-4 py-2 bg-[#FFEB69] text-[#175071] rounded-md font-medium hover:bg-[#FFE54F]"
                  >
                    Home
                  </button>
                  <button 
                    onClick={() => navigate(config.app.routes.history)} 
                    className="px-4 py-2 bg-[#175071] text-white rounded-md font-medium hover:bg-[#134660]"
                  >
                    History
                  </button>
                </div>
              </div>
            </header>
          )}
          <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path={config.app.routes.login} element={<Login />} />
              <Route path={config.app.routes.register} element={<Register />} />
              <Route 
                path={config.app.routes.home}
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                } 
              />
              <Route 
                path={config.app.routes.history}
                element={
                  <PrivateRoute>
                    <History />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/proposal/:id"
                element={
                  location.search.includes('shared=true') ? (
                    <StandaloneProposalViewer />
                  ) : (
                    <PrivateRoute>
                      <ProposalViewer />
                    </PrivateRoute>
                  )
                } 
              />
              <Route 
                path="/shared/:id"
                element={<StandaloneProposalViewer />}
              />
              <Route path="*" element={<Navigate to={config.app.routes.home} replace />} />
            </Routes>
          </main>
          {!isSharedView && <AuthFooter />}
        </div>
      </ProposalProvider>
    </AuthProvider>
  );
}

export default App;