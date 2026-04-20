import logo from "../../assets/logo.png";

/**
 * Official mark — use in nav and auth. Sizes via className modifiers from theme.css.
 */
export default function BrandMark({ className = "", alt = "Rishihood University" }) {
  return <img src={logo} alt={alt} className={`brand-mark ${className}`.trim()} />;
}
