/**
 * WorkloadOptimizationStrategy — Abstract base class for workload optimization strategies.
 *
 * Defines the Strategy Interface contract that all concrete optimization profiles
 * must implement. Each concrete strategy encapsulates a distinct set of business
 * rules for adviser workload balancing based on the current academic phase.
 *
 * @abstract
 * @module modules/optimization/WorkloadOptimizationStrategy
 */
export class WorkloadOptimizationStrategy {
  /**
   * Execute the optimization logic against the current workload snapshot.
   *
   * @abstract
   * @param {Object} workload - The current adviser workload snapshot from DashboardService.
   * @param {Array<Object>} workload.advisers - Sorted list of adviser workload objects.
   * @param {Object} workload.summary - Aggregate statistics (adviserCount, averageScore).
   * @returns {Promise<Object>} Optimization result conforming to WorkloadOptimizationResultSchema.
   * @throws {Error} If called on the abstract base class directly.
   */
  // eslint-disable-next-line no-unused-vars
  async executeOptimization(workload) {
    throw new Error(
      `executeOptimization() must be implemented by ${this.constructor.name}. ` +
        'Do not instantiate WorkloadOptimizationStrategy directly.',
    );
  }

  /**
   * Human-readable identifier for this strategy.
   * Concrete subclasses should override this getter.
   *
   * @returns {string}
   */
  get strategyName() {
    return 'WorkloadOptimizationStrategy';
  }
}
