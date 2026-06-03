import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      setError('Invalid email or password');
    }

    setIsLoading(false);
  };

  return (
    <div
      className="flex items-center justify-center min-h-[100dvh]"
      style={{ backgroundColor: '#0B0D12' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] }}
        className="w-full max-w-[380px] mx-4"
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-center mb-8">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: '48px', height: '48px', backgroundColor: '#6366F1' }}
          >
            <Package size={24} style={{ color: '#0B0D12' }} />
          </div>
        </div>

        <h1
          className="text-center font-bold text-2xl mb-2"
          style={{ color: '#E8EAF0', letterSpacing: '-0.02em' }}
        >
          ResellTrack
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#5C6078' }}>
          Sign in to your account
        </p>

        {/* Form Card */}
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: '#11131A', borderColor: '#1E2130' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA3' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-10 rounded-lg border text-base md:text-sm outline-none px-3 transition-all duration-150"
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: '#1E2130',
                  color: '#E8EAF0',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366F1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#1E2130';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B8FA3' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-10 rounded-lg border text-base md:text-sm outline-none px-3 transition-all duration-150"
                style={{
                  backgroundColor: '#0D0F14',
                  borderColor: '#1E2130',
                  color: '#E8EAF0',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366F1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#1E2130';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: '#FB7185' }}
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: '#6366F1',
                color: '#0B0D12',
                opacity: isLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#818CF8';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6366F1';
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs mt-6" style={{ color: '#5C6078' }}>
          Accounts are managed by the administrator.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
