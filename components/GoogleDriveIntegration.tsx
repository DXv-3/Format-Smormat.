import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File as FileIcon, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  LogOut, 
  RefreshCw, 
  Download, 
  HardDrive, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  googleSignIn, 
  logout, 
  initAuth, 
  listDriveFiles, 
  downloadDriveFile, 
  DriveFile 
} from '../services/googleDrive';
import { User } from 'firebase/auth';

interface GoogleDriveIntegrationProps {
  onFilesImported: (files: File[]) => void;
}

export const GoogleDriveIntegration: React.FC<GoogleDriveIntegrationProps> = ({ onFilesImported }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File browser state
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const currentFolder = folderStack[folderStack.length - 1];

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listDriveFiles(token, {
        folderId: currentFolder.id,
        searchQuery: searchQuery || undefined
      });
      setFiles(result.files);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list files. Your session might have expired.');
      // If unauthorized, clear session
      if (err.message && err.message.includes('401')) {
        setUser(null);
        setToken(null);
        setFiles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token, currentFolder.id, searchQuery]);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setError(null);
      },
      () => {
        setUser(null);
        setToken(null);
        setFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch files when folder or token changes
  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        fetchFiles();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [token, currentFolder.id, fetchFiles]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSelectedFileIds(new Set());
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // We need to fetch files without query
    if (token) {
      setLoading(true);
      listDriveFiles(token, { folderId: currentFolder.id })
        .then(result => setFiles(result.files))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setSearchQuery(''); // Clear search on navigation
    setFolderStack([...folderStack, { id: folderId, name: folderName }]);
  };

  const navigateUp = () => {
    if (folderStack.length > 1) {
      setSearchQuery('');
      setFolderStack(folderStack.slice(0, -1));
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    setSearchQuery('');
    setFolderStack(folderStack.slice(0, index + 1));
  };

  const toggleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFileIds);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFileIds(newSelected);
  };

  const toggleSelectAll = () => {
    const onlyFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    if (selectedFileIds.size === onlyFiles.length && onlyFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(onlyFiles.map(f => f.id)));
    }
  };

  const handleImportSelected = async () => {
    if (!token || selectedFileIds.size === 0) return;
    
    setImporting(true);
    setError(null);
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id));
    const importedJSFiles: File[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const driveFile = selectedFiles[i];
        setImportProgress(`Importing ${i + 1}/${selectedFiles.length}: ${driveFile.name}...`);
        
        const downloaded = await downloadDriveFile(token, driveFile);
        
        // Convert Blob to native File object
        const fileObj = new File([downloaded.blob], downloaded.name, {
          type: downloaded.mimeType,
          lastModified: Date.now()
        });
        importedJSFiles.push(fileObj);
      }

      onFilesImported(importedJSFiles);
      setSelectedFileIds(new Set());
      setImportProgress(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to download and import selected files.');
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="relative w-full border-4 border-zinc-900 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] transition-all">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-zinc-900 pb-4 mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight flex items-center gap-2 text-zinc-900">
            <HardDrive className="w-6 h-6 text-zinc-900" strokeWidth={2.5} />
            Google Drive Import
          </h2>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            CONNECT TO GOOGLE DRIVE TO DIRECTLY SMORMAT REMOTE FILES CLIENT-SIDE.
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold font-mono text-zinc-900 truncate max-w-[200px]" title={user.email || ''}>
                {user.email}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">AUTHED & ACTIVE</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 border-2 border-zinc-900 hover:bg-red-600 hover:text-white transition-colors duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="gsi-material-button font-mono font-bold uppercase transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{ margin: 0 }}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper border-2 border-zinc-900 p-2 flex items-center justify-center gap-2 bg-zinc-50 hover:bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:shadow-none active:translate-y-1">
              <div className="gsi-material-button-icon w-5 h-5">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents text-xs font-mono uppercase">Connect Google Drive</span>
            </div>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-600 text-red-700 font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {user ? (
        <div className="flex flex-col gap-4">
          {/* Breadcrumbs and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 p-2 border-2 border-zinc-900">
            <div className="flex items-center gap-1 overflow-x-auto py-1 font-mono text-xs font-bold text-zinc-900">
              {folderStack.length > 1 && (
                <button 
                  onClick={navigateUp}
                  className="p-1 hover:bg-zinc-200 mr-1 border border-zinc-900 bg-white"
                  title="Go Up"
                >
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
              {folderStack.map((f, idx) => (
                <React.Fragment key={f.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 mx-0.5 flex-shrink-0" />}
                  <button
                    onClick={() => navigateToBreadcrumb(idx)}
                    className={`px-1.5 py-0.5 hover:underline truncate max-w-[120px] ${idx === folderStack.length - 1 ? 'bg-zinc-900 text-white hover:no-underline' : ''}`}
                  >
                    {f.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Refresh/Search form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1 flex-grow md:flex-grow-0">
              <div className="relative flex-grow md:w-48">
                <input
                  type="text"
                  placeholder="Search file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-mono p-1.5 pl-7 border-2 border-zinc-900 focus:outline-none focus:bg-zinc-50"
                />
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-2 py-1.5 bg-zinc-200 border-2 border-zinc-900 hover:bg-zinc-300 text-xs font-mono font-bold"
                >
                  CLEAR
                </button>
              )}
              <button
                type="submit"
                className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white border-2 border-zinc-900 text-xs font-mono font-bold"
              >
                GO
              </button>
              <button
                type="button"
                onClick={fetchFiles}
                className="p-1.5 border-2 border-zinc-900 bg-white hover:bg-zinc-100"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </form>
          </div>

          {/* Import / Ingestion action bar */}
          {selectedFileIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-zinc-900 border-2 border-zinc-900 text-white font-mono text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" strokeWidth={3} />
                <span>Selected: <strong>{selectedFileIds.size}</strong> file(s) ready to morph</span>
              </div>
              <button
                onClick={handleImportSelected}
                disabled={importing}
                className="px-3 py-1 bg-white hover:bg-zinc-100 text-zinc-900 border border-white font-bold tracking-tight uppercase flex items-center gap-1.5 active:translate-y-0.5"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>MORPH THESE</span>
                  </>
                )}
              </button>
            </div>
          )}

          {importProgress && (
            <div className="p-3 bg-zinc-50 border-2 border-dashed border-zinc-900 text-xs font-mono text-zinc-900 animate-pulse">
              {importProgress}
            </div>
          )}

          {/* File Explorer Table */}
          <div className="border-2 border-zinc-900 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-zinc-900">
                  <th className="p-2 w-10 text-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={
                        files.length > 0 && 
                        files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').length > 0 &&
                        files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').every(f => selectedFileIds.has(f.id))
                      }
                      className="accent-zinc-900"
                      title="Select all files"
                    />
                  </th>
                  <th className="p-2 font-bold text-zinc-900">NAME</th>
                  <th className="p-2 font-bold text-zinc-900 hidden md:table-cell">TYPE</th>
                  <th className="p-2 font-bold text-zinc-900 text-right">SIZE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                        <span>Querying Google Drive...</span>
                      </div>
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400 italic">
                      This folder is empty or no files match search criteria.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const isSelected = selectedFileIds.has(file.id);
                    
                    return (
                      <tr 
                        key={file.id} 
                        className={`border-b border-zinc-200 hover:bg-zinc-50 transition-colors ${isFolder ? 'cursor-pointer' : ''} ${isSelected ? 'bg-zinc-50 font-bold' : ''}`}
                        onClick={(e) => {
                          if (isFolder) {
                            navigateToFolder(file.id, file.name);
                          } else {
                            // Only toggle checkbox on direct click of the row if not a folder
                            // Ensure checkbox toggle doesn't interfere
                            const target = e.target as HTMLElement;
                            if (target.tagName !== 'INPUT') {
                              toggleSelectFile(file.id);
                            }
                          }
                        }}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          {!isFolder ? (
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSelectFile(file.id)}
                              className="accent-zinc-900"
                            />
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="p-2 flex items-center gap-2">
                          {isFolder ? (
                            <Folder className="w-4 h-4 text-zinc-600 fill-zinc-200" strokeWidth={2} />
                          ) : (
                            <FileIcon className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                          )}
                          <span className="truncate max-w-[200px] md:max-w-md" title={file.name}>
                            {file.name}
                          </span>
                        </td>
                        <td className="p-2 text-zinc-500 hidden md:table-cell">
                          {isFolder ? (
                            <span className="text-zinc-400 uppercase text-[10px] font-bold">Folder</span>
                          ) : (
                            <span className="text-zinc-500 text-[10px] truncate max-w-[120px]" title={file.mimeType}>
                              {file.mimeType.replace('application/vnd.google-apps.', 'workspace:').replace('application/', '')}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right text-zinc-500 font-mono text-[11px]">
                          {isFolder ? '—' : formatSize(file.size)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-zinc-300 bg-zinc-50">
          <HardDrive className="w-12 h-12 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
          <h4 className="text-lg font-serif font-bold text-zinc-700 uppercase tracking-tight">Connect with Google Drive</h4>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto mt-2 mb-6">
            Easily import documents, spreadsheets, slides, and local-first archives directly from your personal Google Drive for universal parsing.
          </p>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="px-6 py-3 border-2 border-zinc-900 bg-zinc-900 text-white hover:bg-white hover:text-zinc-900 transition-colors duration-200 font-mono font-bold uppercase shadow-[6px_6px_0px_0px_rgba(24,24,27,0.2)]"
          >
            Authorize Access
          </button>
        </div>
      )}
    </div>
  );
};
