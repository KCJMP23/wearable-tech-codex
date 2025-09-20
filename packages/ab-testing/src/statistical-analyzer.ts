import * as ss from 'simple-statistics';
import {
  VariantResult,
  MetricResult,
  ExperimentResults,
  StatisticalTest,
  StatisticalError,
  Metric,
  MetricType
} from './types.js';

export class StatisticalAnalyzer {
  private confidenceLevel: number;
  private minimumSampleSize: number;

  constructor(
    confidenceLevel: number = 0.95,
    minimumSampleSize: number = 100
  ) {
    this.confidenceLevel = confidenceLevel;
    this.minimumSampleSize = minimumSampleSize;
  }

  // Calculate statistical significance for conversion metrics
  public calculateSignificance(
    control: VariantResult,
    variant: VariantResult,
    metric: Metric,
    test: StatisticalTest = StatisticalTest.CHI_SQUARE
  ): {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: [number, number];
    uplift: number;
    upliftConfidenceInterval: [number, number];
    statisticalPower: number;
  } {
    switch (test) {
      case StatisticalTest.CHI_SQUARE:
        return this.chiSquareTest(control, variant, metric);
      case StatisticalTest.T_TEST:
        return this.tTest(control, variant, metric);
      case StatisticalTest.MANN_WHITNEY:
        return this.mannWhitneyTest(control, variant, metric);
      default:
        return this.chiSquareTest(control, variant, metric);
    }
  }

