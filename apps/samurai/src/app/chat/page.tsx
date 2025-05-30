// app/page.tsx or wherever you're rendering the component

import ChatUI from "@/components/chat-ui" // adjust the path to your file

export default function ChatPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-2xl h-full">
          <ChatUI />
        </div>
      </div>
      )
    }

