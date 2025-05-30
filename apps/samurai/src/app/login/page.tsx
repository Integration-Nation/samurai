import { GalleryVerticalEnd } from "lucide-react"

import  LoginForm  from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"


export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
<div className="flex flex-col gap-4 p-6 pt-16 md:p-10 md:pt-20">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="samurai-crop.gif"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.6] dark:grayscale"
        />
            {/* <Image
          src="/monty-mole.gif"
             alt="Profile photo"
             width={500}
                height={500}
             /> */}
      </div>
    </div>
  )
}
