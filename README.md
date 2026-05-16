# MyLoveCat

고양이의 하루 상태를 빠르게 기록하고, 기록된 변화를 캘린더/그래프/타임라인/표로 추적하는 PWA입니다.

## 실행

```bash
npm install
npm run dev
```

개발 서버:

```text
http://localhost:5173/
```

프로덕션 빌드:

```bash
npm run build
```

## 현재 구현 범위

- 여러 고양이 프로필 등록, 수정, 삭제
- 고양이 대표 이미지 업로드
- 날짜별 빠른 기록 입력
- radio/segmented control 기반 선택형 입력
- 부분 저장과 미입력 항목 안내
- `어제와 비슷하게` 빠른 입력
- 매일 기록의 특이사항 메모와 사진 첨부
- 모바일 단계형 기본 입력
- 구토/체중/약 복용 확장 기록 접기
- 캘린더 기록/주의 항목 표시
- 7일/30일/90일 추적 요약
- 체중 그래프, 타임라인, 테이블
- 사용자 지정 기록 알림 시간
- 시스템/라이트/다크 화면 모드
- 월간 JSON 내보내기/가져오기
- IndexedDB 기반 로컬 저장과 기존 localStorage 데이터 마이그레이션
- PWA manifest와 service worker

## 데이터

스키마 문서는 `docs/data-schema.md`에 있습니다.

## PWA 확인

macOS와 iPhone에서 확인하는 방법은 `docs/run-pwa-macos-iphone.md`에 있습니다.
