# MyLoveCat PWA 실행 확인 가이드

이 문서는 현재 작업 환경인 macOS와 iPhone에서 MyLoveCat PWA 결과물을 확인하는 방법을 정리한다.

## 핵심 요약

| 환경 | 추천 URL | 목적 |
|---|---|---|
| macOS 개발 확인 | `http://localhost:5173/` | 빠른 개발 확인 |
| macOS PWA 확인 | `http://localhost:4173/` | 빌드 결과, manifest, service worker 확인 |
| iPhone 같은 Wi-Fi 확인 | `http://192.168.0.8:4173/` | iPhone 화면/입력 UX 확인 |
| iPhone 실제 PWA 확인 | HTTPS 배포 URL 또는 HTTPS 터널 URL | 홈 화면 설치, 오프라인 캐시 확인 |

현재 Mac의 Wi-Fi IP는 `192.168.0.8`이다. Wi-Fi가 바뀌면 아래 명령으로 다시 확인한다.

```bash
ipconfig getifaddr en0
```

## 준비

```bash
npm install
```

## 1. macOS에서 개발 서버로 확인

개발 중 빠르게 확인할 때 사용한다.

```bash
npm run dev:lan
```

접속:

```text
http://localhost:5173/
```

주의:

- 이 경로는 개발 서버다.
- UI 확인에는 충분하다.
- service worker는 개발 모드에서 등록하지 않는다.
- PWA 설치/오프라인 캐시 확인은 아래 `preview:pwa`를 사용한다.

## 2. macOS에서 PWA 빌드 결과 확인

PWA 기능 확인은 프로덕션 빌드 프리뷰로 한다.

```bash
npm run preview:pwa
```

접속:

```text
http://localhost:4173/
```

확인할 것:

- 앱이 정상 로딩되는지
- 대표 이미지 업로드가 되는지
- 매일 기록이 IndexedDB에 저장되는지
- 새로고침 후 데이터가 유지되는지
- 브라우저를 오프라인으로 바꿔도 앱 shell이 열리는지

Chrome에서 설치 확인:

1. `http://localhost:4173/` 접속
2. 주소창 오른쪽의 설치 아이콘 또는 브라우저 메뉴에서 설치 선택
3. 설치된 앱을 실행
4. 독립 창으로 열리는지 확인

Safari에서 Dock 앱 확인:

1. Safari에서 `http://localhost:4173/` 접속
2. 공유 버튼 클릭
3. `Add to Dock` 선택
4. Dock 또는 Spotlight에서 MyLoveCat 실행

Apple은 macOS Sonoma 14부터 Safari 웹 앱을 Dock에 추가해 독립 앱처럼 사용할 수 있다고 안내한다.

## 3. iPhone에서 같은 Wi-Fi로 화면 확인

Mac과 iPhone이 같은 Wi-Fi에 있어야 한다.

Mac에서 실행:

```bash
npm run preview:pwa
```

iPhone Safari에서 접속:

```text
http://192.168.0.8:4173/
```

이 방식으로 확인 가능한 것:

- 모바일 레이아웃
- 단계형 입력 UX
- 고양이별 오늘 기록 카드
- 사진 업로드 UI
- 다크모드
- IndexedDB 저장 동작

제약:

- `http://192.168.0.8:4173/`는 HTTPS가 아니다.
- iPhone에서 service worker, 오프라인 캐시, 완전한 PWA 설치 동작은 제한될 수 있다.
- iPhone에서 홈 화면 설치까지 제대로 확인하려면 HTTPS가 필요하다.

## 4. iPhone에서 실제 PWA처럼 확인

iPhone에서 홈 화면 설치와 오프라인 캐시까지 확인하려면 HTTPS URL로 열어야 한다.

### 방법 A: 정적 배포

가장 안정적인 방법이다.

```bash
npm run build
```

생성물:

```text
dist/
```

`dist/`를 아래 중 하나에 배포한다.

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

배포 후 iPhone Safari에서 HTTPS URL 접속:

```text
https://your-domain.example/
```

홈 화면 추가:

1. iPhone Safari에서 배포 URL 접속
2. 공유 버튼 탭
3. `Add to Home Screen` 선택
4. 이름 확인 후 `Add`
5. 홈 화면의 MyLoveCat 아이콘으로 실행

Apple은 iPhone Safari에서 웹사이트 아이콘을 홈 화면에 추가할 수 있다고 안내한다.

### 방법 B: 임시 HTTPS 터널

배포 없이 iPhone에서 빠르게 PWA 설치를 확인하고 싶을 때 사용한다.

`cloudflared` 설치:

```bash
brew install cloudflared
```

프로덕션 프리뷰 실행:

```bash
npm run preview:pwa
```

다른 터미널에서 터널 실행:

```bash
cloudflared tunnel --url http://localhost:4173
```

출력되는 HTTPS URL 예:

```text
https://example-trycloudflare.trycloudflare.com
```

iPhone Safari에서 해당 HTTPS URL 접속 후 `Add to Home Screen`을 진행한다.

주의:

- 임시 터널 URL은 매번 바뀔 수 있다.
- PWA 데이터는 origin 단위로 저장된다.
- 즉 `localhost`, `192.168.0.8`, `trycloudflare.com`, 실제 배포 도메인은 서로 다른 저장소를 사용한다.

## 5. iPhone에서 확인해야 할 체크리스트

홈 화면 설치 후 아래를 확인한다.

- 홈 화면 아이콘이 표시되는지
- 실행 시 Safari 주소창 없이 독립 앱처럼 열리는지
- 고양이 프로필을 추가할 수 있는지
- 대표 이미지를 넣을 수 있는지
- 오늘 기록이 없는 고양이가 자동으로 선택되는지
- 모바일 단계형 입력이 보이는지
- 기본 기록 입력 후 저장되는지
- 확장 기록을 열어 구토, 체중, 약 복용을 입력할 수 있는지
- 특이사항 메모와 사진이 저장되는지
- 앱을 종료 후 다시 열어도 데이터가 유지되는지
- 비행기 모드 또는 네트워크 차단 상태에서 앱 shell이 열리는지

## 6. 데이터 저장 주의점

MyLoveCat은 현재 로그인 없이 기기 내부에 저장한다.

- IndexedDB를 우선 사용한다.
- IndexedDB가 차단되면 localStorage fallback을 사용한다.
- 데이터는 브라우저와 origin별로 분리된다.
- iPhone Safari, 홈 화면 앱, macOS Chrome은 서로 데이터를 공유하지 않는다.
- 중요한 테스트 데이터는 설정 화면에서 월간 JSON으로 내보내는 것이 좋다.

저장소 보호:

앱의 설정 화면에서 `저장소 보호`를 누르면 브라우저에 persistent storage를 요청한다. 브라우저가 허용하면 저장 공간 부족 상황에서 데이터가 임의 삭제될 가능성이 줄어든다.

## 참고

- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN window.indexedDB: https://developer.mozilla.org/en-US/docs/Web/API/Window/indexedDB
- web.dev Storage for the web: https://web.dev/articles/storage-for-the-web
- Apple Safari Web Apps on Mac: https://support.apple.com/104996
- Apple iPhone Home Screen Website Icon: https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios
