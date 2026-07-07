/**
 * src/components/profile/ProfileForm.jsx
 *
 * The full edit form — receives initialValues and calls onSave(data).
 * Purely presentational with its own controlled state.
 */

import { useState } from 'react';
import InputField from '../InputField';
import Button from '../Button';
import InterestSelector from './InterestSelector';

const MARITAL_OPTIONS = [
  { value: '',            label: 'Prefer not to say' },
  { value: 'single',      label: 'Single' },
  { value: 'married',     label: 'Married' },
  { value: 'divorced',    label: 'Divorced' },
  { value: 'widowed',     label: 'Widowed' },
];

export default function ProfileForm({ initialValues = {}, onSave, saving = false, apiError = '' }) {
  const [form, setForm] = useState({
    name:          initialValues.name          ?? '',
    email:         initialValues.email         ?? '',
    city:          initialValues.city          ?? '',
    bio:           initialValues.bio           ?? '',
    profession:    initialValues.profession    ?? '',
    maritalStatus: initialValues.maritalStatus ?? '',
    interests:     initialValues.interests     ?? [],
    photoUrl:      initialValues.photoUrl      ?? '',
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function handleChange(e) {
    set(e.target.id, e.target.value);
  }

  function validate() {
    const errs = {};
    if (!form.name.trim())       errs.name  = 'Name is required.';
    if (!form.email.trim())      errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';
    if (form.photoUrl && !/^https?:\/\/.+/.test(form.photoUrl))
      errs.photoUrl = 'Must be a valid URL (http/https).';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
          {apiError}
        </div>
      )}

      {/* Row 1: Name + Email */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <InputField id="name"  label="Full Name"  type="text"  value={form.name}  onChange={handleChange} placeholder="Alice" error={errors.name} />
        <InputField id="email" label="Email"      type="email" value={form.email} onChange={handleChange} placeholder="alice@example.com" error={errors.email} />
      </div>

      {/* Row 2: City + Profession */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <InputField id="city"       label="City"       type="text" value={form.city}       onChange={handleChange} placeholder="e.g. New York"   error={errors.city} />
        <InputField id="profession" label="Profession" type="text" value={form.profession} onChange={handleChange} placeholder="e.g. Engineer"   error={errors.profession} />
      </div>

      {/* Row 3: Marital Status (full width) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>{/* spacer */}</div>

        <div className="flex flex-col gap-1">
          <label htmlFor="maritalStatus" className="text-sm font-medium text-gray-700">
            Marital Status
          </label>
          <select
            id="maritalStatus"
            value={form.maritalStatus}
            onChange={handleChange}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
              outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {MARITAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1">
        <label htmlFor="bio" className="text-sm font-medium text-gray-700">
          Bio <span className="text-gray-400 font-normal">(max 500 chars)</span>
        </label>
        <textarea
          id="bio"
          value={form.bio}
          onChange={handleChange}
          rows={3}
          maxLength={500}
          placeholder="Tell people a little about yourself…"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
            outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
        <p className="text-right text-xs text-gray-400">{form.bio.length}/500</p>
      </div>

      {/* Photo URL */}
      <InputField
        id="photoUrl"
        label="Profile Photo URL"
        type="url"
        value={form.photoUrl}
        onChange={handleChange}
        placeholder="https://example.com/photo.jpg"
        error={errors.photoUrl}
      />

      {/* Interests */}
      <InterestSelector
        selected={form.interests}
        onChange={(next) => set('interests', next)}
      />

      <div className="pt-2">
        <Button type="submit" loading={saving} className="w-full sm:w-auto px-8">
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
