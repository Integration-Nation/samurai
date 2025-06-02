"use client"

import { useState } from "react"
import { useChat, type UseChatOptions } from "@ai-sdk/react"

import { cn } from "@/lib/utils"
import { Chat } from "@/components/ui/chat"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Message } from "@/components/ui/chat-message"

type ChatUIProps = {
  initialMessages?: UseChatOptions["initialMessages"]
}

export default function ChatUI(props: ChatUIProps) {
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const {
    messages,
    input,
    handleInputChange,
    append,
    stop,
    isLoading,
    setInput,
    setMessages,
  } = useChat({
    ...props,
    api: "http://localhost:3000/api/rag/stream",
  })

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

    if (!input.trim()) return

    const userMessage = {
      role: "user" as const,
      content: input.trim(),
      id: Date.now().toString(),
    }

    append(userMessage)

    setInput("")

    try {
      const response = await fetch("http://localhost:3000/api/rag/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No reader available")

      const assistantMessage = {
        id: Date.now().toString(),
        role: "assistant" as const,
        content: "",
      }

      append(assistantMessage)

      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") return

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulated += parsed.content

                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: accumulated }
                  }
                  return updated
                })
              }
            } catch (err) {
              console.error("Error parsing JSON:", err)
            }
          }
        }
      }
    } catch (err) {
      console.error("Streaming error:", err)
      append({
        role: "assistant",
        content: "Der opstod en fejl under streaming.",
        id: Date.now().toString(),
      })
    }
  }

  return (
    <div className={cn("flex", "flex-col", "h-[80vh]", "w-full")}>

      <Chat
        className="grow"
        messages={convertedMessages}
        handleSubmit={handleSubmit}
        input={input}
        handleInputChange={handleInputChange}
        isGenerating={isLoading}
        stop={stop}
        setInput={setInput}
        append={append}
        setMessages={setMessages}
        suggestions={[
          "What is the weather in San Francisco?",
          "Explain step-by-step how to solve this math problem: If x² + 6x + 9 = 25, what is x?",
          "Design a simple algorithm to find the longest palindrome in a string.",
        ]}
        uploadedDocs={uploadedDocs}
        setUploadedDocs={setUploadedDocs}
        isUploadModalOpen={isUploadModalOpen}
        setIsUploadModalOpen={setIsUploadModalOpen}
      />
    </div>
  )
}
