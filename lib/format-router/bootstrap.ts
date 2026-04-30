import { conversionGraph } from './graph';

export function bootstrapFormatRouter() {
  conversionGraph.formats.set('pdf', { id: 'pdf', name: 'PDF Document', extensions: ['.pdf'], mimeTypes: ['application/pdf'] });
  conversionGraph.formats.set('docx', { id: 'docx', name: 'Word Document', extensions: ['.docx'], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });
  conversionGraph.formats.set('txt', { id: 'txt', name: 'Plain Text', extensions: ['.txt'], mimeTypes: ['text/plain'] });
  conversionGraph.formats.set('json', { id: 'json', name: 'JSON Data', extensions: ['.json'], mimeTypes: ['application/json'] });
  conversionGraph.formats.set('png', { id: 'png', name: 'PNG Image', extensions: ['.png'], mimeTypes: ['image/png'] });
  conversionGraph.formats.set('jpeg', { id: 'jpeg', name: 'JPEG Image', extensions: ['.jpg', '.jpeg'], mimeTypes: ['image/jpeg'] });
  conversionGraph.formats.set('md', { id: 'md', name: 'Markdown', extensions: ['.md'], mimeTypes: ['text/markdown'] });
}
