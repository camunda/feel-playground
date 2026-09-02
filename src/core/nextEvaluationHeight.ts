export interface NextEvaluationHeightOptions {
  startHeight: number;
  minimum: number;
  maximum: number;
  openHeight: number | null;
  moved: boolean;
}

export function nextEvaluationHeight({
  startHeight,
  minimum,
  maximum,
  openHeight,
  moved
}: NextEvaluationHeightOptions): number {
  const height = moved
    ? startHeight
    : startHeight <= minimum
      ? openHeight ?? minimum
      : minimum;

  return Math.min(maximum, Math.max(minimum, height));
}