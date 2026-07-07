/**
 * src/pages/LoginPage.jsx
 *
 * POST /api/auth/login
 * On success: stores JWT → redirects to /dashboard
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
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
  );
}
