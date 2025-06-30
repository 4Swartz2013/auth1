import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, LogIn, UserPlus, AlertCircle, Database, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useIntegrationStore } from '../store/integrationStore';
import { AuthManager } from '../lib/auth';
import { User as UserType, Workspace } from '../types/auth';
import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';
import InvitedUserDashboard from './InvitedUserDashboard';
import ParagonLayout from './ParagonLayout';
import SupabaseConnectionWizard from './SupabaseConnectionWizard';
import DatabaseSetupWizard from './DatabaseSetupWizard';

const AuthenticationWrapper: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSupabaseWizard, setShowSupabaseWizard] = useState(false);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [databaseSetup, setDatabaseSetup] = useState(false);
  
  const { setCurrentUserId, loadCredentialsFromDatabase } = useIntegrationStore();

  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key || url === 'your_supabase_project_url' || key === 'your_supabase_anon_key') {
      setSupabaseConnected(false);
      setLoading(false);
      return;
    }
    
    setSupabaseConnected(true);
    initializeAuth();
  };

  const initializeAuth = async () => {
    try {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await handleUserSession(session.user);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
          setUserProfile(null);
          setCurrentWorkspace(null);
          setUserWorkspaces([]);
          setCurrentUserId(null);
        }
      });

      setLoading(false);
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }
  };

  const handleUserSession = async (authUser: any) => {
    setUser(authUser);
    setCurrentUserId(authUser.id);

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        
        // Load user workspaces
        const workspaces = await AuthManager.getUserWorkspaces(authUser.id);
        setUserWorkspaces(workspaces);
        
        // Set current workspace
        if (profile.current_workspace_id) {
          const currentWs = workspaces.find(w => w.id === profile.current_workspace_id);
          setCurrentWorkspace(currentWs || workspaces[0] || null);
        } else if (workspaces.length > 0) {
          setCurrentWorkspace(workspaces[0]);
        }

        // Load credentials
        await loadCredentialsFromDatabase();
        setDatabaseSetup(true);
      } else {
        // Profile doesn't exist, might need database setup
        setDatabaseSetup(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setDatabaseSetup(false);
    }
  };

  const handleSupabaseConnection = (url: string, anonKey: string) => {
    setSupabaseConnected(true);
    setShowSupabaseWizard(false);
    alert('Supabase connected! Please update your .env file and restart the development server.');
  };

  const handleDatabaseSetup = () => {
    setDatabaseSetup(true);
    setShowDatabaseSetup(false);
    // Reload user session to get profile
    if (user) {
      handleUserSession(user);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'client' // Default role for new signups
            }
          }
        });
        
        if (error) throw error;
        setError('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    if (user) {
      const success = await AuthManager.switchWorkspace(user.id, workspaceId);
      if (success) {
        const workspace = userWorkspaces.find(w => w.id === workspaceId);
        setCurrentWorkspace(workspace || null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show Supabase connection wizard if not connected
  if (!supabaseConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md text-center"
        >
          <Database className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect to Supabase</h1>
          <p className="text-gray-300 mb-6">
            Connect your Supabase database to store platform credentials securely.
          </p>
          <button
            onClick={() => setShowSupabaseWizard(true)}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Setup Database Connection
          </button>
        </motion.div>

        {showSupabaseWizard && (
          <SupabaseConnectionWizard
            onConnectionComplete={handleSupabaseConnection}
            onClose={() => setShowSupabaseWizard(false)}
          />
        )}
      </div>
    );
  }

  // Show database setup if needed
  if (supabaseConnected && !databaseSetup && user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md text-center"
          >
            <Database className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Database Setup Required</h1>
            <p className="text-gray-300 mb-6">
              We need to create tables in your database to store platform credentials.
            </p>
            <button
              onClick={() => setShowDatabaseSetup(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Database className="w-5 h-5" />
              Setup Database Tables
            </button>
          </motion.div>
        </div>

        {showDatabaseSetup && (
          <DatabaseSetupWizard
            onSetupComplete={handleDatabaseSetup}
            onClose={() => setShowDatabaseSetup(false)}
          />
        )}
      </>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-2">
              Influence Mate
            </h1>
            <p className="text-gray-300">
              {authMode === 'signin' ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {authMode === 'signin' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show appropriate dashboard based on user role and workspace
  if (userProfile?.role === 'admin') {
    return <AdminDashboard currentUser={userProfile} />;
  }

  if (currentWorkspace) {
    if (userProfile?.role === 'invited_user') {
      return <InvitedUserDashboard currentUser={userProfile} workspace={currentWorkspace} />;
    } else {
      return <ClientDashboard currentUser={userProfile!} workspace={currentWorkspace} />;
    }
  }

  // Show Paragon-style layout for all authenticated users
  return (
    <ParagonLayout 
      currentUser={userProfile!}
      onSignOut={handleSignOut}
      workspaces={userWorkspaces}
      currentWorkspace={currentWorkspace}
      onWorkspaceSwitch={handleWorkspaceSwitch}
    />
  );
};

export default AuthenticationWrapper;