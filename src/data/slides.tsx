import type { ReactNode } from "react";

export interface SlideDef {
  title: string;
  cover?: boolean;
  body: ReactNode;
}

/** 가상의 "AI·무인체계 시대, 군수의 내일" 세미나 5장 (F2-5). 실제 기관 정보나 비공개 내용은 넣지 않습니다. */
export const SLIDES: readonly SlideDef[] = [
  {
    title: "표지",
    cover: true,
    body: (
      <>
        <div className="slide-stripe" />
        <div className="slide-kicker">과학기술 세미나 · 가상 샘플</div>
        <h3>AI·무인체계 시대,<br />군수의 내일</h3>
        <p className="slide-lead">
          손 제스처 슬라이드 넘김 도구 시연용 샘플 슬라이드입니다.<br />
          실제 기관 정보나 비공개 내용은 담지 않았습니다.
        </p>
      </>
    ),
  },
  {
    title: "왜 지금인가",
    body: (
      <>
        <div className="slide-kicker">01 · 배경</div>
        <h3>왜 지금인가</h3>
        <div className="slide-cols">
          <Card num="A" title="인력 구조 변화">같은 임무를 더 적은 인원으로 수행해야 합니다.</Card>
          <Card num="B" title="기술 성숙">센서, AI, 자율주행 기술이 현장에서 쓸 만해졌습니다.</Card>
          <Card num="C" title="작전 범위 확장">더 넓은 지역에 더 빨리 보급해야 합니다.</Card>
        </div>
      </>
    ),
  },
  {
    title: "핵심 기술",
    body: (
      <>
        <div className="slide-kicker">02 · 기술</div>
        <h3>핵심 기술 세 가지</h3>
        <div className="slide-cols">
          <Card num="TECH-1" title="예측 정비">고장 나기 전에 부품 교체 시점을 알려 줍니다.</Card>
          <Card num="TECH-2" title="자율 수송">무인 차량과 드론이 정해진 경로로 물자를 옮깁니다.</Card>
          <Card num="TECH-3" title="디지털 트윈">보급망을 가상 공간에서 먼저 시험해 봅니다.</Card>
        </div>
      </>
    ),
  },
  {
    title: "적용 시나리오",
    body: (
      <>
        <div className="slide-kicker">03 · 시나리오</div>
        <h3>적용 시나리오 (가상)</h3>
        <div className="slide-flow">
          {[
            ["수요 예측", "소모 추세 분석"],
            ["자동 청구", "부족 품목 알림"],
            ["무인 수송", "경로 자동 배정"],
            ["현장 확인", "수령·피드백"],
          ].map(([t, d], i) => (
            <div className="slide-flow-item" key={t}>
              {i > 0 && <span className="slide-flow-arrow" aria-hidden>▶</span>}
              <div className="slide-flow-step"><b>{t}</b><span>{d}</span></div>
            </div>
          ))}
        </div>
        <p className="slide-lead slide-gap">사람은 판단과 예외 처리에 집중하고, 반복 업무는 시스템이 맡습니다.</p>
      </>
    ),
  },
  {
    title: "맺음 · 질의응답",
    body: (
      <>
        <div className="slide-kicker">04 · 맺음</div>
        <h3>맺음</h3>
        <p className="slide-quote">사람은 <em>판단</em>에,<br />기계는 <em>반복</em>에.</p>
        <p className="slide-lead">질문을 받겠습니다. 감사합니다.</p>
      </>
    ),
  },
];

function Card({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <div className="slide-card">
      <div className="slide-card-num">{num}</div>
      <b>{title}</b>
      <span>{children}</span>
    </div>
  );
}
