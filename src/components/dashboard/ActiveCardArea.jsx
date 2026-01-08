import IssueCard from "./cards/IssueCard";
import ReturnCard from "./cards/ReturnCard";
import ProcessingCard from "./cards/ProcessingCard";
import ErrorFlash from "./cards/ErrorFlash";
import SuccessCard from "./cards/SuccessCard";

export default function ActiveCardArea({ activeCard, onAction }) {
  if (!activeCard) return <p>Waiting for scan…</p>;

  switch (activeCard.type) {
    case "PROCESSING":
      return <ProcessingCard />;

    case "ENTRY":
      return (
        <IssueCard
          payload={activeCard.payload}
          onConfirm={(items) =>
            onAction("ISSUE_CONFIRM", items)
          }
        />
      );

    case "EXIT":
      return <ReturnCard payload={activeCard.payload} onConfirm={onAction} />;

    case "REJECTED":
      return <ErrorFlash message={activeCard.reason} />;

    case "SUCCESS":
      return <SuccessCard message={activeCard.payload?.message} />;

    default:
      return <ErrorFlash message="Unknown action" />;
  }
}
