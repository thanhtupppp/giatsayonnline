/// <reference types="vite/client" />

interface Window {
  api: {
    initFirebase: () => Promise<{ success: boolean; error?: string }>;
    getStores: () => Promise<{ stores: {id: string, name: string}[]; error?: string }>;
    startListening: (storeId: string) => Promise<boolean>;
    stopListening: () => Promise<boolean>;
    onJobStart: (callback: (data: any) => void) => void;
    onJobEnd: (callback: (data: any) => void) => void;
  }
}
