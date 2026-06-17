'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
      } else {
        login(data.token, data.user);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated or loading the auth status, show a premium loading skeleton spinner
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sf-bg-light dark:bg-sf-bg-dark">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-apple-blue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark animate-pulse">
            Redirecting to workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-[#f5f5f7] via-[#e8e8ed] to-[#d2d2d7] dark:from-[#000000] dark:via-[#0c0c0e] dark:to-[#1c1c1e] overflow-hidden p-6 animate-mesh-slow">
      {/* Decorative blur orbs for depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-apple-blue/10 dark:bg-apple-blue/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10 space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center space-y-3">
          {/* Logo element */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-apple-blue to-purple-600 shadow-[0_0_20px_rgba(0,113,227,0.3)] mb-2 relative group overflow-hidden">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sf-text-light via-apple-blue to-purple-600 dark:from-white dark:via-apple-blue dark:to-purple-400 bg-clip-text text-transparent">
            ISOCODELABS
          </h2>
          <p className="text-sm font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
            Sign in to access your operations dashboard
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-border/80 dark:border-border/30 shadow-apple-xl bg-white/60 dark:bg-sf-bg-elevatedDark/40 backdrop-blur-xl rounded-apple-lg overflow-hidden">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-apple-red/10 border border-apple-red/20 text-apple-red text-xs font-semibold rounded-apple"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="founder@isocodelabs.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full py-3 mt-6 text-sm font-semibold tracking-wide shadow-md" loading={loading}>
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
