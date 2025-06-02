"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { X, Upload, Loader2 } from "lucide-react"

interface UploadDocumentsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  uploadedDocs: File[]
  setUploadedDocs: (docs: File[]) => void
  onUploadComplete?: (uploadedFiles: any[]) => void // Callback for successful uploads
}

export function UploadDocumentsModal({
  open,
  setOpen,
  uploadedDocs,
  setUploadedDocs,
  onUploadComplete
}: UploadDocumentsModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const removeFile = (index: number) => {
    const newDocs = uploadedDocs.filter((_, i) => i !== index)
    setUploadedDocs(newDocs)
  }

  const getEndpointForFile = (file: File): string | null => {
    const mimeType = file.type.toLowerCase()
    const extension = file.name.toLowerCase().split('.').pop()

    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return '/upload/pdf'
    } else if (mimeType === 'text/plain' || extension === 'txt') {
      return '/upload/txt'
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') {
      return '/upload/docx'
    }
    return null
  }

  const uploadFiles = async () => {
    if (uploadedDocs.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const uploadPromises = uploadedDocs.map(async (file) => {
        const endpoint = `http://localhost:3000/api/document${getEndpointForFile(file)}`
        
        if (!endpoint) {
          throw new Error(`Unsupported file type: ${file.name}`)
        }

        const formData = new FormData()
        formData.append('file', file) // Your backend expects 'file' field name

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to upload ${file.name}: ${errorText}`)
        }
        
        const result = await response.json()
        return { file: file.name, result }
      })

      const results = await Promise.all(uploadPromises)
      
      // Call success callback if provided
    //   if (onUploadComplete) {
    //     onUploadComplete(results)
    //   }
    alert(`Successfully uploaded ${results.length} files!`)

      // Clear uploaded docs and close modal
      setUploadedDocs([])
      setOpen(false)
      
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>Select one or more files to add</DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-background px-4 py-6 text-center hover:bg-muted transition">
          <input
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.txt" // Only supported file types
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              
              // Filter only supported file types
              const supportedFiles = files.filter(file => {
                const extension = file.name.toLowerCase().split('.').pop()
                return ['pdf', 'docx', 'txt'].includes(extension || '')
              })
              
              if (files.length !== supportedFiles.length) {
                setUploadError('Some files were skipped. Only PDF, DOCX, and TXT files are supported.')
              } else {
                setUploadError(null)
              }
              
              setUploadedDocs([...uploadedDocs, ...supportedFiles])
            }}
          />
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="font-medium text-muted-foreground">
            Click to upload or drag files here
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, TXT files only
          </span>
        </label>

        {uploadError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {uploadError}
          </div>
        )}

        {uploadedDocs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Selected files ({uploadedDocs.length})
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground max-h-48 overflow-y-auto">
              {uploadedDocs.map((file, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border bg-muted px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <span>📄</span>
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(i)}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="secondary" 
            onClick={() => setOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={uploadFiles}
            disabled={uploadedDocs.length === 0 || isUploading}
            className="min-w-[100px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {uploadedDocs.length > 0 && `(${uploadedDocs.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}