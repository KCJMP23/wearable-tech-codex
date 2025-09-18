'use client';

import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatbotDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! Ask me about wearable tech recommendations or site content.' }
  ]);
  const [input, setInput] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    const question = input;
    setInput('');

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    setMessages((prev) => [...prev, { role: 'assistant', content: data.answer ?? 'Working on it…' }]);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="mb-4 w-80 rounded-3xl border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-3xl bg-neutral-900 px-4 py-3 text-white">
            <span className="text-sm font-semibold">AI Concierge</span>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-neutral-700 p-1">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-2xl px-3 py-2 ${
                  message.role === 'assistant' ? 'bg-neutral-100 text-neutral-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-200 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about devices or posts"
              className="flex-1 rounded-full border border-neutral-200 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-amber-400"
            />
            <button type="submit" className="flex items-center justify-center rounded-full bg-amber-500 p-2 text-neutral-900">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <MessageCircle size={16} />
        Chat with us
      </button>
    </div>
  );
}
