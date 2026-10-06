import React from "react";

interface PanelProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  /** 見出し右端に置く補助表示（件数チップやボタンなど）。 */
  aside?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export default function Panel({
  title,
  icon,
  aside,
  className = "",
  bodyClassName = "",
  children,
}: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
          <h2 className="panel-title">
            {icon}
            {title}
          </h2>
          {aside}
        </header>
      )}
      <div className={`px-4 pb-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
