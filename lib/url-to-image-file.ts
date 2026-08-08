/** Descarga una imagen remota como File (para historias con foto del producto). */
export async function urlToImageFile(imageUrl: string, filename = "producto.jpg"): Promise<File> {
  const response = await fetch(imageUrl, { mode: "cors" })
  if (!response.ok) {
    throw new Error(`image_fetch_failed:${response.status}`)
  }
  const blob = await response.blob()
  const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg"
  return new File([blob], filename, { type })
}
