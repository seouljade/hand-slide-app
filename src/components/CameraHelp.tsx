import { useState } from "react";
import type { CameraIssue } from "../state/appState";

const CHROME_CAMERA_SETTINGS = "chrome://settings/content/camera";

interface Guide {
  title: string;
  steps: string[];
  /** 저절로 다시 연결되는지 알려 주는 한 줄 */
  auto?: string;
}

/** 카메라를 켤 수 없는 원인별로, 크롬·Windows 에서 해야 할 일을 순서대로 알려 줍니다. */
const GUIDES: Record<CameraIssue, Guide> = {
  denied: {
    title: "크롬에서 이 사이트의 카메라가 차단되어 있습니다",
    steps: [
      "주소창 왼쪽의 사이트 정보 아이콘(조절 막대 또는 자물쇠 모양)을 누릅니다.",
      "\"카메라\"를 \"허용\"으로 바꿉니다.",
      "카메라 항목이 안 보이면 아래 주소를 새 탭 주소창에 붙여 넣고, \"허용 안함\" 목록에서 이 사이트를 지웁니다.",
    ],
    auto: "허용으로 바꾸면 새로고침 없이 저절로 연결됩니다.",
  },
  dismissed: {
    title: "카메라 사용 요청이 닫혔습니다",
    steps: [
      "아래 \"카메라 켜기\"를 누릅니다.",
      "주소창 아래에 뜨는 창에서 \"사이트를 방문하는 동안 허용\" 또는 \"허용\"을 누릅니다.",
    ],
  },
  osBlocked: {
    title: "Windows 설정에서 카메라가 꺼져 있습니다",
    steps: [
      "아래 \"Windows 카메라 설정 열기\"를 누르고, 묻는 창이 뜨면 \"열기\"를 누릅니다.",
      "\"카메라 액세스\"를 켭니다.",
      "아래쪽 \"데스크톱 앱이 카메라에 액세스하도록 허용\"도 켭니다 (크롬은 데스크톱 앱입니다).",
      "노트북에 카메라 끄기 키(F키 줄의 카메라 모양)나 카메라 가림 덮개가 있으면 열어 둡니다.",
    ],
    auto: "설정을 켜면 몇 초 안에 저절로 다시 연결됩니다.",
  },
  busy: {
    title: "다른 프로그램이 카메라를 쓰고 있습니다",
    steps: [
      "Zoom, Teams, 카메라 앱 등 카메라를 쓰는 프로그램을 종료합니다.",
      "이 도구를 연 크롬 탭이 여러 개라면 하나만 남기고 닫습니다.",
    ],
    auto: "카메라가 풀리면 몇 초 안에 저절로 다시 연결됩니다.",
  },
  notFound: {
    title: "연결된 카메라를 찾을 수 없습니다",
    steps: [
      "외장 카메라라면 USB 연결을 확인합니다.",
      "노트북 카메라 끄기 키나 가림 덮개를 확인합니다.",
    ],
    auto: "카메라가 연결되면 저절로 다시 연결됩니다.",
  },
  insecure: {
    title: "보안 연결(https://)이 아니라서 카메라를 쓸 수 없습니다",
    steps: ["주소가 https:// 로 시작하는 배포 주소로 접속해 주세요."],
  },
  lost: {
    title: "카메라 연결이 끊겼습니다",
    steps: [
      "카메라 연결과 화상회의 등 다른 프로그램을 확인합니다.",
      "아래 \"카메라 다시 켜기\"를 누릅니다.",
    ],
    auto: "카메라가 돌아오면 몇 초 안에 저절로 다시 연결됩니다.",
  },
  unknown: {
    title: "카메라를 켤 수 없습니다",
    steps: ["크롬을 완전히 닫았다가 다시 열고 이 주소에 접속해 보세요."],
  },
};

interface Props {
  issue: CameraIssue;
  retrying: boolean;
  onRetry: () => void;
}

export function CameraHelp({ issue, retrying, onRetry }: Props) {
  const g = GUIDES[issue];
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CHROME_CAMERA_SETTINGS);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="cam-help">
      <div className="cam-help-title">● {g.title}</div>
      <ol className="cam-help-steps">
        {g.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      {issue === "denied" && (
        <div className="cam-help-copy">
          <code className="mono">{CHROME_CAMERA_SETTINGS}</code>
          <button type="button" className="btn small" onClick={copy}>{copied ? "복사됨 ✓" : "주소 복사"}</button>
        </div>
      )}
      {g.auto && <div className="cam-help-auto">↻ {g.auto}</div>}
      <div className="row cam-help-actions">
        {issue === "osBlocked" && (
          <a className="btn small" href="ms-settings:privacy-webcam">Windows 카메라 설정 열기</a>
        )}
        <button type="button" className="btn primary" onClick={onRetry} disabled={retrying}>
          {retrying ? "켜는 중…" : issue === "lost" ? "카메라 다시 켜기" : "카메라 켜기"}
        </button>
      </div>
    </div>
  );
}
