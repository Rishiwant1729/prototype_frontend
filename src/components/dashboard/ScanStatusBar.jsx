export default function ScanStatusBar({ busy }) {
  return (
    <div className="scan-status">
      {busy ? "🟡 Processing scan…" : "🟢 Ready for scan"}
    </div>
  );
}

