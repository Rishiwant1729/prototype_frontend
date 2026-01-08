import { useMemo } from "react";
import { 
  Dumbbell, 
  CircleDot, 
  Waves, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity
} from "lucide-react";

/**
 * FacilityAnalyticsCard
 * Analytics card showing past-day usage trend with line chart similar to score comparison
 */
export default function FacilityAnalyticsCard({ 
  facility, 
  data, 
  loading = false,
  currentCount = 0 
}) {
  
  const facilityConfig = {
    GYM: {
      name: "Gymnasium",
      icon: Dumbbell,
      color: "gym",
      lineColor: "#ff6b6b",
      gradient: "linear-gradient(135deg, #ff6b6b, #ee5a5a)"
    },
    BADMINTON: {
      name: "Badminton Court",
      icon: CircleDot,
      color: "badminton",
      lineColor: "#a78bfa",
      gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)"
    },
    SWIMMING: {
      name: "Swimming Pool",
      icon: Waves,
      color: "swimming",
      lineColor: "#4ecdc4",
      gradient: "linear-gradient(135deg, #4ecdc4, #44a08d)"
    }
  };

  const config = facilityConfig[facility] || facilityConfig.GYM;
  const IconComponent = config.icon;

  // Calculate analytics from data
  const analytics = useMemo(() => {
    // Generate hourly data from 6 AM to 6 PM (6, 8, 10, 12, 14, 16, 18) - 7 points
    const hours = [6, 8, 10, 12, 14, 16, 18];
    
    if (!data || !data.data || data.data.length === 0) {
      // Generate sample data for demo when no real data
      const samplePoints = hours.map(hour => ({
        hour: `${hour}:00`,
        hourNum: hour,
        entries: Math.floor(Math.random() * 20) + 5
      }));
      
      const maxVal = Math.max(...samplePoints.map(p => p.entries));
      const peakIdx = samplePoints.findIndex(p => p.entries === maxVal);
      
      return {
        totalEntries: samplePoints.reduce((sum, p) => sum + p.entries, 0),
        peakHour: samplePoints[peakIdx]?.hour || "--",
        peakCount: maxVal,
        trend: Math.floor(Math.random() * 30) - 10,
        chartPoints: samplePoints
      };
    }

    const points = data.data;
    
    // Map data to our hour slots
    const chartPoints = hours.map(hour => {
      const matchingPoint = points.find(p => {
        const pointHour = new Date(p.period || p.time).getHours();
        return pointHour === hour;
      });
      return {
        hour: `${hour}:00`,
        hourNum: hour,
        entries: matchingPoint?.entries || 0
      };
    });
    
    const totalEntries = chartPoints.reduce((sum, p) => sum + p.entries, 0);
    
    // Find peak hour
    let peakHour = "--";
    let peakCount = 0;
    chartPoints.forEach(p => {
      if (p.entries > peakCount) {
        peakCount = p.entries;
        peakHour = p.hour;
      }
    });

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(chartPoints.length / 2);
    const firstHalf = chartPoints.slice(0, midpoint).reduce((sum, p) => sum + p.entries, 0);
    const secondHalf = chartPoints.slice(midpoint).reduce((sum, p) => sum + p.entries, 0);
    const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    return { totalEntries, peakHour, peakCount, trend, chartPoints };
  }, [data]);

  // Render line chart similar to cricket score comparison
  const renderLineChart = () => {
    const { chartPoints } = analytics;
    if (chartPoints.length === 0) return null;

    const maxVal = Math.max(...chartPoints.map(p => p.entries), 1);
    const chartWidth = 320;
    const chartHeight = 160;
    const padding = { top: 30, right: 15, bottom: 30, left: 35 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    
    // Calculate points
    const points = chartPoints.map((p, i) => ({
      x: padding.left + (i / (chartPoints.length - 1)) * innerWidth,
      y: padding.top + innerHeight - (p.entries / maxVal) * innerHeight,
      value: p.entries,
      hour: p.hour
    }));

    // Create path
    const pathData = points.map((p, i) => 
      `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
    ).join(" ");

    // Y-axis labels (4 levels)
    const yLabels = [maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33), 0];

    return (
      <div className="trend-chart">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="trend-chart__svg"
        >
          {/* Grid lines */}
          {yLabels.map((label, i) => {
            const y = padding.top + (i / (yLabels.length - 1)) * innerHeight;
            return (
              <g key={i}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={chartWidth - padding.right} 
                  y2={y}
                  className="trend-chart__grid-line"
                />
                <text 
                  x={padding.left - 8} 
                  y={y + 4}
                  className="trend-chart__y-label"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Area fill under line */}
          <path 
            d={`${pathData} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`}
            fill={config.lineColor}
            fillOpacity="0.15"
          />

          {/* Main line */}
          <path 
            d={pathData}
            fill="none"
            stroke={config.lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points with values */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Point circle */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="5"
                fill={config.lineColor}
                stroke="white"
                strokeWidth="2"
              />
              {/* Value label above point */}
              <text 
                x={p.x} 
                y={p.y - 12}
                className="trend-chart__point-label"
                fill={config.lineColor}
              >
                {p.value}
              </text>
            </g>
          ))}

          {/* X-axis labels - show all time slots */}
          {points.map((p, i) => (
            <text 
              key={i}
              x={p.x} 
              y={chartHeight - 8}
              className="trend-chart__x-label"
            >
              {chartPoints[i]?.hour || ""}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  const getTrendIcon = () => {
    if (analytics.trend > 5) return <TrendingUp size={14} />;
    if (analytics.trend < -5) return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  const getTrendClass = () => {
    if (analytics.trend > 5) return "trend--up";
    if (analytics.trend < -5) return "trend--down";
    return "trend--neutral";
  };

  if (loading) {
    return (
      <div className={`facility-analytics-card facility-analytics-card--${config.color}`}>
        <div className="facility-analytics-card__loading">
          <div className="loading-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`facility-analytics-card facility-analytics-card--${config.color}`}>
      {/* Header */}
      <div className="facility-analytics-card__header">
        <div 
          className="facility-analytics-card__icon"
          style={{ background: config.gradient }}
        >
          <IconComponent size={18} />
        </div>
        <div className="facility-analytics-card__title">
          <span className="facility-analytics-card__name">{config.name}</span>
          <span className="facility-analytics-card__subtitle">Past 24 Hours</span>
        </div>
        <div className={`facility-analytics-card__trend ${getTrendClass()}`}>
          {getTrendIcon()}
          <span>{analytics.trend > 0 ? "+" : ""}{analytics.trend}%</span>
        </div>
      </div>

      {/* Line Chart */}
      <div className="facility-analytics-card__chart-container">
        {renderLineChart()}
      </div>

      {/* Footer Stats */}
      <div className="facility-analytics-card__footer">
        <div className="footer-stat">
          <span className="footer-stat__value">{analytics.totalEntries}</span>
          <span className="footer-stat__label">Total Entries</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat__value">{analytics.peakHour}</span>
          <span className="footer-stat__label">Peak Hour</span>
        </div>
        <div className="current-active-badge">
          <Activity size={12} />
          <span>{currentCount} active</span>
        </div>
      </div>
    </div>
  );
}
