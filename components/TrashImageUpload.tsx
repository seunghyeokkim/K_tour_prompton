import React, { useRef, useState } from "react"

interface TrashImageUploadProps {
  onUpload: (file: File, previewUrl: string) => void
}

export default function TrashImageUpload({ onUpload }: TrashImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.")
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
      onUpload(file, reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        className="px-4 py-2 bg-[#ff86e1] text-white rounded-lg shadow hover:bg-[#e06fcf]"
        onClick={() => fileInputRef.current?.click()}
      >
        이미지 선택
      </button>
      {preview && (
        <img src={preview} alt="미리보기" className="max-w-xs max-h-40 rounded border mt-2" />
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  )
} 