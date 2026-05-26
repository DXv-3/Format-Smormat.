import JSZip from 'jszip';

export const downloadMarkdown = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadPdf = (pdfUrl: string, originalName: string) => {
  const a = document.createElement('a');
  a.href = pdfUrl;
  a.download = originalName.replace(/\.docx$/i, '.pdf');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadFillablePdf = (pdfUrl: string, originalName: string) => {
  const a = document.createElement('a');
  a.href = pdfUrl;
  a.download = `Fillable_${originalName.replace(/\.pdf$/i, '.pdf')}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const downloadImages = async (images: string[], originalName: string) => {
  if (!images || images.length === 0) return;
  
  if (images.length === 1) {
    const a = document.createElement('a');
    a.href = images[0];
    a.download = originalName.replace(/\.pdf$/i, '.png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const zip = new JSZip();
    const baseName = originalName.replace(/\.pdf$/i, '');
    
    images.forEach((dataUrl, index) => {
      const base64Data = dataUrl.split(',')[1];
      zip.file(`${baseName}_page_${index + 1}.png`, base64Data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
