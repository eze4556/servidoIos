const MAX_SIDE_PX = 1600

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("No se pudo cargar la imagen procesada"))
    }
    img.src = url
  })
}

function canvasToPngFile(canvas: HTMLCanvasElement, baseName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen con fondo blanco"))
          return
        }
        const safeBase = baseName.replace(/\.[^.]+$/, "") || "producto"
        resolve(new File([blob], `${safeBase}-white.png`, { type: "image/png" }))
      },
      "image/png",
      0.92
    )
  })
}

/** Quita el fondo y pega el producto sobre blanco. */
export async function applyWhiteBackground(file: File): Promise<File> {
  const { removeBackground } = await import("@imgly/background-removal")

  const cutout = await removeBackground(file, {
    model: "isnet_fp16",
    output: {
      format: "image/png",
      type: "foreground",
    },
  })

  const img = await loadImageFromBlob(cutout)
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas no disponible")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return canvasToPngFile(canvas, file.name)
}
