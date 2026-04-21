'use client';

import React from 'react';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/line-chart';
import { TrendingUp, Zap, Target } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';

interface ProgressDataPoint {
  id: string; // Unique identifier for React keys
  date: string;
  wpm: number;
  accuracy: number;
  time: string;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  currentWpm?: number;
  currentAccuracy?: number;
  wpmChange?: number;
  accuracyChange?: number;
}

// Chart configuration for WPM
const wpmChartConfig = {
  wpm: {
    label: 'WPM',
    color: '#00BFFF', // ZenType primary blue
  },
} satisfies ChartConfig;

// Chart configuration for Accuracy
const accuracyChartConfig = {
  accuracy: {
    label: 'Accuracy',
    color: '#5D3FD3', // ZenType secondary purple
  },
} satisfies ChartConfig;

// Custom Tooltip for WPM
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ProgressDataPoint;
  }>;
  label?: string;
}

const CustomWpmTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <div className="text-sm text-muted-foreground mb-1">{data.date}</div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00BFFF]" />
          <div className="text-base font-bold">{data.wpm} WPM</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{data.time}</div>
      </div>
    );
  }
  return null;
};

const CustomAccuracyTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <div className="text-sm text-muted-foreground mb-1">{data.date}</div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#5D3FD3]" />
          <div className="text-base font-bold">{data.accuracy}% Accuracy</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{data.time}</div>
      </div>
    );
  }
  return null;
};

export default function ProgressChart({
  data,
  currentWpm = 0,
  currentAccuracy = 0,
  wpmChange = 0,
  accuracyChange = 0,
}: ProgressChartProps) {
  // Calculate statistics
  const highWpm = data.length > 0 ? Math.max(...data.map((d) => d.wpm)) : 0;
  const lowWpm = data.length > 0 ? Math.min(...data.map((d) => d.wpm)) : 0;
  const highAccuracy = data.length > 0 ? Math.max(...data.map((d) => d.accuracy)) : 0;
  const lowAccuracy = data.length > 0 ? Math.min(...data.map((d) => d.accuracy)) : 0;

  // Show empty state if no data
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-muted/40 rounded-lg flex items-center justify-center mx-auto">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">No progress data yet</p>
            <p className="text-muted-foreground text-xs">Take more tests to see your progress chart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* WPM Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00BFFF]" />
            <h3 className="text-lg font-semibold text-foreground">Words Per Minute</h3>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              High: <span className="text-[#00BFFF] font-medium">{highWpm}</span>
            </span>
            <span>
              Low: <span className="text-[#00BFFF] font-medium">{lowWpm}</span>
            </span>
            {wpmChange !== 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className={`w-3 h-3 ${wpmChange > 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={wpmChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {wpmChange > 0 ? '+' : ''}
                  {wpmChange.toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        </div>

        <ChartContainer
          config={wpmChartConfig}
          className="h-64 w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
        >
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 10,
              left: 5,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#00BFFF" stopOpacity={0} />
              </linearGradient>
              <filter id="wpmShadow" x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="4" dy="6" stdDeviation="25" floodColor="rgba(0, 191, 255, 0.9)" />
              </filter>
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.8)" />
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="4 8"
              stroke="var(--input)"
              strokeOpacity={1}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#00BFFF' }}
              tickMargin={15}
              interval="preserveStartEnd"
              tickCount={5}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#00BFFF' }}
              tickMargin={15}
            />

            <ChartTooltip
              content={<CustomWpmTooltip />}
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }}
            />

            <Line
              type="monotone"
              dataKey="wpm"
              stroke="#00BFFF"
              strokeWidth={2}
              filter="url(#wpmShadow)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                // Highlight max and min points
                if (payload.wpm === highWpm || payload.wpm === lowWpm) {
                  return (
                    <circle
                      key={`wpm-dot-${payload.id}`}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#00BFFF"
                      stroke="white"
                      strokeWidth={2}
                      filter="url(#dotShadow)"
                    />
                  );
                }
                return <g key={`wpm-dot-${payload.id}`} />;
              }}
              activeDot={{
                r: 6,
                fill: '#00BFFF',
                stroke: 'white',
                strokeWidth: 2,
                filter: 'url(#dotShadow)',
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Accuracy Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#5D3FD3]" />
            <h3 className="text-lg font-semibold text-foreground">Accuracy</h3>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              High: <span className="text-[#5D3FD3] font-medium">{highAccuracy}%</span>
            </span>
            <span>
              Low: <span className="text-[#5D3FD3] font-medium">{lowAccuracy}%</span>
            </span>
            {accuracyChange !== 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className={`w-3 h-3 ${accuracyChange > 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={accuracyChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {accuracyChange > 0 ? '+' : ''}
                  {accuracyChange.toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        </div>

        <ChartContainer
          config={accuracyChartConfig}
          className="h-64 w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
        >
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 10,
              left: 5,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5D3FD3" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#5D3FD3" stopOpacity={0} />
              </linearGradient>
              <filter id="accuracyShadow" x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="4" dy="6" stdDeviation="25" floodColor="rgba(93, 63, 211, 0.9)" />
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="4 8"
              stroke="var(--input)"
              strokeOpacity={1}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#5D3FD3' }}
              tickMargin={15}
              interval="preserveStartEnd"
              tickCount={5}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#5D3FD3' }}
              tickMargin={15}
              domain={[0, 100]}
            />

            <ChartTooltip
              content={<CustomAccuracyTooltip />}
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }}
            />

            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#5D3FD3"
              strokeWidth={2}
              filter="url(#accuracyShadow)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                // Highlight max and min points
                if (payload.accuracy === highAccuracy || payload.accuracy === lowAccuracy) {
                  return (
                    <circle
                      key={`accuracy-dot-${payload.id}`}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#5D3FD3"
                      stroke="white"
                      strokeWidth={2}
                      filter="url(#dotShadow)"
                    />
                  );
                }
                return <g key={`accuracy-dot-${payload.id}`} />;
              }}
              activeDot={{
                r: 6,
                fill: '#5D3FD3',
                stroke: 'white',
                strokeWidth: 2,
                filter: 'url(#dotShadow)',
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
