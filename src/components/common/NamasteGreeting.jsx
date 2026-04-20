import handImg from "../../assets/hand.png";

/**
 * Namaste line + subtitle with hand mark (RishiVerse-style).
 */
export default function NamasteGreeting({
  userName,
  pageEmphasis = "Operations",
  variant = "default"
}) {
  const name = userName?.trim() || "there";
  const greetingMods =
    variant === "command" ? "app-shell__greeting app-shell__greeting--command" : "app-shell__greeting";

  return (
    <div
      className={`app-shell__greeting-cluster${variant === "command" ? " app-shell__greeting-cluster--command" : ""}`}
    >
      <span
        className="app-shell__namaste-hand-mask"
        style={{
          WebkitMaskImage: `url(${handImg})`,
          maskImage: `url(${handImg})`
        }}
        aria-hidden
      />
      <div className={greetingMods}>
        <span className="app-shell__greet-line">
          Namaste, <strong>{name}</strong>
        </span>
        <span className="app-shell__greet-sub">
          Welcome to <em>{pageEmphasis}</em>
        </span>
      </div>
    </div>
  );
}
