export default function ChatInput({ value, onChange, onKeyDown, onSend, disabled, canSend, actions }) {
  return (
    <div className="border-t border-slate-200 bg-[#f0f2f5] p-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message"
          disabled={disabled}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
        />
        {actions}
        <button type="button" onClick={onSend} disabled={!canSend || disabled} className="rounded-full bg-indigo-600 p-3 text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
