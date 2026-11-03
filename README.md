# 손 제스처 슬라이드 넘김 도구

발표자가 노트북 카메라 앞에서 손 동작만으로 슬라이드를 넘기는 웹 앱입니다. PRD v0.2의 1단계(샘플 슬라이드 시뮬레이션)를 구현했습니다.

- **다음**: 엄지와 검지를 붙이고 나머지 세 손가락은 폄 (OK 사인)
- **이전**: 엄지와 새끼손가락을 붙이고 나머지 세 손가락은 폄
- 0.4초 유지해야 인식하고, 넘긴 뒤 1초는 입력을 무시합니다. 둘 다 화면에서 조절할 수 있습니다.

## 구조

정적 파일로만 이루어진 앱입니다. 서버 코드, 계정, 데이터베이스가 없고 카메라 영상은 브라우저 밖으로 나가지 않습니다.

| 경로 | 내용 |
| --- | --- |
| `src/lib/gesture.ts` | 손 관절 21개로 넘김 동작 판정 |
| `src/lib/engine.ts` | 유지 시간·재입력 대기·손 풀기 처리 (시간을 주입받는 순수 로직) |
| `src/lib/camera.ts` | 카메라 열기, 오류 분류, 끊김 감시 |
| `src/lib/handTracker.ts` | MediaPipe 손 인식기 (필요할 때만 불러옴, GPU 실패 시 CPU) |
| `src/lib/runtime.ts` | 위 모듈을 묶어 프레임마다 처리하고 화면에 바뀐 값만 알림 |
| `src/state/appState.ts` | 화면 상태 리듀서 (점검, 슬라이드 이동, 이벤트 기록) |
| `src/screens/` | 준비 화면, 발표 시뮬레이션 화면 |
| `src/data/slides.tsx` | 샘플 슬라이드 5장 |
| `scripts/fetch-assets.mjs` | MediaPipe wasm 복사, 손 인식 모델 다운로드와 SHA-256 확인 |
| `deploy/headers.ts` | 보안·캐시 헤더의 단일 출처 (`vite preview`와 `vercel.json`에 사용) |
| `src/lib/supabase.ts` | Supabase 연결 자리 (1단계는 사용하지 않음) |
| `.github/workflows/ci.yml` | 푸시·PR마다 타입 검사, 린트, 테스트, 빌드 |
| `public/sw.js` | 오프라인 지원 서비스 워커 |

손 인식 라이브러리, wasm, 모델(약 8MB)을 모두 앱 서버에서 직접 내려줍니다. 외부 CDN에 의존하지 않으므로 콘텐츠 보안 정책(CSP)을 `'self'`로 좁게 둘 수 있습니다. 한 번 접속해 점검을 마친 노트북은 이후 인터넷 없이도 도구를 열 수 있습니다.

## 개발

Node.js 22.18 이상이 필요합니다.

```bash
npm install
npm run dev
```

처음 실행할 때 `scripts/fetch-assets.mjs`가 손 인식 모델을 내려받습니다(인터넷 필요).

카메라 없이 화면을 확인하려면 주소 뒤에 `?sim=1`을 붙입니다. 오른쪽 아래 패널에서 가상 손 모양을 고르고 카메라 끊김을 흉내 낼 수 있습니다.

```bash
npm run check   # 타입 검사 + 린트 + 단위 테스트
npm run build   # dist/ 에 배포 파일 생성
npm run preview # 배포와 같은 보안 헤더로 dist/ 확인 (http://localhost:4173)
```

## 배포 (GitHub + Vercel + Supabase)

GitHub에 코드를 올리면 Vercel이 자동으로 빌드·배포하는 구조입니다. Supabase는 연결 자리만 만들어 두었습니다.

```
GitHub (main) ──push──▶ GitHub Actions: 검사·테스트·빌드
      │
      └───────────────▶ Vercel: npm ci → npm run build → dist/ 배포 (HTTPS, vercel.json 헤더)
                                    ┆
                          Supabase (선택, 지금은 미사용)
```

### 1. GitHub

이 폴더를 저장소로 올립니다. 푸시하면 `.github/workflows/ci.yml`이 검사를 돌립니다.

