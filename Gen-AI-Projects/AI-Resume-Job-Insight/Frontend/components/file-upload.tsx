"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"



interface FileUploadProps {
  onFileSelect: (file: File | null, url?: string) => void
  selectedFile: File | null
  accept?: string
  maxSize?: number
}

export function FileUpload({
  onFileSelect,
  selectedFile,
  accept = ".pdf,.docx",
  maxSize = 10 * 1024 * 1024,
}: FileUploadProps) {

  // Just select the file, no upload
  const handleFileSelect = (file: File) => {
    onFileSelect(file)
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        handleFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize,
    multiple: false,
  })

  const removeFile = () => {
    onFileSelect(null)
  }

  if (selectedFile) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        !isDragActive && "border-border hover:border-primary/50",
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />

      {isDragActive ? (
        isDragReject ? (
          <p className="text-destructive">File type not supported</p>
        ) : (
          <p className="text-primary">Drop your resume here</p>
        )
      ) : (
        <div className="space-y-2">
          <p className="text-foreground font-medium">Drag and drop your resume here</p>
          <p className="text-sm text-muted-foreground">or click to browse files</p>
          <p className="text-xs text-muted-foreground">
            Supports PDF and DOCX files up to {maxSize / 1024 / 1024}MB
          </p>
        </div>
      )}
    </div>
  )
}
