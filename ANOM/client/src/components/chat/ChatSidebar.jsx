/** Shared responsive chat-list shell. */
export default function ChatSidebar({ children }) {
  return (
    <aside className="flex flex-col border-r border-slate-100 bg-[#f0f2f5]">
      {children}
    </aside>
  );
}
