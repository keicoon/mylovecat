import { useEffect } from "react";
import type { ReactNode } from "react";
import { BookOpen, Cat, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { AdUnit } from "./components/AdUnit";

type PublicPath = "/about" | "/guide" | "/cat-health-log-template" | "/privacy" | "/terms";

const publicPaths = new Set<string>(["/about", "/guide", "/cat-health-log-template", "/privacy", "/terms"]);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function isPublicPath(path: string): path is PublicPath {
  return publicPaths.has(path);
}

function withBase(path: "/" | PublicPath) {
  const basePath = import.meta.env.BASE_URL;
  const directoryPath = path === "/" ? "/" : `${path}/`;

  if (basePath === "/") return directoryPath;

  const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return path === "/" ? `${cleanBasePath}/` : `${cleanBasePath}${directoryPath}`;
}

export default function PublicPages({ path }: { path: string }) {
  useAdSenseScript();

  const page = isPublicPath(path) ? path : "/about";

  return (
    <div className="public-shell">
      <PublicHeader />
      <main className="public-main">
        {page === "/about" ? <AboutPage /> : null}
        {page === "/guide" ? <GuidePage /> : null}
        {page === "/cat-health-log-template" ? <TemplatePage /> : null}
        {page === "/privacy" ? <PrivacyPage /> : null}
        {page === "/terms" ? <TermsPage /> : null}
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-brand" href={withBase("/")}>
        <span className="brand-mark">
          <Cat size={22} aria-hidden="true" />
        </span>
        <strong>MyLoveCat</strong>
      </a>
      <nav className="public-nav" aria-label="공개 페이지">
        <a href={withBase("/about")}>소개</a>
        <a href={withBase("/guide")}>기록 가이드</a>
        <a href={withBase("/cat-health-log-template")}>템플릿</a>
        <a href={withBase("/privacy")}>개인정보</a>
        <a href={withBase("/terms")}>약관</a>
        <a className="public-app-link" href={withBase("/")}>
          앱 열기
        </a>
      </nav>
    </header>
  );
}

function AboutPage() {
  return (
    <article className="public-page">
      <section className="public-hero">
        <p className="eyebrow">Cat health log PWA</p>
        <h1>고양이의 하루 상태를 빠르게 남기고 변화를 추적합니다.</h1>
        <p>
          MyLoveCat은 보호자가 매일 반복해서 기록할 수 있도록 만든 로컬 우선 고양이 건강 기록 앱입니다. 식욕,
          물 섭취, 배변, 소변, 활동량, 사료/간식, 컨디션 같은 기본 신호를 짧게 기록하고, 필요할 때만 구토,
          체중, 약 복용, 메모, 사진을 추가합니다.
        </p>
      </section>

      <AdUnit label="소개 페이지 광고 영역" />

      <section className="public-grid">
        <InfoCard icon={<ClipboardList />} title="빠른 기본 기록">
          매일 확인하는 항목은 선택형 입력으로 구성해 모바일에서도 짧은 시간 안에 기록할 수 있습니다.
        </InfoCard>
        <InfoCard icon={<HeartPulse />} title="이상 징후 추적">
          구토, 식욕 감소, 음수량 변화, 배변/소변 변화, 컨디션 저하 같은 신호를 날짜별로 되돌아볼 수 있습니다.
        </InfoCard>
        <InfoCard icon={<ShieldCheck />} title="로컬 우선 저장">
          로그인 없이 브라우저의 IndexedDB에 저장하며, 월간 JSON 파일로 백업할 수 있습니다.
        </InfoCard>
      </section>
    </article>
  );
}

function GuidePage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Daily guide</p>
        <h1>매일 기록하면 좋은 고양이 상태 항목</h1>
        <p>
          고양이는 컨디션 변화를 숨기는 경우가 많기 때문에, 보호자가 평소의 패턴을 알고 있는 것이 중요합니다.
          아래 항목은 진단이 아니라 보호자가 변화를 알아차리기 위한 생활 기록 기준입니다.
        </p>
      </section>

      <section className="content-stack">
        <GuideBlock title="기본 기록">
          식욕, 물 섭취, 배변, 소변, 활동량, 사료/간식, 컨디션은 매일 짧게 확인하기 좋습니다. 앱에서는 이
          항목들을 기본 입력으로 두어 반복 기록의 부담을 낮춥니다.
        </GuideBlock>
        <GuideBlock title="확장 기록">
          구토, 체중, 약 복용은 매일 모든 보호자가 입력해야 하는 항목은 아닙니다. 변화가 있거나 치료 중일 때
          확장 기록으로 남기는 방식이 적절합니다.
        </GuideBlock>
        <GuideBlock title="병원 상담 전">
          최근 며칠간의 식욕 변화, 구토 여부, 배변/소변 횟수, 체중, 사진, 메모를 함께 보면 증상이 언제부터
          시작됐는지 설명하기 쉬워집니다.
        </GuideBlock>
      </section>

      <AdUnit label="가이드 페이지 광고 영역" />
    </article>
  );
}

