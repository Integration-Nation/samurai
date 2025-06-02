"use client"

import { useState, useEffect } from "react"
import { useChat, type UseChatOptions } from "@ai-sdk/react"

import { cn } from "@/lib/utils"
import { Chat } from "@/components/ui/chat"
import { Message } from "@/components/ui/chat-message"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react"

type ChatUIProps = {
  initialMessages?: UseChatOptions["initialMessages"]
}

type Conversation = {
  id: string
  title?: string
  createdAt: string
}

type ApiMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

// Custom hook for authenticated requests using cookies
const useAuthenticatedFetch = () => {
  const getAuthHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    
    return headers
  }

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    })
  }

  return { authenticatedFetch, getAuthHeaders }
}

export default function ChatUI(props: ChatUIProps) {
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)

  const { authenticatedFetch, getAuthHeaders } = useAuthenticatedFetch()

  const {
    messages,
    input,
    handleInputChange,
    append,
    stop,
    setInput,
    setMessages,
  } = useChat({
    ...props,
    // Remove the api prop to prevent useChat from making its own requests
  })

  // Load conversations on component mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessagesForConversation(currentConversationId)
    } else {
      setMessages([])
    }
  }, [currentConversationId, setMessages])

  const loadConversations = async () => {
    try {
      const response = await authenticatedFetch("http://localhost:3000/api/rag/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      } else if (response.status === 401) {
        console.error("Authentication failed")
        // Handle authentication error (redirect to login, show error, etc.)
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    }
  }

  const loadMessagesForConversation = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(
        `http://localhost:3000/api/rag/messages?conversationId=${conversationId}`
      )
      if (response.ok) {
        const apiMessages: ApiMessage[] = await response.json()
        const convertedMessages = apiMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content
        }))
        setMessages(convertedMessages)
      } else if (response.status === 401) {
        console.error("Authentication failed")
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const createNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    setInput("")
  }

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await authenticatedFetch(
        `http://localhost:3000/api/rag/conversations/${conversationId}`,
        { method: 'DELETE' }
      )
      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        if (currentConversationId === conversationId) {
          createNewConversation()
        }
      } else if (response.status === 401) {
        console.error("Authentication failed")
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const convertedMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content || "",
  }))

  const handleSubmit = async (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => {
    event?.preventDefault?.()

    if (!input.trim() || isStreaming) return

    const userMessage = {
      role: "user" as const,
      content: input.trim(),
      id: Date.now().toString(),
    }

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage])
    const currentInput = input.trim()
    setInput("")
    setIsStreaming(true)

    try {
      const headers = getAuthHeaders()
      headers['Accept'] = 'text/event-stream'

      const response = await fetch("http://localhost:3000/api/rag/stream", {
        method: "POST",
        headers,
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: currentConversationId,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed")
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No reader available")

      // Create initial assistant message
      const assistantMessageId = (Date.now() + 1).toString()
      const initialAssistantMessage = {
        id: assistantMessageId,
        role: "assistant" as const,
        content: "",
      }

      setMessages(prev => [...prev, initialAssistantMessage])

      let accumulated = ""
      let newConversationId = currentConversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") break

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.content) {
                accumulated += parsed.content

                setMessages((prev) => {
                  return prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulated }
                      : msg
                  )
                })
              }

              // Handle conversation ID from response
              if (parsed.conversationId && !currentConversationId) {
                newConversationId = parsed.conversationId
                setCurrentConversationId(parsed.conversationId)
                loadConversations() // Refresh conversations list
              }

              // Handle completion
              if (parsed.done) {
                break
              }
            } catch (err) {
              console.error("Error parsing JSON:", err)
            }
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err)
      let errorMessage = "Der opstod en fejl under streaming."
      
      if (err instanceof Error && err.message === "Authentication failed") {
        errorMessage = "Authentication failed. Please log in again."
        // Handle authentication error (redirect to login, etc.)
      }
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMessage,
        id: (Date.now() + 2).toString(),
      }])
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex w-full bg-background p-4 gap-4" style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}>
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col border border-border rounded-lg bg-muted/10 transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
        sidebarOpen ? "w-80" : "w-0"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/50 shrink-0">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Conversations
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* New Conversation Button */}
        <div className="p-4 border-b border-border shrink-0">
          <Button 
            onClick={createNewConversation}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>
        </div>
        
        {/* Conversations List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center justify-between rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors text-sm border border-transparent",
                  currentConversationId === conversation.id && "bg-muted border-border"
                )}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="truncate">
                    {conversation.title || "New Conversation"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conversation.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 border border-border rounded-lg bg-background overflow-hidden">
        {/* Compact Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/50 shrink-0">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          <div className="text-sm font-medium text-muted-foreground truncate">
            {currentConversationId 
              ? conversations.find(c => c.id === currentConversationId)?.title || "Active Conversation"
              : "New Conversation"
            }
          </div>
        </div>

        {/* Chat Component */}
        <div className="flex-1 min-h-0">
          <Chat
            className="h-full px-48"
            messages={convertedMessages}
            handleSubmit={handleSubmit}
            input={input}
            handleInputChange={handleInputChange}
            isGenerating={isStreaming}
            stop={stop}
            setInput={setInput}
            append={append}
            setMessages={setMessages}
            suggestions={[
              "What can you help me with today?",
              "Explain a complex topic in simple terms",
              "Help me brainstorm ideas for a project",
            ]}
            uploadedDocs={uploadedDocs}
            setUploadedDocs={setUploadedDocs}
            isUploadModalOpen={isUploadModalOpen}
            setIsUploadModalOpen={setIsUploadModalOpen}
          />
        </div>
      </div>
    </div>
  )
}
