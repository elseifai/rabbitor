'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import {
  SUPPORT_QUICK_PROMPTS,
  type ChatMessage,
} from '@/lib/support-chat-engine'
import { getAuthHeader } from '@/lib/session'
import { cn } from '@/lib/utils'

// PLATFORM CORE RESOLUTION — floating Help & Support chat drawer
export function SupportChatDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi! I\'m Rabbit Support. Ask about orders, store hours, or delivery tracking.',
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [open, messages, scrollToBottom])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      ts: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed }),
      })
      const json = await res.json()
      const replyText = json.success
        ? String(json.reply).replace(/\*\*(.*?)\*\*/g, '$1')
        : json.error ?? 'Something went wrong. Please try again.'

      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot', text: replyText, ts: Date.now() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'bot',
          text: 'Network error — check your connection and try again.',
          ts: Date.now(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close support chat"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex h-[min(85vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-orange-100 bg-orange-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Help & Support</p>
              <p className="text-[10px] font-medium text-orange-500">Typically replies instantly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-orange-50 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'border border-orange-100 bg-orange-50/30 text-gray-800',
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                Typing…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-orange-100 px-3 py-2">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {SUPPORT_QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                className="shrink-0 rounded-full border border-orange-100 bg-white px-3 py-1 text-[10px] font-semibold text-orange-600 hover:bg-orange-50"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage(input)
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="min-h-[44px] flex-1 rounded-xl border border-orange-100 px-3 text-sm focus:border-orange-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
