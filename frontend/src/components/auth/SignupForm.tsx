'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signup as apiSignup } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function SignupForm() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiSignup(email, password);
      auth.login(response);
      router.push('/notes');
    } catch (err: unknown) {
      let msg = '';
      if (err && typeof err === 'object' && !Array.isArray(err)) {
        msg = Object.values(err as Record<string, unknown>)
          .flat()
          .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
          .join(' ');
      } else if (typeof err === 'string') {
        msg = err;
      }
      setError(msg || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-5">
          <Image src="/sleeping-cat.png" alt="Sleeping cat mascot" width={200} height={150} />
        </div>

        <h1
          className="text-3xl font-bold text-center mb-8"
          style={{ fontFamily: 'Georgia, serif', color: '#7A5530' }}
        >
          Yay, New Friend!
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/50 text-[#5C4033] placeholder-[#B8997A]"
            style={{ borderColor: '#C9A87C', backgroundColor: 'transparent' }}
            placeholder="Email address"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-11 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/50 text-[#5C4033] placeholder-[#B8997A]"
              style={{ borderColor: '#C9A87C', backgroundColor: 'transparent' }}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#A07850' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full font-medium transition-opacity disabled:opacity-60"
              style={{
                border: '1.5px solid #A07850',
                backgroundColor: 'transparent',
                color: '#6B4E30',
              }}
            >
              {isSubmitting ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <p className="text-center mt-5 text-sm" style={{ color: '#A07850' }}>
          <Link href="/auth/login" style={{ color: '#A07850' }}>
            We&apos;re already friends!
          </Link>
        </p>
      </div>
    </div>
  );
}