  private chiSquareTest(
    control: VariantResult,
    variant: VariantResult,
    metric: Metric
  ) {
    const controlConversions = control.metrics[metric.id]?.conversions || 0;
    const variantConversions = variant.metrics[metric.id]?.conversions || 0;
    const controlTotal = control.exposures;
    const variantTotal = variant.exposures;

    // Create contingency table
    const observed = [
      [controlConversions, controlTotal - controlConversions],
      [variantConversions, variantTotal - variantConversions]
    ];

    // Calculate expected values
    const total = controlTotal + variantTotal;
    const totalConversions = controlConversions + variantConversions;
    const totalNonConversions = total - totalConversions;

    const expected = [
      [
        (totalConversions * controlTotal) / total,
        (totalNonConversions * controlTotal) / total
      ],
      [
        (totalConversions * variantTotal) / total,
        (totalNonConversions * variantTotal) / total
      ]
    ];

    // Calculate chi-square statistic
    let chiSquare = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const o = observed[i][j];
        const e = expected[i][j];
        if (e > 0) {
          chiSquare += Math.pow(o - e, 2) / e;
        }
      }
    }

    // Calculate p-value (1 degree of freedom)
    const pValue = 1 - this.chiSquareCDF(chiSquare, 1);

    // Calculate conversion rates
    const controlRate = controlConversions / controlTotal;
    const variantRate = variantConversions / variantTotal;

    // Calculate uplift
    const uplift = ((variantRate - controlRate) / controlRate) * 100;

    // Calculate confidence intervals
    const controlCI = this.proportionConfidenceInterval(controlConversions, controlTotal);
    const variantCI = this.proportionConfidenceInterval(variantConversions, variantTotal);

    // Calculate uplift confidence interval
    const upliftCI = this.calculateUpliftCI(
      controlRate,
      variantRate,
      controlTotal,
      variantTotal
    );

    // Calculate statistical power
    const power = this.calculatePower(
      controlRate,
      variantRate,
      controlTotal,
      variantTotal
    );

    return {
      pValue,
      isSignificant: pValue < (1 - this.confidenceLevel),
      confidenceInterval: variantCI,
      uplift,
      upliftConfidenceInterval: upliftCI,
      statisticalPower: power
    };
  }

  private tTest(
    control: VariantResult,
    variant: VariantResult,
    metric: Metric
  ) {
    // For continuous metrics like revenue
    const controlValues = this.getMetricValues(control, metric);
    const variantValues = this.getMetricValues(variant, metric);

    if (controlValues.length < 2 || variantValues.length < 2) {
      throw new StatisticalError('Insufficient data for t-test');
    }

    // Calculate means and standard deviations
    const controlMean = ss.mean(controlValues);
    const variantMean = ss.mean(variantValues);
    const controlStd = ss.standardDeviation(controlValues);
    const variantStd = ss.standardDeviation(variantValues);

    // Welch's t-test (for unequal variances)
    const se = Math.sqrt(
      (controlStd * controlStd) / controlValues.length +
      (variantStd * variantStd) / variantValues.length
    );

    const tStatistic = (variantMean - controlMean) / se;

    // Calculate degrees of freedom (Welch-Satterthwaite equation)
    const df = this.welchSatterthwaiteDf(
      controlStd,
      variantStd,
      controlValues.length,
      variantValues.length
    );

    // Calculate p-value
    const pValue = 2 * (1 - this.tDistributionCDF(Math.abs(tStatistic), df));

    // Calculate confidence interval
    const criticalValue = this.tDistributionQuantile(1 - (1 - this.confidenceLevel) / 2, df);
    const marginOfError = criticalValue * se;
    const confidenceInterval: [number, number] = [
      variantMean - marginOfError,
      variantMean + marginOfError
    ];

    // Calculate uplift
    const uplift = ((variantMean - controlMean) / controlMean) * 100;

    // Calculate uplift confidence interval
    const upliftCI = this.calculateContinuousUpliftCI(
      controlMean,
      variantMean,
      controlStd,
      variantStd,
      controlValues.length,
      variantValues.length
    );

    // Calculate statistical power
    const power = this.calculateContinuousPower(
      controlMean,
      variantMean,
      controlStd,
      variantStd,
      controlValues.length,
      variantValues.length
    );

    return {
      pValue,
      isSignificant: pValue < (1 - this.confidenceLevel),
      confidenceInterval,
      uplift,
      upliftConfidenceInterval: upliftCI,
      statisticalPower: power
    };
  }

  private mannWhitneyTest(
    control: VariantResult,
    variant: VariantResult,
    metric: Metric
  ) {
    // Non-parametric test for non-normal distributions
    const controlValues = this.getMetricValues(control, metric);
    const variantValues = this.getMetricValues(variant, metric);

    if (controlValues.length < 2 || variantValues.length < 2) {
      throw new StatisticalError('Insufficient data for Mann-Whitney test');
    }

    // Combine and rank all values
    const combined = [
      ...controlValues.map(v => ({ value: v, group: 'control' })),
      ...variantValues.map(v => ({ value: v, group: 'variant' }))
    ].sort((a, b) => a.value - b.value);

    // Assign ranks (handling ties)
    const ranks = this.assignRanks(combined.map(c => c.value));
    combined.forEach((item, i) => {
      (item as any).rank = ranks[i];
    });

    // Calculate U statistics
    const controlRankSum = combined
      .filter(c => c.group === 'control')
      .reduce((sum, c) => sum + (c as any).rank, 0);

    const variantRankSum = combined
      .filter(c => c.group === 'variant')
      .reduce((sum, c) => sum + (c as any).rank, 0);

    const n1 = controlValues.length;
    const n2 = variantValues.length;

    const U1 = controlRankSum - (n1 * (n1 + 1)) / 2;
    const U2 = variantRankSum - (n2 * (n2 + 1)) / 2;
    const U = Math.min(U1, U2);

    // Calculate z-score for large samples
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (U - meanU) / stdU;

    // Calculate p-value
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // Calculate effect size (rank-biserial correlation)
    const effectSize = 1 - (2 * U) / (n1 * n2);

    // Calculate medians for uplift
    const controlMedian = ss.median(controlValues);
    const variantMedian = ss.median(variantValues);
    const uplift = ((variantMedian - controlMedian) / controlMedian) * 100;

    // Bootstrap confidence intervals
    const confidenceInterval = this.bootstrapConfidenceInterval(variantValues);
    const upliftCI = this.bootstrapUpliftCI(controlValues, variantValues);

    return {
      pValue,
      isSignificant: pValue < (1 - this.confidenceLevel),
      confidenceInterval,
      uplift,
      upliftConfidenceInterval: upliftCI,
      statisticalPower: Math.abs(effectSize) // Approximation
    };
  }

  // ANOVA for multiple variants
  public performANOVA(
    variants: VariantResult[],
    metric: Metric
  ): {
    fStatistic: number;
    pValue: number;
    isSignificant: boolean;
    etaSquared: number; // Effect size
  } {
    const groups = variants.map(v => this.getMetricValues(v, metric));
    
    if (groups.some(g => g.length < 2)) {
      throw new StatisticalError('Insufficient data for ANOVA');
    }

    // Calculate overall mean
    const allValues = groups.flat();
    const grandMean = ss.mean(allValues);
    const totalN = allValues.length;
    const k = groups.length;

    // Calculate sum of squares between groups (SSB)
    let ssb = 0;
    groups.forEach(group => {
      const groupMean = ss.mean(group);
      ssb += group.length * Math.pow(groupMean - grandMean, 2);
    });

    // Calculate sum of squares within groups (SSW)
    let ssw = 0;
    groups.forEach(group => {
      const groupMean = ss.mean(group);
      group.forEach(value => {
        ssw += Math.pow(value - groupMean, 2);
      });
    });

    // Calculate total sum of squares (SST)
    const sst = ssb + ssw;

    // Calculate degrees of freedom
    const dfBetween = k - 1;
    const dfWithin = totalN - k;

    // Calculate mean squares
    const msBetween = ssb / dfBetween;
    const msWithin = ssw / dfWithin;

    // Calculate F-statistic
    const fStatistic = msBetween / msWithin;

    // Calculate p-value
    const pValue = 1 - this.fDistributionCDF(fStatistic, dfBetween, dfWithin);

    // Calculate effect size (eta squared)
    const etaSquared = ssb / sst;

    return {
      fStatistic,
      pValue,
      isSignificant: pValue < (1 - this.confidenceLevel),
      etaSquared
    };
  }

  // Sample size calculation
  public calculateSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    power: number = 0.8,
    alpha: number = 0.05,
    twoTailed: boolean = true
  ): number {
    const zAlpha = twoTailed 
      ? this.normalQuantile(1 - alpha / 2)
      : this.normalQuantile(1 - alpha);
    const zBeta = this.normalQuantile(power);

    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);
    const pBar = (p1 + p2) / 2;

    const numerator = 2 * pBar * (1 - pBar) * Math.pow(zAlpha + zBeta, 2);
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
  }

  // Bayesian analysis
  public bayesianAnalysis(
    controlConversions: number,
    controlTotal: number,
    variantConversions: number,
    variantTotal: number,
    priorAlpha: number = 1,
    priorBeta: number = 1
  ): {
    probabilityVariantBetter: number;
    expectedLoss: number;
    credibleInterval: [number, number];
  } {
    // Beta distribution parameters (conjugate prior for binomial)
    const controlAlpha = priorAlpha + controlConversions;
    const controlBeta = priorBeta + controlTotal - controlConversions;
    const variantAlpha = priorAlpha + variantConversions;
    const variantBeta = priorBeta + variantTotal - variantConversions;

    // Monte Carlo simulation for probability calculation
    const samples = 100000;
    let variantWins = 0;
    let lossSum = 0;

    for (let i = 0; i < samples; i++) {
      const controlSample = this.betaSample(controlAlpha, controlBeta);
      const variantSample = this.betaSample(variantAlpha, variantBeta);
      
      if (variantSample > controlSample) {
        variantWins++;
      }
      
      lossSum += Math.max(0, controlSample - variantSample);
    }

    const probabilityVariantBetter = variantWins / samples;
    const expectedLoss = lossSum / samples;

    // Credible interval for variant
    const credibleInterval: [number, number] = [
      this.betaQuantile(0.025, variantAlpha, variantBeta),
      this.betaQuantile(0.975, variantAlpha, variantBeta)
    ];

    return {
      probabilityVariantBetter,
      expectedLoss,
      credibleInterval
    };
  }

  // Helper methods
  private proportionConfidenceInterval(
    successes: number,
    total: number
  ): [number, number] {
    const p = successes / total;
    const z = this.normalQuantile(1 - (1 - this.confidenceLevel) / 2);
    const se = Math.sqrt((p * (1 - p)) / total);
    
    return [
      Math.max(0, p - z * se),
      Math.min(1, p + z * se)
    ];
  }

  private calculateUpliftCI(
    controlRate: number,
    variantRate: number,
    controlN: number,
    variantN: number
  ): [number, number] {
    const uplift = (variantRate - controlRate) / controlRate;
    const varControl = (controlRate * (1 - controlRate)) / controlN;
    const varVariant = (variantRate * (1 - variantRate)) / variantN;
    
    // Delta method for variance of ratio
    const varUplift = (1 / (controlRate * controlRate)) * varVariant +
                      ((variantRate * variantRate) / Math.pow(controlRate, 4)) * varControl;
    
    const seUplift = Math.sqrt(varUplift);
    const z = this.normalQuantile(1 - (1 - this.confidenceLevel) / 2);
    
    return [
      (uplift - z * seUplift) * 100,
      (uplift + z * seUplift) * 100
    ];
  }

  private calculateContinuousUpliftCI(
    controlMean: number,
    variantMean: number,
    controlStd: number,
    variantStd: number,
    controlN: number,
    variantN: number
  ): [number, number] {
    const uplift = (variantMean - controlMean) / controlMean;
    
    // Delta method for variance
    const varControl = (controlStd * controlStd) / controlN;
    const varVariant = (variantStd * variantStd) / variantN;
    
    const varUplift = (1 / (controlMean * controlMean)) * varVariant +
                      ((variantMean * variantMean) / Math.pow(controlMean, 4)) * varControl;
    
    const seUplift = Math.sqrt(varUplift);
    const z = this.normalQuantile(1 - (1 - this.confidenceLevel) / 2);
    
    return [
      (uplift - z * seUplift) * 100,
      (uplift + z * seUplift) * 100
    ];
  }

  private calculatePower(
    controlRate: number,
    variantRate: number,
    controlN: number,
    variantN: number
  ): number {
    const pooledRate = (controlRate * controlN + variantRate * variantN) / (controlN + variantN);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlN + 1/variantN));
    const z = Math.abs(variantRate - controlRate) / se;
    const alpha = 1 - this.confidenceLevel;
    const zAlpha = this.normalQuantile(1 - alpha / 2);
    
    return this.normalCDF(z - zAlpha) + this.normalCDF(-z - zAlpha);
  }

  private calculateContinuousPower(
    controlMean: number,
    variantMean: number,
    controlStd: number,
    variantStd: number,
    controlN: number,
    variantN: number
  ): number {
    const effectSize = (variantMean - controlMean) / 
      Math.sqrt((controlStd * controlStd + variantStd * variantStd) / 2);
    
    const se = Math.sqrt((controlStd * controlStd) / controlN + 
                        (variantStd * variantStd) / variantN);
    
    const ncp = Math.abs(variantMean - controlMean) / se; // Non-centrality parameter
    const alpha = 1 - this.confidenceLevel;
    const criticalValue = this.normalQuantile(1 - alpha / 2);
    
    return this.normalCDF(ncp - criticalValue) + this.normalCDF(-ncp - criticalValue);
  }

  private getMetricValues(variant: VariantResult, metric: Metric): number[] {
    // This would fetch actual metric values from the database
    // For now, return mock data based on metric type
    const result = variant.metrics[metric.id];
    if (!result) return [];

    // Generate sample data based on conversions and conversion rate
    const samples: number[] = [];
    const n = variant.exposures;
    const conversions = result.conversions;
    
    if (metric.type === MetricType.REVENUE) {
      // Generate revenue values
      for (let i = 0; i < conversions; i++) {
        samples.push(50 + Math.random() * 200); // Mock revenue between $50-$250
      }
    } else {
      // Binary conversion data
      for (let i = 0; i < conversions; i++) samples.push(1);
      for (let i = 0; i < n - conversions; i++) samples.push(0);
    }

    return samples;
  }

  private assignRanks(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const ranks: number[] = new Array(values.length);
    
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j] === sorted[i]) j++;
      
      const rank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) {
        const index = values.indexOf(sorted[k]);
        ranks[index] = rank;
      }
      i = j;
    }
    
    return ranks;
  }

  private bootstrapConfidenceInterval(
    values: number[],
    iterations: number = 10000
  ): [number, number] {
    const bootstrapMeans: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const sample = this.bootstrapSample(values);
      bootstrapMeans.push(ss.mean(sample));
    }
    
    bootstrapMeans.sort((a, b) => a - b);
    const lower = bootstrapMeans[Math.floor(iterations * (1 - this.confidenceLevel) / 2)];
    const upper = bootstrapMeans[Math.floor(iterations * (1 + this.confidenceLevel) / 2)];
    
    return [lower, upper];
  }

  private bootstrapUpliftCI(
    controlValues: number[],
    variantValues: number[],
    iterations: number = 10000
  ): [number, number] {
    const uplifts: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const controlSample = this.bootstrapSample(controlValues);
      const variantSample = this.bootstrapSample(variantValues);
      const controlMean = ss.mean(controlSample);
      const variantMean = ss.mean(variantSample);
      const uplift = ((variantMean - controlMean) / controlMean) * 100;
      uplifts.push(uplift);
    }
    
    uplifts.sort((a, b) => a - b);
    const lower = uplifts[Math.floor(iterations * (1 - this.confidenceLevel) / 2)];
    const upper = uplifts[Math.floor(iterations * (1 + this.confidenceLevel) / 2)];
    
    return [lower, upper];
  }

  private bootstrapSample<T>(array: T[]): T[] {
    const sample: T[] = [];
    for (let i = 0; i < array.length; i++) {
      sample.push(array[Math.floor(Math.random() * array.length)]);
    }
    return sample;
  }

  private welchSatterthwaiteDf(
    s1: number,
    s2: number,
    n1: number,
    n2: number
  ): number {
    const v1 = s1 * s1 / n1;
    const v2 = s2 * s2 / n2;
    const numerator = Math.pow(v1 + v2, 2);
    const denominator = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
    return numerator / denominator;
  }

  // Statistical distribution functions
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private normalQuantile(p: number): number {
    // Approximate inverse normal CDF
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687,
               138.3577518672690, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866,
               66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838,
               -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996,
               3.754408661907416];

    const q = p < 0.5 ? p : 1 - p;
    const r = Math.sqrt(-2 * Math.log(q));

    let val: number;
    if (r <= 5) {
      val = (((((a[5] * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0]) /
            ((((b[4] * r + b[3]) * r + b[2]) * r + b[1]) * r + 1);
    } else {
      val = (((((c[5] * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0]) /
            (((d[3] * r + d[2]) * r + d[1]) * r + d[0] + 1);
    }

    return p < 0.5 ? -val : val;
  }

  private chiSquareCDF(x: number, df: number): number {
    return this.gammaIncomplete(df / 2, x / 2);
  }

  private tDistributionCDF(x: number, df: number): number {
    const a = df / (df + x * x);
    return 0.5 + 0.5 * this.betaIncomplete(a, df / 2, 0.5) * 
           (x > 0 ? 1 : -1);
  }

  private tDistributionQuantile(p: number, df: number): number {
    // Approximate t-distribution quantile
    const z = this.normalQuantile(p);
    const g1 = (z * z - 1) / 4;
    const g2 = (5 * z * z * z * z - 16 * z * z + 3) / 96;
    return z + g1 / df + g2 / (df * df);
  }

  private fDistributionCDF(x: number, df1: number, df2: number): number {
    const a = df1 * x / (df1 * x + df2);
    return this.betaIncomplete(a, df1 / 2, df2 / 2);
  }

  private betaSample(alpha: number, beta: number): number {
    // Generate beta-distributed random variable using gamma distribution
    const x = this.gammaSample(alpha);
    const y = this.gammaSample(beta);
    return x / (x + y);
  }

  private betaQuantile(p: number, alpha: number, beta: number): number {
    // Newton-Raphson method for beta quantile
    let x = p;
    for (let i = 0; i < 10; i++) {
      const pdf = Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
      const cdf = this.betaIncomplete(x, alpha, beta);
      x = x - (cdf - p) / pdf;
    }
    return x;
  }

  private gammaSample(shape: number): number {
    // Marsaglia and Tsang method
    if (shape < 1) {
      return this.gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      const z = this.normalSample();
      const v = Math.pow(1 + c * z, 3);
      const u = Math.random();
      
      if (u < 1 - 0.0331 * z * z * z * z) return d * v;
      if (Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  private normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private erf(x: number): number {
    // Error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * 
              Math.exp(-x * x);

    return sign * y;
  }

  private gammaIncomplete(a: number, x: number): number {
    // Incomplete gamma function
    if (x <= 0) return 0;
    if (x < a + 1) {
      // Series expansion
      let sum = 1 / a;
      let term = 1 / a;
      for (let i = 1; i < 100; i++) {
        term *= x / (a + i);
        sum += term;
        if (term < 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - this.logGamma(a));
    } else {
      // Continued fraction
      let b = x + 1 - a;
      let c = 1 / 1e-30;
      let d = 1 / b;
      let h = d;
      for (let i = 1; i < 100; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + an / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-10) break;
      }
      return 1 - Math.exp(-x + a * Math.log(x) - this.logGamma(a)) * h;
    }
  }

  private betaIncomplete(x: number, a: number, b: number): number {
    // Incomplete beta function
    if (x < 0 || x > 1) return NaN;
    if (x === 0 || x === 1) return x;

    const lbeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    
    if (x < (a + 1) / (a + b + 2)) {
      return Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) *
             this.betaContinuedFraction(x, a, b) / a;
    } else {
      return 1 - Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) *
             this.betaContinuedFraction(1 - x, b, a) / b;
    }
  }

  private betaContinuedFraction(x: number, a: number, b: number): number {
    const maxIterations = 100;
    const epsilon = 1e-10;
    
    let m = 1;
    let m2 = 2;
    let aa = a;
    let c = 1;
    let d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    let h = d;

    for (let i = 1; i <= maxIterations; i++) {
      m2 = 2 * i;
      aa = i * (b - i) * x / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < epsilon) d = epsilon;
      c = 1 + aa / c;
      if (Math.abs(c) < epsilon) c = epsilon;
      d = 1 / d;
      h *= d * c;
      aa = -(a + i) * (a + b + i) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d;
      if (Math.abs(d) < epsilon) d = epsilon;
      c = 1 + aa / c;
      if (Math.abs(c) < epsilon) c = epsilon;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < epsilon) break;
    }

    return h;
  }

  private logGamma(x: number): number {
    // Stirling's approximation
    const g = 7;
    const coef = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if (x < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - 
             this.logGamma(1 - x);
    }

    x--;
    let a = coef[0];
    for (let i = 1; i < g + 2; i++) {
      a += coef[i] / (x + i);
    }

    const t = x + g + 0.5;
    return Math.sqrt(2 * Math.PI) + Math.log(a) - t + (x + 0.5) * Math.log(t);
  }
}