### 2. Vercel

1. vercel.com에서 GitHub 계정으로 로그인하고 **Add New → Project**에서 이 저장소를 가져옵니다.
2. 설정은 `vercel.json`에 들어 있으므로 그대로 **Deploy**를 누릅니다 (Framework: Vite, Build: `npm run build`, Output: `dist`).
3. 이후 `main`에 푸시하면 운영 주소에, 다른 브랜치·PR은 미리보기 주소에 자동 배포됩니다.

`vercel.json`은 `deploy/headers.ts`로부터 만들어집니다. 헤더를 바꾸면 `npm run gen:vercel`을 실행하고, 둘이 다르면 테스트가 실패합니다. 특히 `Permissions-Policy: camera=(self)`와 CSP의 `'wasm-unsafe-eval'`(손 인식 wasm 실행에 필요)을 빼면 도구가 동작하지 않습니다.

카메라는 HTTPS에서만 켜지며, Vercel 주소는 기본으로 HTTPS입니다.

### 3. Supabase (선택)

1단계는 데이터를 저장하지 않습니다(PRD 3장). 나중에 리허설 기록 등을 저장하게 되면:

1. supabase.com에서 프로젝트를 만듭니다.
2. **Project Settings → API**의 Project URL과 anon key를 Vercel **Settings → Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`로 넣고 다시 배포합니다.
3. 코드에서 `getSupabase()`(`src/lib/supabase.ts`)로 클라이언트를 받아 씁니다. 테이블에는 반드시 RLS(행 수준 보안)를 켭니다.

anon key는 브라우저에 공개되는 키입니다. `service_role` 키는 어떤 환경 변수에도 넣지 않습니다. 보안 정책은 `*.supabase.co`로의 통신만 미리 허용해 두었습니다.

### 환경 변수

| 이름 | 내용 |
| --- | --- |
| `VITE_LOGO_SRC` | 머리글에 표시할 부대 로고 경로. 이미지를 `public/`에 넣고 경로를 적습니다(예: `/logo.png`). 비워 두면 로고 자리만 표시합니다. 공식 로고·엠블럼은 사용 승인을 확인한 뒤 넣습니다. |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 주소 (선택) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (선택) |

로컬에서는 `.env.example`을 `.env`로 복사해 씁니다(`.env`는 저장소에 올라가지 않습니다).

### 손 인식 모델 갱신

모델 파일은 `scripts/fetch-assets.mjs`의 SHA-256 값과 일치해야 빌드됩니다. 모델을 바꿀 때는 새 파일의 해시로 이 값을 갱신하고, 파일 이름(버전)도 바꿔 이전 캐시와 겹치지 않게 합니다. MediaPipe 패키지를 올리면 wasm 경로(`/mediapipe/<버전>/`)는 자동으로 바뀝니다.

## 시험 현황

- 단위 테스트 38개: 동작 판정, 유지·재입력 대기, 카메라 오류 분류, 브라우저 판정, 화면 상태, vercel.json 일치
- 배포 빌드(`npm run preview`, CSP 적용)에서 확인: 실제 MediaPipe 모델 로딩(GPU), 카메라 권한 거부 안내, 가상 손으로 연습·넘김·오작동 무시·카메라 꺼짐과 복귀·미리보기 숨김, 서비스 워커의 오프라인 저장
- **아직 못 한 것**: 실제 웹캠과 실제 손으로 시험. 첫 리허설에서 "인식 설정"의 인식 값을 보며 붙임 판정과 펴짐 기준을 맞춰야 합니다 (PRD 완료 기준 2·3).

## 알려진 제약

- 브라우저 탭이 화면에 보이지 않으면(최소화, 다른 탭) 브라우저가 화면 갱신을 멈추므로 인식도 멈춥니다. 1단계는 도구 화면을 띄워 둔 채 발표하는 것을 전제로 합니다. PowerPoint를 앞에 띄우는 사용은 2단계에서 다룹니다.
- 개발용 도구(eslint 등)에 `npm audit` 경고가 있으나 배포 결과물에는 포함되지 않습니다(`npm audit --omit=dev`는 0건).
