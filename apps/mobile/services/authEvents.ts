/**
 * Auth Events - Event emitter for auth state changes
 * Used to notify AuthContext when token is invalidated (e.g., 401 response)
 */

type AuthEventType = 'tokenInvalidated' | 'sessionExpired';
type AuthEventListener = () => void;

class AuthEventEmitter {
  private listeners: Map<AuthEventType, Set<AuthEventListener>> = new Map();

  on(event: AuthEventType, listener: AuthEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: AuthEventType): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.error(`Error in auth event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: AuthEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const authEvents = new AuthEventEmitter();
export type { AuthEventType };
