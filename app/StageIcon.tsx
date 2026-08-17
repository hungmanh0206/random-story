type StageIconName =
  | "arrow-right"
  | "book-open"
  | "calendar"
  | "chart"
  | "check"
  | "chevron-down"
  | "clock"
  | "close"
  | "file-text"
  | "filter"
  | "layers"
  | "menu"
  | "message"
  | "progress"
  | "search"
  | "spark"
  | "story"
  | "users";

export function StageIcon({ name, className = "" }: { name: StageIconName; className?: string }) {
  return (
    <svg className={`stage-icon ${className}`.trim()} aria-hidden="true" focusable="false">
      <use href={`/design-system/icons.svg#stage-icon-${name}`} />
    </svg>
  );
}
