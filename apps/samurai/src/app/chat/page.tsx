"use client"

import { useAuth } from '@/components/AuthProvider'
import ChatUI from '@/components/chat-ui'

export default function ChatPage() {
  const { user, loading } = useAuth()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  // Redirect or show login if not authenticated
  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-semibold">Authentication Required</h1>
          <p className="text-muted-foreground">
            Please log in to access the AI chat interface.
          </p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-background">
      <ChatUI />
    </div>
  )
}