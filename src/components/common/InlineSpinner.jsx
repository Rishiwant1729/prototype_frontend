import React from "react";

export default function InlineSpinner({ size = 16, className = "", ...rest }) {
  return (
    <span
      className={`sk-inline-spinner ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      {...rest}
    />
  );
}