function TemplatePage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Template</p>
        <h1>고양이 건강 기록 템플릿</h1>
        <p>앱을 사용하지 않아도 아래 표를 기준으로 하루 기록을 만들 수 있습니다.</p>
      </section>

      <div className="public-table-wrap">
        <table className="public-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>기록 방식</th>
              <th>예시</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>식욕</td>
              <td>어제 대비</td>
              <td>감소 / 비슷 / 증가</td>
            </tr>
            <tr>
              <td>물 섭취</td>
              <td>어제 대비</td>
              <td>감소 / 비슷 / 증가</td>
            </tr>
            <tr>
              <td>배변</td>
              <td>덩어리 수</td>
              <td>0 / 1 / 2 / 3 / 4+</td>
            </tr>
            <tr>
              <td>소변</td>
              <td>덩어리 수</td>
              <td>0 / 1 / 2 / 3 / 4+</td>
            </tr>
            <tr>
              <td>컨디션</td>
              <td>보호자 관찰</td>
              <td>나쁨 / 보통 / 좋음</td>
            </tr>
            <tr>
              <td>특이사항</td>
              <td>필요 시 메모/사진</td>
              <td>구토, 식욕 저하, 숨기, 병원 방문</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdUnit label="템플릿 페이지 광고 영역" />
    </article>
  );
}

function PrivacyPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Privacy</p>
        <h1>개인정보 처리 안내</h1>
        <p>MyLoveCat은 현재 로그인 없는 로컬 우선 앱으로 설계되어 있습니다.</p>
      </section>

      <section className="content-stack">
        <GuideBlock title="로컬 저장">
          고양이 프로필, 일일 기록, 메모, 사진은 사용자의 브라우저 IndexedDB에 저장됩니다. 같은 기기라도
          브라우저나 도메인이 다르면 데이터가 공유되지 않습니다.
        </GuideBlock>
        <GuideBlock title="백업">
          사용자는 월간 JSON 파일로 데이터를 내보낼 수 있습니다. 내보낸 파일의 보관과 공유는 사용자 책임입니다.
        </GuideBlock>
        <GuideBlock title="광고와 쿠키">
          AdSense를 적용하는 경우 공개 콘텐츠 페이지에 Google 광고 스크립트가 로드될 수 있습니다. 이 경우
          Google 제품 사용으로 인한 쿠키, 웹 비콘, IP 주소 또는 기타 식별자 사용을 명확히 고지해야 합니다.
        </GuideBlock>
      </section>
    </article>
  );
}

function TermsPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Terms</p>
        <h1>이용 약관</h1>
        <p>MyLoveCat은 보호자의 기록을 돕는 도구이며 수의학적 진단을 대체하지 않습니다.</p>
      </section>

      <section className="content-stack">
        <GuideBlock title="의료 고지">
          앱의 기록, 그래프, 요약은 참고용입니다. 고양이에게 급격한 식욕 저하, 반복 구토, 배뇨 문제, 호흡
          이상, 심한 무기력 등이 있으면 수의사와 상담해야 합니다.
        </GuideBlock>
        <GuideBlock title="데이터 책임">
          현재 앱은 로그인 없이 기기 내부에 저장합니다. 브라우저 데이터 삭제, 기기 분실, 저장 공간 정리로
          데이터가 사라질 수 있으므로 중요한 기록은 JSON으로 백업해야 합니다.
        </GuideBlock>
        <GuideBlock title="광고 정책">
          광고가 적용되는 경우 광고는 공개 콘텐츠 페이지에 우선 배치하며, 개인 기록 입력 흐름을 방해하지 않는
          방향으로 운영합니다.
        </GuideBlock>
      </section>
    </article>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="public-card">
      <span>{icon}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

function GuideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="guide-block">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <a href={withBase("/about")}>소개</a>
      <a href={withBase("/privacy")}>개인정보</a>
      <a href={withBase("/terms")}>약관</a>
      <a href={withBase("/")}>앱 열기</a>
    </footer>
  );
}

function useAdSenseScript() {
  useEffect(() => {
    const client = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
    if (!client || !/^ca-pub-\d{16}$/.test(client) || document.getElementById("mylovecat-adsense")) return;

    const script = document.createElement("script");
    script.id = "mylovecat-adsense";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    document.head.appendChild(script);
  }, []);
}
