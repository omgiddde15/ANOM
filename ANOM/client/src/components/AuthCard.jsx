/**
 * src/components/AuthCard.jsx
 * Centred card wrapper shared by Login and Signup pages.
 */

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-100">
        {/* Logo / brand */}
        <div className="mb-6 text-center">
          <span className="text-3xl font-bold tracking-tight text-indigo-600">ANOM AI</span>
          {title && (
            <h1 className="mt-2 text-xl font-semibold text-gray-800">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
