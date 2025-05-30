"use client"
 
import { useState } from "react"
import {useChat, type UseChatOptions } from "@ai-sdk/react"
 
import { cn } from "@/lib/utils"
// import { transcribeAudio } from "@/lib/utils/audio"
import { Chat } from "@/components/ui/chat"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Message } from "@/components/ui/chat-message"
 
const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Samur.AI 0.1 70B" },
]
 
type ChatUIProps = {
  initialMessages?: UseChatOptions["initialMessages"]
}
 
export default function ChatUI(props: ChatUIProps) {
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
 
  const {
    messages,
    input,
    handleInputChange,
    // handleSubmit,
    append,
    stop,
    isLoading,
    setInput,
    setMessages,
  } = useChat({
    ...props,
    api: "http://localhost:3000/api/rag/query",
  })

  const convertedMessages: Message[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('\n'), // flatten all text parts into a string
  }))

  const handleSubmit = async (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => {
    if (event?.preventDefault) {
      event.preventDefault()
    }
  
    if (!input.trim()) return
  
    append({
      role: "user",
      content: input.trim(),
    })
  
    try {
      const response = await fetch("http://localhost:3000/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input.trim() }),
      })
      const data = await response.json()
  
      // Unpack the messages from backend response
      const assistantContent = data.messages
        .map((msg: any) =>
          msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n')
        )
        .join('\n')
  
      append({
        role: "assistant",
        content: assistantContent,
      })
    } catch (err) {
      console.error("Chat error:", err)
    }
  
    setInput("")
  }
  
  
  
 
  return (
    <div className={cn("flex", "flex-col", "h-[500px]", "w-full")}>
      <div className={cn("flex", "justify-end", "mb-2")}>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
 
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
        // transcribeAudio={transcribeAudio}
        suggestions={[
          "What is the weather in San Francisco?",
          "Explain step-by-step how to solve this math problem: If x² + 6x + 9 = 25, what is x?",
          "Design a simple algorithm to find the longest palindrome in a string.",
        ]}
      />
    </div>
  )
}