/**
 * topProgress — Global singleton progress controller for page transitions.
 * Provides zero-latency feedback on link clicks, programmatic navigations,
 * and lazy-loaded React Suspense chunk downloads.
 */

class TopProgressManager {
  constructor() {
    this.status = 'idle'; // 'idle' | 'loading' | 'completing'
    this.progress = 0;
    this.listeners = new Set();
    this.trickleTimer = null;
    this.completeTimer = null;
    this.safetyTimer = null;
    this._initialized = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ status: this.status, progress: this.progress });
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({ status: this.status, progress: this.progress });
    }
  }

  start() {
    if (this.completeTimer) {
      clearTimeout(this.completeTimer);
      this.completeTimer = null;
    }

    if (this.status === 'loading') {
      return; // Already actively trickling
    }

    this.status = 'loading';
    this.progress = 24;
    this.notify();

    if (this.trickleTimer) clearInterval(this.trickleTimer);
    this.trickleTimer = setInterval(() => {
      this.trickle();
    }, 200);

    // Fail-safe watchdog: automatically complete after 8s if navigation hangs
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    this.safetyTimer = setTimeout(() => {
      this.done();
    }, 8000);
  }

  trickle() {
    if (this.status !== 'loading') return;

    let delta = 0;
    if (this.progress < 40) {
      delta = 8;
    } else if (this.progress < 70) {
      delta = 5;
    } else if (this.progress < 85) {
      delta = 3;
    } else if (this.progress < 95) {
      delta = 0.8;
    }

    this.progress = Math.min(95, Math.round((this.progress + delta) * 10) / 10);
    this.notify();
  }

  done() {
    if (this.status === 'idle') return;

    if (this.trickleTimer) {
      clearInterval(this.trickleTimer);
      this.trickleTimer = null;
    }
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }

    this.status = 'completing';
    this.progress = 100;
    this.notify();

    if (this.completeTimer) clearTimeout(this.completeTimer);
    this.completeTimer = setTimeout(() => {
      this.status = 'idle';
      this.progress = 0;
      this.completeTimer = null;
      this.notify();
    }, 250);
  }

  /**
   * Initializes global document listeners to capture internal link clicks
   * and History API state changes with zero latency.
   */
  initGlobalListeners() {
    if (this._initialized || typeof window === 'undefined') return;
    this._initialized = true;

    // Capture-phase link click interceptor
    document.addEventListener(
      'click',
      (e) => {
        // Ignore modified clicks or non-primary button
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }

        const anchor = e.target.closest('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return;
        }
        if (anchor.target && anchor.target !== '_self') return;
        if (anchor.hasAttribute('download')) return;

        try {
          const targetUrl = new URL(anchor.href, window.location.href);
          if (targetUrl.origin === window.location.origin) {
            const currentPath = window.location.pathname + window.location.search;
            const targetPath = targetUrl.pathname + targetUrl.search;
            if (targetPath !== currentPath) {
              this.start();
            }
          }
        } catch {
          // Ignore URL parsing errors
        }
      },
      true, // capture phase
    );

    // History API popstate listener (back/forward navigation)
    window.addEventListener('popstate', () => {
      this.start();
    });

    // Wrap pushState and replaceState to catch programmatic navigations
    const origPushState = window.history.pushState;
    if (origPushState) {
      const self = this;
      window.history.pushState = function (...args) {
        const url = args[2];
        if (url) {
          try {
            const targetUrl = new URL(url, window.location.href);
            const currentPath = window.location.pathname + window.location.search;
            const targetPath = targetUrl.pathname + targetUrl.search;
            if (targetPath !== currentPath) {
              self.start();
            }
          } catch {
            // Ignore
          }
        }
        return origPushState.apply(this, args);
      };
    }
  }
}

export const topProgress = new TopProgressManager();
export default topProgress;
