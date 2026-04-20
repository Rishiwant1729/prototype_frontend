import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Generic shimmer block.
 * Use `radius="pill" | "md" | number` and size props to match the UI skeleton shape.
 */
export function SkeletonBlock({
  className,
  style,
  width,
  height,
  radius = "md",
  "aria-label": ariaLabel = "Loading",
  ...rest
}) {
  const borderRadius =
    radius === "pill" ? 999 : radius === "md" ? 12 : typeof radius === "number" ? radius : 12;

  return (
    <span
      className={cx("sk", "sk--block", className)}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
      role="status"
      aria-label={ariaLabel}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 2, lineHeight = 12, gap = 8, className }) {
  return (
    <div className={cx("sk-text", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? "62%" : "100%"}
          radius="pill"
          style={{ marginTop: i === 0 ? 0 : gap }}
        />
      ))}
    </div>
  );
}

export function StatCardSkeleton({ className }) {
  return (
    <div className={cx("sk-card", "sk-stat-card", className)} aria-hidden="true">
      <div className="sk-stat-card__top">
        <SkeletonBlock width={28} height={28} radius={8} />
        <SkeletonBlock width="55%" height={10} radius="pill" />
      </div>
      <SkeletonBlock width="70%" height={18} radius="pill" style={{ marginTop: 10 }} />
      <SkeletonBlock width="85%" height={10} radius="pill" style={{ marginTop: 8 }} />
    </div>
  );
}

export function ChartCardSkeleton({ height = 240, className }) {
  return (
    <div className={cx("sk-card", "sk-chart-card", className)} aria-hidden="true">
      <div className="sk-chart-card__head">
        <SkeletonBlock width={18} height={18} radius={6} />
        <SkeletonBlock width="42%" height={12} radius="pill" />
      </div>
      <SkeletonBlock width="75%" height={10} radius="pill" style={{ marginTop: 10 }} />
      <SkeletonBlock className="sk-chart-card__plot" width="100%" height={height} radius={12} />
      <div className="sk-chart-card__legend">
        <SkeletonBlock width={86} height={10} radius="pill" />
        <SkeletonBlock width={86} height={10} radius="pill" />
        <SkeletonBlock width={86} height={10} radius="pill" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5, className }) {
  return (
    <div className={cx("sk-table", className)} aria-hidden="true">
      <div className="sk-table__row sk-table__row--head">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height={10} width={`${Math.max(12, 22 - i * 2)}%`} radius="pill" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="sk-table__row">
          {Array.from({ length: cols }).map((__, c) => (
            <SkeletonBlock
              key={c}
              height={10}
              width={c === 0 ? "24%" : c === cols - 1 ? "16%" : "18%"}
              radius="pill"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, className }) {
  return (
    <div className={cx("sk-list", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-list__row">
          <SkeletonBlock width={28} height={28} radius={10} />
          <div className="sk-list__main">
            <SkeletonBlock width="70%" height={10} radius="pill" />
            <SkeletonBlock width="45%" height={10} radius="pill" style={{ marginTop: 8 }} />
          </div>
          <SkeletonBlock width={42} height={10} radius="pill" />
        </div>
      ))}
    </div>
  );
}

