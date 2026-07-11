function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-3 py-2 shadow-sm ${
        mine
          ? 'rounded-2xl rounded-br-sm bg-[#dcf8c6] text-slate-900'
          : 'rounded-2xl rounded-bl-sm bg-white text-slate-900'
      }`}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        <p className={`mt-1 text-right text-[10px] ${mine ? 'text-emerald-700/70' : 'text-slate-400'}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
