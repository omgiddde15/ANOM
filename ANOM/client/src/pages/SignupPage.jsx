/**
 * src/pages/SignupPage.jsx
 *
 * POST /api/auth/signup
 * On success: stores JWT → redirects to /dashboard
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import { useAuth } from '../context/auth';
import AuthCard from '../components/AuthCard';
import InputField from '../components/InputField';
import Button from '../components/Button';

export default function SignupPage() {
  const navigate  = useNavigate();
  const { authLogin } = useAuth();

  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Field change ────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
    // Clear the field-level error on change
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    if (apiError)   setApiError('');
  }

  // ── Client-side validation ───────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.name.trim())              errs.name     = 'Name is required.';
    else if (form.name.trim().length < 2) errs.name   = 'Name must be at least 2 characters.';

    if (!form.email.trim())             errs.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';

    if (!form.password)                 errs.password = 'Password is required.';
    else if (form.password.length < 8)  errs.password = 'Password must be at least 8 characters.';

    return errs;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const data = await signup(form);
      authLogin(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        'Signup failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Start your ANOM AI journey">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        {/* API-level error banner */}
        {apiError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            {apiError}
          </div>
        )}

        <InputField
          id="name"
          label="Full Name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="Alice"
          autoComplete="name"
          error={errors.name}
        />
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
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          error={errors.password}
        />

        <Button type="submit" loading={loading} className="mt-2 w-full">
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
