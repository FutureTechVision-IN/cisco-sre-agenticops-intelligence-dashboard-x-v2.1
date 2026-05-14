/**
 * Chatbot Portal Manager
 * Centralized management for portal lifecycle, error handling, and debugging
 */

import React from 'react';

export interface PortalState {
  container: HTMLElement | null;
  isReady: boolean;
  error: Error | null;
  retryCount: number;
}

export class ChatbotPortalManager {
  private static instance: ChatbotPortalManager;
  private state: PortalState = {
    container: null,
    isReady: false,
    error: null,
    retryCount: 0
  };

  private callbacks: Array<(state: PortalState) => void> = [];
  private maxRetries = 3;

  static getInstance(): ChatbotPortalManager {
    if (!ChatbotPortalManager.instance) {
      ChatbotPortalManager.instance = new ChatbotPortalManager();
    }
    return ChatbotPortalManager.instance;
  }

  public initialize(): Promise<PortalState> {
    return new Promise((resolve, reject) => {
      try {
        if (this.state.isReady && this.state.container) {
          resolve(this.state);
          return;
        }

        const attemptInitialization = () => {
          if (document.body && document.readyState !== 'loading') {
            this.state = {
              container: document.body,
              isReady: true,
              error: null,
              retryCount: this.state.retryCount
            };
            console.log('[PortalManager] Successfully initialized');
            this.notifyCallbacks();
            resolve(this.state);
          } else if (this.state.retryCount < this.maxRetries) {
            this.state.retryCount++;
            console.log(`[PortalManager] Retry ${this.state.retryCount}/${this.maxRetries}`);
            setTimeout(attemptInitialization, 50);
          } else {
            const error = new Error('Portal initialization failed after max retries');
            this.state.error = error;
            reject(error);
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', attemptInitialization, { once: true });
        } else {
          attemptInitialization();
        }
      } catch (err) {
        this.state.error = err as Error;
        reject(err);
      }
    });
  }

  public subscribe(callback: (state: PortalState) => void): () => void {
    this.callbacks.push(callback);
    // Immediately notify of current state
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.state));
  }

  public getState(): PortalState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      container: null,
      isReady: false,
      error: null,
      retryCount: 0
    };
    this.notifyCallbacks();
  }
}

// React hook for using the portal manager
export function useChatbotPortal() {
  const [portalState, setPortalState] = React.useState<PortalState>({
    container: null,
    isReady: false,
    error: null,
    retryCount: 0
  });

  React.useEffect(() => {
    const manager = ChatbotPortalManager.getInstance();
    
    // Subscribe to state changes
    const unsubscribe = manager.subscribe(setPortalState);
    
    // Initialize if not already initialized
    manager.initialize().catch(err => {
      console.error('[useChatbotPortal] Initialization failed:', err);
    });

    return unsubscribe;
  }, []);

  return portalState;
}