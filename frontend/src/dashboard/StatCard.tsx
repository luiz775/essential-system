import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

export type StatCardProps = {
  title: string;
  value: string;
  interval: string;
  trend: "up" | "down" | "neutral";
  trendLabel: string;
  data: number[];
  labels: string[];
};

export function StatCard({
  title,
  value,
  interval,
  trend,
  trendLabel,
  data,
  labels,
}: StatCardProps) {
  const theme = useTheme();
  const trendColors = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    neutral: theme.palette.grey[500],
  };
  const chipColor = { up: "success", down: "error", neutral: "default" } as const;
  const chartColor = trendColors[trend];

  return (
    <Card variant="outlined" sx={{ height: "100%", flexGrow: 1 }}>
      <CardContent>
        <Typography component="h2" variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        <Stack sx={{ justifyContent: "space-between", gap: 1, flexGrow: 1 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4" component="p">
              {value}
            </Typography>
            <Chip size="small" color={chipColor[trend]} label={trendLabel} />
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {interval}
          </Typography>
          <Box sx={{ width: "100%", height: 50 }}>
            <SparkLineChart
              color={chartColor}
              data={data.length ? data : [0]}
              area
              showHighlight
              showTooltip
              xAxis={{ scaleType: "band", data: labels.length ? labels : ["—"] }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
