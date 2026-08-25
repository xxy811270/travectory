import { Capacitor, registerPlugin } from "@capacitor/core";

interface ImageExportPlugin {
  saveToGallery(options: { dataUrl: string; filename: string }): Promise<{ uri: string; album: string }>;
}

const ImageExport = registerPlugin<ImageExportPlugin>("ImageExport");

export function canSaveToNativeGallery() { return Capacitor.isNativePlatform(); }

export async function savePngToGallery(blob: Blob, filename: string) {
  const dataUrl = await blobToDataUrl(blob);
  return ImageExport.saveToGallery({ dataUrl, filename });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });
}
