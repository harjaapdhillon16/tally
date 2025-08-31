import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface ChartData {
  chartData: Array<{ name: string; [key: string]: any }>;
  pieData: Array<{ name: string; value: number; color: string }>;
  trendData: Array<{ day: number; amount: number }>;
}

interface ChartsSectionProps {
  data: ChartData;
  timeRange: '30d' | '90d';
  trendDeltaPct: number;
  onTimeRangeChange: (range: '30d' | '90d') => void;
  onChartHover: (chart: 'inout' | 'top5' | 'trend') => void;
}

export function ChartsSection({ 
  data, 
  timeRange, 
  trendDeltaPct,
  onTimeRangeChange, 
  onChartHover 
}: ChartsSectionProps) {
  return (
    <>
      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Cash In/Out Bar Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cash Flow</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === '30d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimeRangeChange('30d')}
                >
                  30d
                </Button>
                <Button
                  variant={timeRange === '90d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onTimeRangeChange('90d')}
                >
                  90d
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className="h-[300px]"
              onMouseEnter={() => onChartHover('inout')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                  <Bar dataKey={timeRange} fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Expenses Donut */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Expenses (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="h-[250px]"
              onMouseEnter={() => onChartHover('top5')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.pieData.slice(0, 3).map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <span>${entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Sparkline */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Spending Trend</CardTitle>
          <CardDescription>
            Your spending pattern over the last 7 days
            <Badge variant="outline" className="ml-2">
              {trendDeltaPct > 0 ? '+' : ''}
              {trendDeltaPct}% vs last month
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="h-[200px]"
            onMouseEnter={() => onChartHover('trend')}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData}>
                <XAxis dataKey="day" />
                <YAxis hide />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Amount']} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}