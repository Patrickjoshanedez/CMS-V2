/**
 * topProgress — Global singleton progress controller for page transitions.
 * Provides zero-latency feedback on link clicks, programmatic navigations,
 * and lazy-loaded React Suspense chunk downloads.
 */

function cleanPath(urlStr, baseOrigin) {
  try {
    const u = new URL(urlStr, baseOrigin);
    const p = u.pathname.replace(/\/+$/, '') || '/';
    return p + (u.search || '');
  } catch {
    return null;
  }
}

class TopProgressManager {
  constructor() {
    this.status = 'idle'; // 'idle' | 'loading' | 'completing'
    this.progress = 0;
    this.listeners = new Set();
    this.trickleTimer = null;
    this.completeTimer = null;
    this.safetyTimer = null;
    this.clickVerifyTimer = null;
    this._initialized = false;
    this._isSuspended = false;
    this._suspensionGeneration = null;
    this.generation = 0;
    this.target = null;
    this._listenerRefCount = 0;
    this._historyWrappers = [];
  }

  get isSuspended() {
    return this._isSuspended;
  }

  setSuspended(val, generation) {
    if (val) {
      const activeGeneration = this.start();
      this._isSuspended = true;
      this._suspensionGeneration = activeGeneration;
      if (this.completeTimer) {
        clearTimeout(this.completeTimer);
        this.completeTimer = null;
      }
      return activeGeneration;
    }

    const expectedGeneration = generation ?? this._suspensionGeneration ?? this.generation;
    if (expectedGeneration !== this.generation) return false;
    if (this._suspensionGeneration !== null && expectedGeneration !== this._suspensionGeneration) {
      return false;
    }

    this._isSuspended = false;
    this._suspensionGeneration = null;
    return this.done(expectedGeneration);
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

  start(target = null) {
    if (this.status === 'loading' && (target === null || target === this.target)) {
      return this.generation;
    }

    if (this.completeTimer) {
      clearTimeout(this.completeTimer);
      this.completeTimer = null;
    }

    if (this.trickleTimer) clearInterval(this.trickleTimer);
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    if (this.clickVerifyTimer) clearTimeout(this.clickVerifyTimer);

    this.generation += 1;
    this.target = target;
    this._isSuspended = false;
    this._suspensionGeneration = null;
    const generation = this.generation;

    this.status = 'loading';
    this.progress = 24;
    this.notify();

    this.trickleTimer = setInterval(() => {
      this.trickle();
    }, 200);

    // Clear a stuck visual without announcing a successful navigation.
    this.safetyTimer = setTimeout(() => {
      this.clear(generation);
    }, 6000);
    return generation;
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

  done(generation = this.generation) {
    if (generation !== this.generation) return false;

    if (this.clickVerifyTimer) {
      clearTimeout(this.clickVerifyTimer);
      this.clickVerifyTimer = null;
    }

    // If React is actively suspended waiting for route chunk/resources,
    // keep the current route generation pending until it settles.
    if (this._isSuspended) return false;

    if (this.status === 'idle') return false;

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
      if (generation !== this.generation || this.status !== 'completing') return;
      this.status = 'idle';
      this.progress = 0;
      this.target = null;
      this.completeTimer = null;
      this.notify();
    }, 250);
    return true;
  }

  clear(generation = this.generation) {
    if (generation !== this.generation) return false;

    if (this.trickleTimer) clearInterval(this.trickleTimer);
    if (this.completeTimer) clearTimeout(this.completeTimer);
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    if (this.clickVerifyTimer) clearTimeout(this.clickVerifyTimer);

    this.trickleTimer = null;
    this.completeTimer = null;
    this.safetyTimer = null;
    this.clickVerifyTimer = null;
    this._isSuspended = false;
    this._suspensionGeneration = null;
    this.target = null;
    this.status = 'idle';
    this.progress = 0;
    this.notify();
    return true;
  }

  fail(generation = this.generation) {
    return this.clear(generation);
  }

  /**
   * Initializes global document listeners to capture internal link clicks
   * and History API state changes with zero latency.
   */
  initGlobalListeners() {
    if (typeof window === 'undefined') return () => {};

    if (this._initialized) {
      this._listenerRefCount += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.releaseGlobalListeners();
      };
    }

    this._initialized = true;
    this._listenerRefCount = 1;

    // Capture-phase link click interceptor
    this._clickHandler = (e) => {
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
        href.startsWith('tel:') ||
        anchor.getAttribute('role') === 'button' ||
        anchor.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      try {
        const currentPath = cleanPath(window.location.href, window.location.origin);
        const targetPath = cleanPath(anchor.href, window.location.origin);

        if (targetPath && currentPath && targetPath !== currentPath) {
          const generation = this.start(targetPath);

          // Safety guard: If within 600ms no pushState/popstate actually occurred
          // (e.g. event was defaultPrevented by a router/component, or route transition was aborted),
          // auto-reset progress so the bar does not trickle to 100% while contents remain on same page.
          if (this.clickVerifyTimer) clearTimeout(this.clickVerifyTimer);
          this.clickVerifyTimer = setTimeout(() => {
            const nowPath = cleanPath(window.location.href, window.location.origin);
            if (
              nowPath === currentPath &&
              this.status === 'loading' &&
              !this._isSuspended &&
              generation === this.generation
            ) {
              this.clear(generation);
            }
          }, 600);
        }
      } catch {
        // Ignore URL parsing errors
      }
    };
    document.addEventListener('click', this._clickHandler, true);

    // History API popstate listener (back/forward navigation)
    this._popstateHandler = () => {
      if (this.clickVerifyTimer) {
        clearTimeout(this.clickVerifyTimer);
        this.clickVerifyTimer = null;
      }
      this.start(cleanPath(window.location.href, window.location.origin));
    };
    window.addEventListener('popstate', this._popstateHandler);

    // Wrap both History API methods used for programmatic route changes.
    const self = this;
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method];
      if (!original) continue;

      const wrapped = function (...args) {
        if (self.clickVerifyTimer) {
          clearTimeout(self.clickVerifyTimer);
          self.clickVerifyTimer = null;
        }
        const url = args[2];
        if (url) {
          try {
            const currentPath = cleanPath(window.location.href, window.location.origin);
            const targetPath = cleanPath(url, window.location.origin);
            if (targetPath && currentPath && targetPath !== currentPath) {
              self.start(targetPath);
            }
          } catch {
            // Ignore
          }
        }
        return original.apply(this, args);
      };
      window.history[method] = wrapped;
      this._historyWrappers.push({ method, original, wrapped });
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.releaseGlobalListeners();
    };
  }

  releaseGlobalListeners() {
    this._listenerRefCount = Math.max(0, this._listenerRefCount - 1);
    if (this._listenerRefCount > 0 || !this._initialized) return;

    document.removeEventListener('click', this._clickHandler, true);
    window.removeEventListener('popstate', this._popstateHandler);
    for (const { method, original, wrapped } of this._historyWrappers) {
      if (window.history[method] === wrapped) window.history[method] = original;
    }

    this._clickHandler = null;
    this._popstateHandler = null;
    this._historyWrappers = [];
    this._initialized = false;
    this.clear();
  }
}

export const topProgress = new TopProgressManager();
export default topProgress;
