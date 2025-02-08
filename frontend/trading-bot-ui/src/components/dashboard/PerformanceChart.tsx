import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceData {
  timestamp: string;
  profit: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="success.main">
          Profit:{' '}
          {new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'USD',
          }).format(payload[0].value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box mb={2}>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={value =>
                new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#4caf50"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};
