import '../../../styles/global.css';
export default function ErrorFlash({ message }) {
  return (
    <div className="card error-flash">
      <h3>⚠️ Action Failed</h3>
      <p>{message || "Unable to complete the action."}</p>
    </div>
  );
}
