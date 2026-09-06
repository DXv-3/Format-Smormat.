import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to retrieve token if signed in but cache is empty.
        // In some cases we might need to prompt login again, but we start with null
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Google Drive API Methods

export interface ListFilesOptions {
  folderId?: string;
  searchQuery?: string;
  pageToken?: string;
  pageSize?: number;
}

export interface ListFilesResult {
  files: DriveFile[];
  nextPageToken?: string;
}

export const listDriveFiles = async (
  accessToken: string,
  options: ListFilesOptions = {}
): Promise<ListFilesResult> => {
  const { folderId = 'root', searchQuery = '', pageToken = '', pageSize = 20 } = options;
  
  let q = `'${folderId}' in parents and trashed = false`;
  if (searchQuery) {
    q = `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed = false`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', q);
  url.searchParams.append('pageSize', pageSize.toString());
  url.searchParams.append('fields', 'nextPageToken, files(id, name, mimeType, size, modifiedTime)');
  url.searchParams.append('orderBy', 'folder,name');
  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Google Drive files: ${errText}`);
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken
  };
};

export interface DownloadedFile {
  name: string;
  blob: Blob;
  mimeType: string;
}

export const downloadDriveFile = async (
  accessToken: string,
  file: DriveFile
): Promise<DownloadedFile> => {
  const fileId = file.id;
  const mimeType = file.mimeType;
  
  // Handle Google Workspace docs export
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    let exportMimeType = 'application/pdf';
    let suffix = '.pdf';
    
    if (mimeType === 'application/vnd.google-apps.document') {
      exportMimeType = 'text/html';
      suffix = '.html';
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      exportMimeType = 'text/csv';
      suffix = '.csv';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      exportMimeType = 'application/pdf';
      suffix = '.pdf';
    }
    
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to export Google Workspace file: ${errText}`);
    }
    
    const blob = await res.blob();
    // Ensure file name ends with correct suffix
    let finalName = file.name;
    if (!finalName.toLowerCase().endsWith(suffix)) {
      finalName += suffix;
    }
    
    return {
      name: finalName,
      blob,
      mimeType: exportMimeType
    };
  }
  
  // Standard files (download directly)
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download file from Google Drive: ${errText}`);
  }
  
  const blob = await res.blob();
  return {
    name: file.name,
    blob,
    mimeType
  };
};

export const uploadFileToDrive = async (
  accessToken: string,
  name: string,
  content: string | Blob,
  mimeType: string = 'text/markdown'
): Promise<{ id: string; name: string }> => {
  const metadata = {
    name: name,
    mimeType: mimeType,
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', content instanceof Blob ? content : new Blob([content], { type: mimeType }));
  
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload to Google Drive failed: ${text}`);
  }
  return await res.json();
};
