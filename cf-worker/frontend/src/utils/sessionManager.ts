class SessionManager {
  private sessionId: string | null = null
  private listeners: ((sessionId: string | null) => void)[] = []

  generateSessionId(): string {
    this.sessionId = this.generateUUID()
    this.notifyListeners()
    return this.sessionId
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    this.notifyListeners()
  }

  clearSession(): void {
    this.sessionId = null
    this.notifyListeners()
  }

  onSessionChange(callback: (sessionId: string | null) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.sessionId))
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

export const sessionManager = new SessionManager()
