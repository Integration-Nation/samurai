import { GalleryVerticalEnd } from "lucide-react"

import  LoginForm  from "@/components/login-form"
import { ModeToggle } from "@/components/mode-toggle"


export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            SAMUR.AI
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <ModeToggle/>
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
