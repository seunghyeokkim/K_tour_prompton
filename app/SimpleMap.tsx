"use client"

export default function SimpleMap() {
  return (
    <iframe
      src="/tmap-frame.html"
      width="100%"
      height="500px"
      style={{
        border: "1px solid #ccc",
        borderRadius: "10px",
      }}
      title="Tmap"
    />
  )
}
