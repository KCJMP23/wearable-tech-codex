import type { InsightCard } from '@affiliate-factory/sdk';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Button } from './Button';

interface InsightsPanelProps {
  insights: InsightCard[];
  onAction?: (insight: InsightCard) => void;
}

export function InsightsPanel({ insights, onAction }: InsightsPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => (
        <Card key={insight.id} className="h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <CardTitle>{insight.headline}</CardTitle>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {insight.kpi}
            </span>
          </CardHeader>
          <CardContent>
            <CardDescription>{insight.body}</CardDescription>
            <p className="text-sm font-medium text-neutral-800">
              {insight.window}: <span className="text-amber-600">{insight.value.toLocaleString()}</span>
            </p>
          </CardContent>
          {insight.action && onAction ? (
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => onAction(insight)}>
                {insight.actionLabel ?? 'Take action'}
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
