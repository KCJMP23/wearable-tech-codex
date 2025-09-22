export interface LogisticRegressionOptions {
  learningRate?: number;
  iterations?: number;
  l2?: number;
}

export interface LogisticRegressionState {
  weights: number[];
  bias: number;
}

/**
 * Lightweight logistic regression model with basic L2 regularisation.
 * Designed to avoid heavy external ML dependencies while keeping
 * deterministic behaviour for the optimizers.
 */
export class LogisticRegression {
  private weights: number[] = [];
  private bias = 0;
  private trained = false;
  private readonly options: Required<LogisticRegressionOptions>;

  constructor(options: LogisticRegressionOptions = {}) {
    this.options = {
      learningRate: options.learningRate ?? 0.1,
      iterations: options.iterations ?? 200,
      l2: options.l2 ?? 0.0
    };
  }

  public train(features: number[][], labels: number[]): void {
    if (!features.length || !features[0]?.length) {
      this.weights = [];
      this.bias = 0;
      this.trained = false;
      return;
    }

    const numFeatures = features[0].length;
    const { learningRate, iterations, l2 } = this.options;

    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    for (let iter = 0; iter < iterations; iter++) {
      const gradient = new Array(numFeatures).fill(0);
      let biasGradient = 0;

      for (let i = 0; i < features.length; i++) {
        const prediction = this.sigmoid(this.computeLogit(features[i]));
        const error = prediction - labels[i];

        for (let j = 0; j < numFeatures; j++) {
          gradient[j] += error * features[i][j];
        }
        biasGradient += error;
      }

      const sampleSize = features.length;
      for (let j = 0; j < numFeatures; j++) {
        const regularization = l2 * this.weights[j];
        const update = (gradient[j] / sampleSize) + regularization;
        this.weights[j] -= learningRate * update;
      }
      this.bias -= learningRate * (biasGradient / sampleSize);
    }

    this.trained = true;
  }

  public predict(features: number[][]): number[] {
    return features.map(feature => this.sigmoid(this.computeLogit(feature)));
  }

  public isTrained(): boolean {
    return this.trained;
  }

  public toJSON(): LogisticRegressionState {
    return {
      weights: [...this.weights],
      bias: this.bias
    };
  }

  public static fromJSON(
    state: LogisticRegressionState,
    options: LogisticRegressionOptions = {}
  ): LogisticRegression {
    const model = new LogisticRegression(options);
    model.weights = [...state.weights];
    model.bias = state.bias ?? 0;
    model.trained = model.weights.length > 0;
    return model;
  }

  private computeLogit(feature: number[]): number {
    if (!this.weights.length || feature.length !== this.weights.length) {
      return this.bias;
    }

    let sum = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i] * feature[i];
    }
    return sum;
  }

  private sigmoid(value: number): number {
    // Clamp to avoid floating point overflow for large magnitudes.
    const clamped = Math.min(Math.max(value, -30), 30);
    return 1 / (1 + Math.exp(-clamped));
  }
}
