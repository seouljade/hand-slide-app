import type { ReactNode } from "react";

interface Props {
  code: string;
  title: string;
  /** 제목 줄 오른쪽에 둘 요소 */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** 모서리 브래킷이 있는 전술 상황판 스타일 패널 */
export function Panel({ code, title, aside, className, children }: Props) {
  return (
    <section className={`panel${className ? ` ${className}` : ""}`} aria-label={title}>
      <div className="panel-head">
        <h2><span className="code">{code}</span> {title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
