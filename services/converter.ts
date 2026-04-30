import TurndownService from 'turndown';
import { Readability } from '@mozilla/readability';
import JSZip from 'jszip';

// Dynamic imports are configured for heavy modules (mammoth, html2pdf, pdfjs-dist) inside process files
// to significantly reduce initial bundle size and speed up load time.

// Initialize Turndown service with GitHub-flavored markdown options
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  hr: '---'
});

// Add rules to strip unnecessary tags often found in raw HTML dumps
turndownService.addRule('script', {
  filter: ['script', 'style', 'iframe', 'svg', 'nav', 'footer', 'aside', 'noscript'],
  replacement: () => ''
});

// Strip inline base64 images (like logos or trackers) to keep markdown clean
turndownService.addRule('inline-images', {
  filter: function (node) {
    if (node.nodeName === 'IMG') {
      const src = (node as HTMLElement).getAttribute('src');
      if (src && src.startsWith('data:image')) {
        return true;
      }
    }
    return false;
  },
  replacement: () => ''
});

export const convertHtmlToMarkdown = (htmlContent: string, smartExtract: boolean = false): string => {
  try {
    let contentToConvert = htmlContent;
    
    if (smartExtract) {
      // Create a DOM document from the HTML string
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      
      // Try to use Mozilla Readability to extract the core content
      const reader = new Readability(doc);
      const article = reader.parse();
      
      if (article && article.content) {
        contentToConvert = article.content;
      } else {
        // Fallback: if Readability fails to find an article, we can try to manually strip common noise elements
        const fallbackDoc = new DOMParser().parseFromString(htmlContent, 'text/html');
        const noiseSelectors = ['nav', 'footer', 'aside', 'header', '.sidebar', '#sidebar', '.menu', '.navigation'];
        noiseSelectors.forEach(selector => {
          fallbackDoc.querySelectorAll(selector).forEach(el => el.remove());
        });
        contentToConvert = fallbackDoc.body.innerHTML;
      }
    }

    return turndownService.turndown(contentToConvert);
  } catch (error) {
    console.error("Conversion failed:", error);
    throw new Error("Failed to parse HTML content.");
  }
};

export const convertJsonToMarkdown = (jsonContent: string): string => {
  try {
    const data = JSON.parse(jsonContent);
    return jsonToMarkdownRecursive(data);
  } catch (error) {
    console.error("JSON Conversion failed:", error);
    throw new Error("Failed to parse JSON content.");
  }
};

const jsonToMarkdownRecursive = (data: any, depth: number = 0): string => {
  const indent = '  '.repeat(depth);
  
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '(empty array)';
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return `\n${indent}- ${jsonToMarkdownRecursive(item, depth + 1).trim()}`;
      }
      return `\n${indent}- ${item}`;
    }).join('');
  }
  
  if (typeof data === 'object') {
    if (Object.keys(data).length === 0) return '(empty object)';
    return Object.entries(data).map(([key, value]) => {
      const valueStr = jsonToMarkdownRecursive(value, depth + 1);
      // If the value starts with a newline (array or object), don't add extra space
      const separator = (typeof value === 'object' && value !== null) ? '' : ' ';
      return `\n${indent}- **${key}**: ${separator}${valueStr.trim()}`;
    }).join('');
  }
  
  return String(data);
};

