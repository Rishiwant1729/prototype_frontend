import api from "./axios";

/**
 * Dashboard Analytics API
 * All endpoints for the management dashboard
 */

// ============================================
// KPI ENDPOINTS
// ============================================

export const getCurrentOccupancy = () => api.get("/dashboard/occupancy");

export const getTodayVisitors = () => api.get("/dashboard/visitors/today");

export const getActiveEquipmentIssues = () => api.get("/dashboard/equipment/active");

export const getAverageVisitDuration = (startDate, endDate) =>
  api.get("/dashboard/duration", { params: { startDate, endDate } });

export const getScanCounts = (startDate, endDate) =>
  api.get("/dashboard/scans", { params: { startDate, endDate } });

// ============================================
// TIME SERIES ENDPOINTS
// ============================================

export const getOccupancyTimeSeries = (facility, startDate, endDate, granularity = "hourly") =>
  api.get("/dashboard/timeseries/occupancy", {
    params: { facility, startDate, endDate, granularity }
  });

export const getHourlyDistribution = (facility, startDate, endDate) =>
  api.get("/dashboard/timeseries/hourly", {
    params: { facility, startDate, endDate }
  });

export const getHeatmapData = (facility, startDate, endDate) =>
  api.get("/dashboard/heatmap", {
    params: { facility, startDate, endDate }
  });

// ============================================
// EVENTS & TABLES
// ============================================

export const getRecentEvents = (limit = 50, facility = null) =>
  api.get("/dashboard/events/recent", { params: { limit, facility } });

// ============================================
// ALERTS
// ============================================

export const getUnmatchedEntries = (olderThanHours = 4) =>
  api.get("/dashboard/alerts/unmatched", { params: { olderThanHours } });

export const getOverdueReturns = (olderThanHours = 24) =>
  api.get("/dashboard/alerts/overdue", { params: { olderThanHours } });

export const getAllAlerts = () => api.get("/dashboard/alerts");

// ============================================
// EXPORTS & REPORTS
// ============================================

export const getExportData = (facility, startDate, endDate, type = "events") =>
  api.get("/dashboard/export", {
    params: { facility, startDate, endDate, type }
  });

export const getDailySummary = (date) =>
  api.get("/dashboard/summary/daily", { params: { date } });

// ============================================
// COMBINED OVERVIEW
// ============================================

export const getDashboardOverview = () => api.get("/dashboard/overview");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert data to CSV format and download
 */
export const downloadCSV = (data, filename = "export.csv") => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export const formatDateISO = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

/**
 * Get date range for common periods
 */
export const getDateRange = (period) => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    default:
      break;
  }

  return {
    startDate: formatDateISO(start),
    endDate: formatDateISO(end)
  };
};
