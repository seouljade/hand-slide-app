/** 인식 설정. PRD 7장 제스처 명세의 기본값과 조절 범위를 따릅니다. 저장하지 않습니다. */
export interface RecognitionSettings {
  /** 동작을 이 시간(초) 유지해야 인식 */
  holdSec: number;
  /** 넘긴 뒤 이 시간(초) 동안 입력 무시 */
  cooldownSec: number;
  /** 엄지–손가락 끝 거리 / 손바닥 길이 가 이 값 미만이면 "붙임" */
  pinchRatio: number;
  /** 손목–손가락 끝 / 손목–손가락 뿌리 가 이 값을 넘으면 "펴짐" */
  extendRatio: number;
  /** 켜면 OK 사인에서 나머지 손가락 상태를 보지 않음 */
  relaxOk: boolean;
}

export const DEFAULT_SETTINGS: Readonly<RecognitionSettings> = Object.freeze({
  holdSec: 0.4,
  cooldownSec: 1.0,
  pinchRatio: 0.35,
  extendRatio: 1.45,
  relaxOk: false,
});

type NumericKey = Exclude<keyof RecognitionSettings, "relaxOk">;

export const SETTING_FIELDS: ReadonlyArray<{
  key: NumericKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  note?: string;
}> = [
  { key: "holdSec", label: "동작 유지 시간", min: 0.2, max: 1.0, step: 0.05, format: (v) => `${v.toFixed(2)}초` },
  { key: "cooldownSec", label: "재입력 대기", min: 0.5, max: 2.0, step: 0.1, format: (v) => `${v.toFixed(1)}초` },
  {
    key: "pinchRatio", label: "붙임 판정", min: 0.15, max: 0.6, step: 0.01,
    format: (v) => v.toFixed(2), note: "높을수록 덜 붙여도 인식합니다.",
  },
  {
    key: "extendRatio", label: "손가락 펴짐 기준", min: 1.1, max: 2.2, step: 0.05,
    format: (v) => v.toFixed(2), note: "낮을수록 덜 펴도 인식합니다.",
  },
];

export const TIMING = {
  /** "확정" 상태를 보여 주는 시간 */
  confirmFlashMs: 350,
  /** 한두 프레임 손 인식이 끊겨도 유지 중인 동작을 이어서 보는 시간 */
  dropoutGraceMs: 120,
  /** 같은 동작을 다시 인식하려면 손을 이 시간 이상 풀어야 함 */
  releaseMs: 150,
  /** 카메라 감시 주기와 판정 기준. 합쳐서 3초 안에 "꺼짐"을 표시 (F3-2) */
  watchdogMs: 500,
  cameraStallMs: 1500,
  cameraMutedMs: 1000,
  toastMs: 1100,
  signalMs: 700,
} as const;

export const SLIDE_LOG_LIMIT = 8;

const base = import.meta.env.BASE_URL;
export const ASSETS = {
  wasmBase: `${base}mediapipe/${__MEDIAPIPE_VERSION__}/wasm`,
  model: `${base}mediapipe/models/hand_landmarker-float16-v1.task`,
} as const;

export const LOGO_SRC: string = import.meta.env.VITE_LOGO_SRC ?? "";

/** PRD 8장 오류 안내 문구 */
export const MESSAGES = {
  cameraDenied: "카메라 권한이 꺼져 있습니다. 주소창의 카메라 아이콘에서 허용해 주세요.",
  cameraBusy: "다른 프로그램이 카메라를 쓰고 있습니다. 화상회의 등을 종료한 뒤 다시 점검하세요.",
  cameraNotFound: "연결된 카메라를 찾을 수 없습니다.",
  cameraInsecure: "보안 연결(https://)로 접속해야 카메라를 쓸 수 있습니다.",
  cameraUnknown: "카메라를 켤 수 없습니다. 브라우저를 다시 열어 보세요.",
  cameraLost: "카메라 연결이 끊겼습니다. 카메라 연결과 화상회의 등 다른 프로그램을 확인한 뒤 다시 켜 주세요.",
  network: "인터넷에 연결된 뒤 다시 점검해 주세요. 손 인식 파일을 한 번 내려받아야 합니다.",
  model: "손 인식 파일을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 점검해 주세요.",
  browser: "크롬 또는 엣지에서 열어 주세요.",
} as const;
