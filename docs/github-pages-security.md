# GitHub Pages Deploy and Frontend Security

이 문서는 MyLoveCat을 GitHub Pages로 배포할 때의 설정, 코드 노출 범위, API 키 관리 기준을 정리합니다.

## 결론

GitHub Pages 배포는 가능합니다. 현재 앱은 로그인 없는 로컬 우선 PWA이고 서버 비밀값이 필요하지 않기 때문에 정적 호스팅과 잘 맞습니다.

다만 GitHub Pages는 정적 파일 호스팅입니다. 브라우저로 내려가는 JavaScript, HTML, CSS, 이미지, manifest, service worker는 사용자가 열람할 수 있습니다. minify와 uglify는 코드 읽기를 어렵게 하고 용량을 줄이는 수단이지, 비밀값을 숨기는 보안 수단이 아닙니다.

## 배포 URL 기준

GitHub Pages에는 두 가지 배포 형태가 있습니다.

| 형태 | 예시 URL | Vite base |
|---|---|---|
| 사용자/조직 페이지 또는 커스텀 도메인 | `https://<user>.github.io/`, `https://mycat.example.com/` | `/` |
| 프로젝트 페이지 | `https://<user>.github.io/mylovecat/` | `/mylovecat/` |

현재 저장소에는 프로젝트 페이지 기준 빌드 스크립트를 추가했습니다.

```bash
npm run build:pages
```

이 명령은 다음을 수행합니다.

- `VITE_BASE_PATH=/mylovecat/`로 Vite 빌드
- GitHub Pages 새로고침/직접 진입 대응용 `dist/404.html` 생성
- PWA manifest, service worker, 아이콘, 공개 페이지 링크가 `/mylovecat/` 하위 경로에서 동작하도록 구성

커스텀 도메인을 붙일 경우에는 기본 빌드를 사용하면 됩니다.

```bash
npm run build
```

## GitHub Actions 배포

`.github/workflows/deploy-pages.yml`을 추가했습니다.

GitHub에서 필요한 설정:

1. Repository `Settings -> Pages`로 이동
2. `Build and deployment -> Source`를 `GitHub Actions`로 선택
3. `master` 또는 `main`에 push
4. Actions 완료 후 Pages URL 확인

AdSense 값을 넣고 싶다면 repository secrets에 아래 이름으로 등록합니다.

```text
VITE_ADSENSE_CLIENT
VITE_ADSENSE_SLOT_CONTENT
```

## Minify / Uglify 기준

`vite.config.ts`에 프로덕션 빌드 설정을 명시했습니다.

- `build.minify: "oxc"`
- `build.sourcemap: false`
- production mode에서 `console`과 `debugger` 제거

Vite 프로덕션 빌드는 번들링과 minify를 수행합니다. source map을 만들지 않으면 원본 TypeScript/React 구조를 DevTools에서 바로 복원하기 어렵습니다.

주의할 점:

- minify는 보안 장벽이 아닙니다.
- 브라우저에서 실행되어야 하는 코드는 결국 다운로드됩니다.
- 진짜 비밀값은 프론트엔드 번들에 포함하면 안 됩니다.

## API Key 관리 원칙

### 프론트에 넣어도 되는 값

다음 값은 비밀값으로 보지 않습니다.

- AdSense publisher/client id
- AdSense ad slot id
- 공개 지도/분석 도구의 browser key 중 도메인 제한이 걸린 값

이 값도 오남용을 줄이기 위해 공급자 콘솔에서 도메인 제한을 설정하는 것이 좋습니다.

### 프론트에 넣으면 안 되는 값

다음 값은 절대 `VITE_*`, `.env`, React 코드, GitHub Pages 빌드에 넣으면 안 됩니다.

- 서버 API secret
- OpenAI API key 같은 과금형 secret
- 관리자 토큰
- DB 접속 문자열
- OAuth client secret
- 결제 secret key

Vite의 `VITE_*` 환경 변수는 빌드 결과물에 포함될 수 있습니다. GitHub Actions secret에 저장해도 프론트 코드에서 사용하면 최종 JavaScript에 노출됩니다.

## 비밀 API가 필요한 경우의 구조

GitHub Pages만으로는 서버 secret을 안전하게 보관할 수 없습니다. 비밀 API 호출이 필요해지면 아래 중 하나를 추가해야 합니다.

| 선택지 | 용도 |
|---|---|
| Cloudflare Workers | 가벼운 API proxy, 도메인 제어, 저비용 운영 |
| Vercel Functions | Vercel 정적 배포와 함께 서버리스 API 운영 |
| Netlify Functions | Netlify 정적 배포와 함께 서버리스 API 운영 |
| 별도 백엔드 | 로그인, 동기화, 결제, 수의사 공유 기능이 커질 때 |

권장 구조:

```text
PWA frontend -> serverless/backend -> secret API
```

프론트엔드는 우리 서버의 공개 endpoint만 호출하고, secret key는 serverless/backend 환경 변수에만 둡니다.

## AdSense 기준

현재 앱은 공개 콘텐츠 페이지에만 광고 슬롯을 준비했습니다.

- `/about`
- `/guide`
- `/cat-health-log-template`
- `/privacy`
- `/terms`

개인 기록 입력 화면에는 초기 광고를 넣지 않는 편이 좋습니다. 반복 입력 UX를 해치지 않고, 건강 기록이라는 민감한 맥락에서 광고가 과하게 보이지 않게 하기 위함입니다.

AdSense 적용 전 확인:

- HTTPS 배포 URL 준비
- 개인정보/약관 페이지 공개
- Google 광고와 쿠키 고지 보강
- AdSense에서 사이트 승인
- 광고가 콘텐츠를 덮거나 클릭을 유도하지 않도록 배치

## 로컬 확인

루트 도메인 배포 기준:

```bash
npm run build
npm run preview:pwa
```

GitHub Pages 프로젝트 페이지 기준:

```bash
npm run build:pages
npm run preview:pages
```

preview 서버는 운영 서버가 아니라 빌드 결과 확인용입니다.
