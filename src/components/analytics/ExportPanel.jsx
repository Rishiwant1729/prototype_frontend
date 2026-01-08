import { useState } from "react";
import { getExportData, downloadCSV } from "../../api/dashboard_api";
import { 
  Download, 
  FileSpreadsheet, 
  Package, 
  DoorOpen,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  Check
} from "lucide-react";

export default function ExportPanel({ facility, dateRange }) {
  const [exportType, setExportType] = useState("events");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const exportTypes = [
    { value: "events", label: "Entry/Exit Events", icon: DoorOpen },
    { value: "equipment", label: "Equipment Records", icon: Package }
  ];

  const handleExport = async (format = "csv") => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await getExportData(
        facility,
        dateRange.startDate,
        dateRange.endDate,
        exportType
      );

      const data = response.data;

      if (!data || data.length === 0) {
        setError("No data to export for the selected filters");
        return;
      }

      // Generate filename
      const filename = `${exportType}_${facility || "all"}_${dateRange.startDate}_to_${dateRange.endDate}.csv`;

      // Download as CSV
      downloadCSV(data, filename);
      setSuccess(true);
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-panel">
      <div className="export-panel__header">
        <div className="export-panel__header-icon">
          <Download size={20} strokeWidth={2} />
        </div>
        <h3 className="export-panel__title">Export Data</h3>
      </div>
      
      <div className="export-panel__options">
        <div className="export-panel__type-selector">
          {exportTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                className={`export-panel__type-btn ${exportType === type.value ? "export-panel__type-btn--active" : ""}`}
                onClick={() => setExportType(type.value)}
              >
                <div className="export-panel__type-icon">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <span className="export-panel__type-label">{type.label}</span>
                {exportType === type.value && (
                  <div className="export-panel__type-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="export-panel__info">
          <div className="export-panel__info-item">
            <div className="export-panel__info-icon">
              <Building2 size={14} strokeWidth={2} />
            </div>
            <span className="export-panel__info-label">Facility:</span>
            <span className="export-panel__info-value">{facility || "All Facilities"}</span>
          </div>
          <div className="export-panel__info-item">
            <div className="export-panel__info-icon">
              <Calendar size={14} strokeWidth={2} />
            </div>
            <span className="export-panel__info-label">Date Range:</span>
            <span className="export-panel__info-value">
              {dateRange.startDate} → {dateRange.endDate}
            </span>
          </div>
        </div>

        {error && (
          <div className="export-panel__error">
            <AlertCircle size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="export-panel__success">
            <Check size={16} strokeWidth={2} />
            <span>Export downloaded successfully!</span>
          </div>
        )}

        <div className="export-panel__actions">
          <button
            className="export-panel__btn export-panel__btn--primary"
            onClick={() => handleExport("csv")}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="export-panel__spinner" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} strokeWidth={2} />
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