export const getSmartFilename = (originalName: string, content: string): string => {
  try {
    let baseName = '';
    
    if (originalName.toLowerCase().endsWith('.json')) {
      // For JSON, try to find a "name" or "title" field in the top level
      try {
        const data = JSON.parse(content);
        if (data.title && typeof data.title === 'string') baseName = data.title;
        else if (data.name && typeof data.name === 'string') baseName = data.name;
      } catch (e) {
        // invalid json, ignore
      }
    } else if (originalName.toLowerCase().endsWith('.html') || originalName.toLowerCase().endsWith('.htm')) {
      // For HTML
      const doc = new DOMParser().parseFromString(content, 'text/html');
      const title = doc.querySelector('title')?.textContent;
      if (title) baseName = title.trim();
    }

    // Fallback to filename without extension if no internal title found
    if (!baseName) {
      baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    }
    
    // Sanitize: allow alphanumeric, spaces, hyphens, underscores, dots, parentheses
    baseName = baseName.replace(/[^a-z0-9 \-_().]/gi, '').trim();
    
    // Collapse multiple spaces
    baseName = baseName.replace(/\s+/g, ' ');
    
    // Fallback if sanitization left it empty
    if (!baseName) baseName = 'untitled';

    return `${baseName}.md`;
  } catch (e) {
    // Fallback in case of error
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    return `${nameWithoutExt}.md`;
  }
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const processUniversalFile = async (file: File, action: string = 'markdown_raw'): Promise<{ markdown?: string, smartName: string, pdfUrl?: string, images?: string[], fillablePdfUrl?: string }> => {
  const name = file.name.toLowerCase();
  const smartName = getSmartFilename(file.name, "");

  // 1. Handle HTML
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    const text = await readFileAsText(file);
    const sn = getSmartFilename(file.name, text);
    const markdown = convertHtmlToMarkdown(text, action === 'markdown_smart');
    return { markdown, smartName: sn };
  }
  
  // 2. Handle JSON
  if (name.endsWith('.json')) {
    const text = await readFileAsText(file);
    const sn = getSmartFilename(file.name, text);
    const markdown = convertJsonToMarkdown(text);
    return { markdown, smartName: sn };
  }
  
  // 3. Handle CSV
  if (name.endsWith('.csv')) {
    const text = await readFileAsText(file);
    const markdown = `\`\`\`csv\n${text}\n\`\`\``;
    return { markdown, smartName };
  }

  // 4. Handle ZIP and CRX (Chrome Extensions)
  if (name.endsWith('.zip') || name.endsWith('.crx')) {
    const buffer = await readFileAsArrayBuffer(file);
    let zipBuffer = buffer;
    
    // CRX files have a header before the ZIP archive starts.
    // The ZIP archive starts with 'PK\x03\x04' (50 4B 03 04).
    if (name.endsWith('.crx')) {
      const view = new Uint8Array(buffer);
      let zipStart = -1;
      for (let i = 0; i < view.length - 3; i++) {
        if (view[i] === 0x50 && view[i+1] === 0x4B && view[i+2] === 0x03 && view[i+3] === 0x04) {
          zipStart = i;
          break;
        }
      }
      if (zipStart !== -1) {
        zipBuffer = buffer.slice(zipStart);
      }
    }

    const zip = await JSZip.loadAsync(zipBuffer);
    let combinedMarkdown = `# Extracted Archive: ${file.name}\n\n`;
    
    const textExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.csv'];
    
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      
      const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
      if (textExtensions.includes(ext) || relativePath.includes('manifest.json')) {
        const content = await zipEntry.async('string');
        combinedMarkdown += `## File: \`${relativePath}\`\n\n\`\`\`${ext.replace('.', '')}\n${content}\n\`\`\`\n\n`;
      }
    }
    
    const smartName = getSmartFilename(file.name, "");
    return { markdown: combinedMarkdown, smartName };
  }
  
  // 5. Handle DOCX
  if (name.endsWith('.docx')) {
    const buffer = await readFileAsArrayBuffer(file);
    
    // Extract HTML using mammoth
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = result.value;
    const sn = getSmartFilename(file.name, html);
    
    // Generate PDF from the HTML if requested
    if (action === 'docx_to_pdf') {
      let pdfUrl: string | undefined;
      try {
        // Create a temporary container for html2pdf
        const container = document.createElement('div');
        container.innerHTML = html;
        
        // Basic styling for the PDF
        container.style.padding = '40px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.lineHeight = '1.6';
        container.style.color = '#000';
        container.style.background = '#fff';
        
        const opt = {
          margin:       10,
          filename:     file.name.replace(/\.docx$/i, '.pdf'),
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
        pdfUrl = URL.createObjectURL(pdfBlob);
      } catch (err) {
        console.error("Failed to generate PDF:", err);
      }
      return { smartName: sn, pdfUrl, markdown: `*Converted ${file.name} to PDF*` };
    }

    // Otherwise standard markdown return
    const markdown = convertHtmlToMarkdown(html, false);
    return { markdown, smartName: sn };
  }

  // Handle PDF
  if (name.endsWith('.pdf')) {
    const buffer = await readFileAsArrayBuffer(file);

    // Explicitly load pdfjs-dist 
    const pdfjsLib = await import('pdfjs-dist');
    const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    // pdfjsLib detaches the buffer, making it unusable for pdf-lib below unless we duplicate it
    const bufferForPdfLib = buffer.slice(0);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const numPages = pdf.numPages;

    if (action === 'extract_images') {
      const images: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          images.push(canvas.toDataURL('image/png'));
        }
      }
      return { smartName, images, markdown: `*Extracted ${numPages} pages as PNG images from ${file.name}*` };
    }

    if (action === 'pdf_fillable') {
      let createdFillable = false;
      let fillablePdfUrl: string | undefined;

      try {
        const { PDFDocument, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(bufferForPdfLib);
        const form = pdfDoc.getForm();
        const pdfLibPages = pdfDoc.getPages();
        
        let fieldCount = 0;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          textContent.items.forEach((item: any) => {
            if (item && item.str && item.str.match(/_{3,}|\.{5,}/)) {
              const width = item.width || 100;
              const height = item.height || 12;
              const x = item.transform[4];
              const y = item.transform[5];
              
              try {
                const textField = form.createTextField(`auto_field_${fieldCount++}`);
                textField.addToPage(pdfLibPages[i - 1], {
                  x: x, 
                  y: y - 2, 
                  width: width, 
                  height: height + 8,
                  backgroundColor: rgb(0.9, 0.95, 1),
                  borderColor: rgb(0.6, 0.7, 0.9),
                  borderWidth: 1,
                });
                createdFillable = true;
              } catch (err) {}
            }
          });
        }

        if (createdFillable) {
          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          fillablePdfUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        console.warn("Could not generate fillable PDF", e);
      }
      
      let markdown = createdFillable 
        ? `**✨ Magic Fillable PDF Created**: Detected and converted blank lines into interactive form fields!`
        : `*No blank lines found to convert into fillable fields for ${file.name}.*`;
      
      return { smartName, fillablePdfUrl, markdown };
    }

    // Default action fallback
    return { smartName, markdown: `*Processed ${file.name} as standard PDF*` };
  }

  // 6. Fallback for any other text-like file (TXT, MD, JS, etc.)
  const text = await readFileAsText(file);
  const sn = getSmartFilename(file.name, text);
  const ext = name.substring(name.lastIndexOf('.') + 1);
  const markdown = `\`\`\`${ext}\n${text}\n\`\`\``;
  
  return { markdown, smartName: sn };
};
