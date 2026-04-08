function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function compressPdfFile(file: File): Promise<File> {
  if (!isPdfFile(file)) {
    return file;
  }

  try {
    const { PDFDocument } = await import("pdf-lib");
    const originalBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(originalBytes, {
      ignoreEncryption: true,
    });

    const compressedBytes = await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
    });

    if (compressedBytes.byteLength >= file.size) {
      return file;
    }

    return new File([compressedBytes], file.name, {
      type: "application/pdf",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}