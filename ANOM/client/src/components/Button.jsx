/**
 * src/components/Button.jsx
 * Primary submit button with built-in loading spinner.
 */

export default function Button({ children, loading = false, disabled, className = '', ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 rounded-lg bg-indigo-600
        px-4 py-2 text-sm font-semibold text-white transition
        hover:bg-indigo-700 active:bg-indigo-800
        disabled:cursor-not-allowed disabled:opacity-60
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
        ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  );
}
