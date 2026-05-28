import { describe, it, expect, beforeEach } from 'vitest';
import { useFileStore } from './useFileStore';

describe('useFileStore', () => {
  beforeEach(() => {
    useFileStore.getState().clearAll();
  });

  it('initially has no files', () => {
    expect(useFileStore.getState().files.length).toBe(0);
  });

  it('can add files and updates status', () => {
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    
    useFileStore.getState().addFiles([file]);
    
    const state = useFileStore.getState();
    expect(state.files.length).toBe(1);
    expect(state.files[0].originalName).toBe('test.txt');
    expect(state.files[0].status).toBe('ANALYZING_INGESTION');
  });

  it('can remove files', () => {
    const file = new File(['content'], 'to-remove.pdf', { type: 'application/pdf' });
    useFileStore.getState().addFiles([file]);
    
    const addedFileId = useFileStore.getState().files[0].id;
    useFileStore.getState().removeFile(addedFileId);
    
    expect(useFileStore.getState().files.length).toBe(0);
  });
});
