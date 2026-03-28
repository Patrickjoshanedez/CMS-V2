/**
 * WorkloadOptimizationContext — Context object for the Strategy Design Pattern.
 *
 * Holds a reference to the currently active WorkloadOptimizationStrategy and
 * delegates the executeOptimization() call to it. The strategy is injected at
 * runtime via dependency injection, allowing the optimization behavior to be
 * swapped without altering the dashboard controller or service code.
 *
 * Supported strategies:
 *   - MidSemesterBalancingStrategy  (mode: 'mid_semester')
 *   - EndSemesterAuditStrategy      (mode: 'end_semester')
 *
 * @module modules/optimization/WorkloadOptimizationContext
 */
import { MidSemesterBalancingStrategy } from './MidSemesterBalancingStrategy.js';
import { EndSemesterAuditStrategy } from './EndSemesterAuditStrategy.js';
import { WorkloadOptimizationStrategy } from './WorkloadOptimizationStrategy.js';

/**
 * Map of academic-phase mode keys to their corresponding strategy constructors.
 * Extend this map when new optimization profiles are introduced.
 */
const STRATEGY_REGISTRY = Object.freeze({
  mid_semester: MidSemesterBalancingStrategy,
  end_semester: EndSemesterAuditStrategy,
});

/** Default strategy applied when no explicit mode is specified. */
const DEFAULT_MODE = 'mid_semester';

export class WorkloadOptimizationContext {
  /**
   * @param {WorkloadOptimizationStrategy} [strategy] - Optional pre-built strategy instance.
   *   If omitted, the context resolves the strategy from the mode key.
   */
  constructor(strategy = null) {
    this._strategy = strategy;
  }

  /**
   * Replace the active strategy at runtime (dependency injection).
   *
   * @param {WorkloadOptimizationStrategy} strategy
   */
  setStrategy(strategy) {
    if (!(strategy instanceof WorkloadOptimizationStrategy)) {
      throw new TypeError(
        'strategy must be an instance of WorkloadOptimizationStrategy.',
      );
    }
    this._strategy = strategy;
  }

  /**
   * Resolve and set the strategy from a named academic-phase mode key.
   *
   * @param {string} [mode='mid_semester'] - One of the keys in STRATEGY_REGISTRY.
   * @throws {Error} If the provided mode key is not registered.
   */
  resolveStrategy(mode = DEFAULT_MODE) {
    const StrategyClass = STRATEGY_REGISTRY[mode];
    if (!StrategyClass) {
      const valid = Object.keys(STRATEGY_REGISTRY).join(', ');
      throw new Error(
        `Unknown optimization mode: "${mode}". Valid modes are: ${valid}.`,
      );
    }
    this._strategy = new StrategyClass();
  }

  /**
   * Execute the active strategy's optimization logic.
   *
   * @param {Object} workload - Workload snapshot from DashboardService.getInstructorWorkload().
   * @returns {Promise<Object>} The optimization result.
   * @throws {Error} If no strategy has been set.
   */
  async executeOptimization(workload) {
    if (!this._strategy) {
      throw new Error(
        'No strategy is set on WorkloadOptimizationContext. ' +
          'Call resolveStrategy(mode) or setStrategy(strategy) before executing.',
      );
    }
    return this._strategy.executeOptimization(workload);
  }

  /**
   * Returns the list of available strategy mode keys.
   *
   * @returns {string[]}
   */
  static getAvailableModes() {
    return Object.keys(STRATEGY_REGISTRY);
  }

  /**
   * Returns the active strategy's human-readable name, or null if none is set.
   *
   * @returns {string|null}
   */
  get activeStrategyName() {
    return this._strategy ? this._strategy.strategyName : null;
  }
}
