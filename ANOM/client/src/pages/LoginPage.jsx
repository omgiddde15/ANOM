/**
 * src/pages/LoginPage.jsx
 *
 * POST /api/auth/login
 * On success: stores JWT → redirects to /dashboard
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/auth';
import AuthCard from '../components/AuthCard';
import InputField from '../components/InputField';
import Button from '../components/Button';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { authLogin } = useAuth();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Field change ────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    if (apiError)   setApiError('');
  }

  // ── Client-side validation ──────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.email.trim())                    errs.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email   = 'Enter a valid email.';
    if (!form.password)                        errs.password = 'Password is required.';
    return errs;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const data = await login(form);
      authLogin(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Login failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
        {/* Login Card Column */}
        <div className="w-full lg:w-[45%]">
          <AuthCard title="Welcome back" subtitle="Sign in to your ANOM AI account">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {/* API-level error banner */}
              {apiError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
                  {apiError}
                </div>
              )}

              <InputField
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="alice@example.com"
                autoComplete="email"
                error={errors.email}
              />
              <InputField
                id="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                autoComplete="current-password"
                error={errors.password}
              />

              <Button type="submit" loading={loading} className="mt-2 w-full">
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
                Create one
              </Link>
            </p>
          </AuthCard>
        </div>

        {/* Demo Instructions Column */}
        <div className="w-full lg:w-[55%]">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-8 shadow-sm ring-1 ring-indigo-100 h-full">
            <h3 className="text-lg sm:text-xl font-semibold text-indigo-900 mb-4">Demo Instructions</h3>
            <p className="text-sm text-indigo-800 mb-6">
              You can test the complete application using two different accounts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-indigo-900 mb-2">Account A</p>
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium text-gray-900">Email:</span> om@example.com
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Password:</span> demo1234
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-indigo-900 mb-2">Account B</p>
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium text-gray-900">Email:</span> priya@example.com
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Password:</span> demo1234
                </p>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-indigo-900 mb-3">How to test:</h4>
            <ol className="list-decimal list-inside text-sm text-indigo-800 space-y-1.5">
              <li>Login with Account A</li>
              <li>Edit profile</li>
              <li>Send Interest</li>
              <li>Logout</li>
              <li>Login with Account B</li>
              <li>Send Interest back</li>
              <li>Match is created automatically</li>
              <li>Open Matches</li>
              <li>Start AI Conversation</li>
              <li>Schedule Meeting</li>
              <li>Send Messages</li>
              <li>Check Notifications</li>
              <li>Logout</li>
              <li>Login again with Account A</li>
              <li>Verify Messages, Meetings and Notifications</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
