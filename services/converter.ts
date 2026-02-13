import TurndownService from 'turndown';

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
  filter: ['script', 'style', 'iframe', 'svg'],
  replacement: () => ''
});

export const convertHtmlToMarkdown = (htmlContent: string): string => {
  try {
    return turndownService.turndown(htmlContent);
  } catch (error) {
    console.error("Conversion failed:", error);
    throw new Error("Failed to parse HTML content.");
  }
};

export const getSmartFilename = (originalName: string, htmlContent: string): string => {
  try {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const title = doc.querySelector('title')?.textContent;
    
    // Use title if available, otherwise fallback to filename without extension
    let baseName = title ? title.trim() : (originalName.substring(0, originalName.lastIndexOf('.')) || originalName);
    
    // Sanitize: allow alphanumeric, spaces, hyphens, underscores, dots, parentheses
    baseName = baseName.replace(/[^a-z0-9 \-_().]/gi, '').trim();
    
    // Collapse multiple spaces
    baseName = baseName.replace(/\s+/g, ' ');
    
    // Fallback if sanitization left it empty
    if (!baseName) baseName = 'untitled';

    return `${baseName}.md`;
  } catch (e) {
    // Fallback in case of DOMParser error (unlikely in browser)
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    return `${nameWithoutExt}.md`;
  }
};