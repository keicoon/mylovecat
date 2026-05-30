import { useEffect } from "react";
import type { ReactNode } from "react";
import { BookOpen, Cat, ClipboardList, HeartPulse, ShieldCheck } from "lucide-react";
import { AdUnit } from "./components/AdUnit";

type PublicPath = "/" | "/guide" | "/cat-health-log-template" | "/privacy" | "/terms" | "/tips" | "/tips/water" | "/tips/litter" | "/tips/weight";

const publicPaths = new Set<string>(["/", "/guide", "/cat-health-log-template", "/privacy", "/terms", "/tips", "/tips/water", "/tips/litter", "/tips/weight"]);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function isPublicPath(path: string): path is PublicPath {
  return publicPaths.has(path);
}

function withBase(path: "/" | "/app" | PublicPath) {
  const basePath = import.meta.env.BASE_URL;
  const directoryPath = path === "/" ? "/" : `${path}/`;

  if (basePath === "/") return directoryPath;

  const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return path === "/" ? `${cleanBasePath}/` : `${cleanBasePath}${directoryPath}`;
}

export default function PublicPages({ path }: { path: string }) {
  useAdSenseScript();

  const page = isPublicPath(path) ? path : "/";

  return (
    <div className="public-shell">
      <PublicHeader />
      <main className="public-main">
        {page === "/" ? <HomePage /> : null}
        {page === "/guide" ? <GuidePage /> : null}
        {page === "/cat-health-log-template" ? <TemplatePage /> : null}
        {page === "/privacy" ? <PrivacyPage /> : null}
        {page === "/terms" ? <TermsPage /> : null}
        {page === "/tips" ? <TipsIndexPage /> : null}
        {page === "/tips/water" ? <TipWaterPage /> : null}
        {page === "/tips/litter" ? <TipLitterPage /> : null}
        {page === "/tips/weight" ? <TipWeightPage /> : null}
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
        <a href={withBase("/")}>소개</a>
        <a href={withBase("/guide")}>기록 가이드</a>
        <a href={withBase("/tips")}>건강 팁</a>
        <a href={withBase("/cat-health-log-template")}>템플릿</a>
        <a href={withBase("/privacy")}>개인정보</a>
        <a href={withBase("/terms")}>약관</a>
        <a className="public-app-link" href={withBase("/app")}>
          앱 열기
        </a>
      </nav>
    </header>
  );
}

function HomePage() {
  return (
    <article className="public-page">
      <section className="public-hero">
        <p className="eyebrow">Cat health log PWA</p>
        <h1>고양이의 하루 상태를 빠르게 남기고 변화를 추적합니다.</h1>
        <p>
          MyLoveCat은 보호자가 매일 반복해서 기록할 수 있도록 만든 로컬 우선 고양이 건강 기록 앱입니다.
          로그인이나 복잡한 설정 없이 브라우저에 바로 저장되며, 식욕, 물 섭취, 배변, 소변 등 중요한 건강 지표를 
          가장 직관적이고 빠르게 기록할 수 있습니다.
        </p>
        <p>
          매일 조금씩 쌓이는 기록은 고양이의 건강 상태를 대변하는 훌륭한 '가계부'가 됩니다.
          작은 변화도 놓치지 않도록, MyLoveCat과 함께 오늘부터 꾸준한 기록을 시작해 보세요.
        </p>
        <div style={{ marginTop: "2rem" }}>
          <a className="public-app-link" href={withBase("/app")} style={{ fontSize: "1.1rem", padding: "0.75rem 1.5rem" }}>
            무료로 앱 열기
          </a>
        </div>
      </section>

      <AdUnit label="소개 페이지 광고 영역 상단" />

      <section className="content-stack" style={{ marginTop: "3rem" }}>
        <GuideBlock title="기록의 중요성: 고양이는 아픈 티를 내지 않습니다">
          고양이는 야생의 본능이 남아있어, 어딘가 아프거나 불편해도 겉으로 잘 드러내지 않습니다. 
          따라서 매일 먹고 마시고 배설하는 패턴을 파악하고 미세한 변화를 빠르게 감지하는 것이 수명과 직결될 만큼 중요합니다.
          보호자의 관심 어린 관찰과 꾸준한 기록이 질병을 조기에 발견할 수 있는 가장 확실한 방법입니다.
        </GuideBlock>
        <GuideBlock title="앱 하나로 해결되는 건강 지표 관리">
          사료는 얼마나 먹었는지, 물은 평소처럼 마시는지, 화장실에 가는 횟수나 감자(소변 덩어리)와 맛동산(대변)의 상태는 어떤지. 
          이 모든 것을 종이 수첩에 적을 필요 없이 MyLoveCat을 통해 클릭 몇 번으로 간편하게 관리하세요. 
          필요시 구토 여부, 체중 변화, 약 복용 내역까지 함께 추적할 수 있습니다.
        </GuideBlock>
      </section>

      <section className="public-grid" style={{ marginTop: "3rem" }}>
        <InfoCard icon={<ClipboardList />} title="빠른 기본 기록">
          매일 확인하는 항목은 선택형 입력으로 구성해 모바일에서도 짧은 시간 안에 기록할 수 있습니다.
        </InfoCard>
        <InfoCard icon={<HeartPulse />} title="이상 징후 추적">
          구토, 식욕 감소, 음수량 변화, 배변/소변 변화, 컨디션 저하 같은 신호를 날짜별로 되돌아볼 수 있습니다.
        </InfoCard>
        <InfoCard icon={<ShieldCheck />} title="안전한 로컬 저장">
          개인정보 유출 걱정 없이 로그인 없이 브라우저의 IndexedDB에 안전하게 저장되며, 언제든 JSON 파일로 백업 가능합니다.
        </InfoCard>
      </section>

      <AdUnit label="소개 페이지 광고 영역 하단" />
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

function TipsIndexPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Cat Health Tips</p>
        <h1>고양이 건강 관리 팁</h1>
        <p>집사가 알아야 할 고양이 건강의 핵심 지표와 관리 방법을 소개합니다.</p>
      </section>

      <section className="public-grid">
        <InfoCard icon={<HeartPulse />} title="고양이 음수량 관리">
          <p>고양이에게 물 마시기가 왜 그토록 중요한지, 어떻게 늘릴 수 있는지 알아봅니다.</p>
          <a href={withBase("/tips/water")} className="public-app-link" style={{ marginTop: "1rem", display: "inline-block" }}>자세히 보기</a>
        </InfoCard>
        <InfoCard icon={<ShieldCheck />} title="화장실 모래와 배뇨/배변">
          <p>하부 요로계 질환(FLUTD)을 예방하는 올바른 화장실 환경에 대해 설명합니다.</p>
          <a href={withBase("/tips/litter")} className="public-app-link" style={{ marginTop: "1rem", display: "inline-block" }}>자세히 보기</a>
        </InfoCard>
        <InfoCard icon={<ClipboardList />} title="체중 감소가 보내는 위험 신호">
          <p>단순한 다이어트가 아닌, 질병으로 인한 체중 감소를 어떻게 파악하는지 알아봅니다.</p>
          <a href={withBase("/tips/weight")} className="public-app-link" style={{ marginTop: "1rem", display: "inline-block" }}>자세히 보기</a>
        </InfoCard>
      </section>
      
      <AdUnit label="건강 팁 목록 광고" />
    </article>
  );
}

function TipWaterPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Health Tip</p>
        <h1>고양이 음수량 늘리는 5가지 핵심 방법</h1>
      </section>

      <section className="content-stack">
        <p>
          고양이는 사막 태생의 조상을 두고 있어 본능적으로 갈증을 잘 느끼지 못합니다. 이로 인해 현대의 집냥이들은 만성적인 수분 부족 상태에 놓이기 쉽고, 이는 <strong>만성 신부전</strong>이나 <strong>하부 요로계 질환(FLUTD)</strong> 등 치명적인 질병으로 직결될 수 있습니다. 고양이의 하루 권장 음수량은 몸무게 1kg당 약 40~50ml입니다. (예: 5kg 고양이는 약 200~250ml)
        </p>
        
        <AdUnit label="음수량 아티클 상단 광고" />

        <GuideBlock title="1. 다양한 형태의 물그릇 제공">
          고양이마다 선호하는 물그릇의 재질(유리, 도자기, 스테인리스)과 형태(넓은 수반, 흐르는 정수기)가 다릅니다. 특히 수염이 그릇에 닿는 것을 싫어하는(Whisker fatigue) 고양이가 많으므로 넙적하고 얕은 유리 수반을 집안 곳곳 여러 군데에 배치하는 것이 가장 효과적입니다.
        </GuideBlock>
        
        <GuideBlock title="2. 신선한 물 자주 갈아주기">
          아무리 좋은 정수기나 그릇이라도 물이 신선하지 않으면 고양이는 마시지 않습니다. 하루에 최소 1~2회 이상 깨끗하게 씻은 그릇에 새로운 물을 떠주세요. 물 위에 먼지가 떠 있는 것만으로도 고양이는 발길을 돌릴 수 있습니다.
        </GuideBlock>
        
        <GuideBlock title="3. 습식 사료 급여">
          건사료는 수분 함량이 10% 미만이지만, 습식 사료(캔, 파우치)는 70~80%의 수분을 함유하고 있습니다. 자발적인 음수량이 턱없이 부족하다면 하루 한두 끼는 습식 사료로 대체하여 수분을 섭취할 수 있도록 유도하는 것이 좋습니다.
        </GuideBlock>
        
        <GuideBlock title="4. 츄르탕 등 수분 섭취 간식 활용">
          고양이가 좋아하는 간식(츄르)에 물을 타서 주는 일명 '츄르탕'이나 펫밀크, 닭가슴살 끓인 물 등을 제공하는 것도 좋은 방법입니다. 단, 너무 많은 간식은 비만이나 영양 불균형을 초래할 수 있으므로 하루 권장 칼로리의 10%를 넘지 않도록 주의해야 합니다.
        </GuideBlock>
        
        <GuideBlock title="5. 물그릇과 화장실/밥그릇의 분리">
          야생에서 고양이는 사냥한 먹이나 배설물 근처의 물은 오염되었다고 생각하여 마시지 않는 습성이 있습니다. 따라서 물그릇은 밥그릇과 거리를 두고, 화장실과는 최대한 멀리 떨어진 조용한 곳에 배치해야 합니다.
        </GuideBlock>
      </section>

      <AdUnit label="음수량 아티클 하단 광고" />
    </article>
  );
}

function TipLitterPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Health Tip</p>
        <h1>고양이 화장실 모래와 배뇨/배변 문제의 상관관계</h1>
      </section>

      <section className="content-stack">
        <p>
          고양이에게 화장실은 단순한 배설 장소가 아닌 삶의 질을 결정짓는 가장 중요한 공간 중 하나입니다. 화장실 환경이 마음에 들지 않으면 고양이는 배변을 참게 되고, 이는 방광염, 요도 폐색, 변비 등 심각한 질병을 유발하는 주요 원인이 됩니다.
        </p>

        <AdUnit label="화장실 아티클 상단 광고" />

        <GuideBlock title="모래의 종류와 선호도">
          고양이는 야생에서 부드러운 모래나 흙에 배설하고 덮는 본능이 있습니다. 따라서 대부분의 고양이는 입자가 고운 <strong>벤토나이트 모래</strong>를 가장 선호합니다. 두부 모래나 우드 펠렛 등은 보호자의 청소나 먼지 관리에는 편할지 몰라도, 고양이의 젤리(발바닥)에 자극을 주고 덮는 본능을 충족시켜주지 못해 스트레스의 원인이 될 수 있습니다.
        </GuideBlock>

        <GuideBlock title="화장실의 크기와 개수">
          화장실은 고양이가 들어가서 빙글빙글 돌 수 있을 만큼 충분히 커야 합니다. 이상적인 화장실의 길이는 고양이 몸길이(꼬리 제외)의 1.5배 이상입니다. 또한 다묘 가정의 경우 화장실의 개수는 <strong>'고양이 수 + 1'</strong>개가 기본 원칙입니다. 화장실이 부족하면 영역 다툼이나 스트레스로 인한 배뇨 실수가 발생할 수 있습니다.
        </GuideBlock>

        <GuideBlock title="청결 유지의 중요성">
          고양이는 후각이 매우 발달하여 더러운 화장실을 극도로 싫어합니다. 하루에 최소 2회 이상 감자(소변)와 맛동산(대변)을 치워주고, 2~4주에 한 번은 모래를 전체 갈이 하며 화장실 통을 물로 깨끗하게 씻어주어야 합니다. 잔존하는 냄새가 방광염을 유발하는 스트레스 요인이 됩니다.
        </GuideBlock>

        <GuideBlock title="배설물 상태 체크 (가계부 기록)">
          화장실을 청소할 때 배설물의 상태를 확인하는 것은 필수입니다. 소변 덩어리(감자)의 크기가 평소보다 너무 작고 여러 개로 쪼개져 있거나, 대변이 너무 딱딱하고 건조하다면 즉시 건강 상태를 의심해야 합니다. <strong>MyLoveCat</strong>과 같은 기록 앱을 활용하여 매일 감자와 맛동산의 개수를 기록하면 이러한 이상 징후를 조기에 발견할 수 있습니다.
        </GuideBlock>
      </section>

      <AdUnit label="화장실 아티클 하단 광고" />
    </article>
  );
}

function TipWeightPage() {
  return (
    <article className="public-page">
      <section className="public-hero compact">
        <p className="eyebrow">Health Tip</p>
        <h1>고양이 체중 감소가 보내는 위험 신호 3가지</h1>
      </section>

      <section className="content-stack">
        <p>
          고양이의 비만도 큰 문제지만, 의도하지 않은 <strong>급격한 체중 감소</strong>는 매우 심각한 질병의 명백한 신호입니다. 고양이는 털 때문에 육안으로 체중 변화를 파악하기 어려우므로, 정기적으로 체중을 측정하고 기록하는 습관이 중요합니다. 평소 체중의 10% 이상이 갑자기 빠진다면 즉시 수의사의 진단을 받아야 합니다.
        </p>

        <AdUnit label="체중 아티클 상단 광고" />

        <GuideBlock title="1. 식욕 부진과 동반된 체중 감소">
          고양이가 밥을 먹지 않아 체중이 빠진다면 가장 직관적인 위험 신호입니다. 구내염이나 치주질환 등 치과 질환으로 인해 씹는 것에 통증을 느끼거나, 위장관계 염증, 혹은 췌장염 등 극심한 통증을 유발하는 질병이 원인일 수 있습니다. 특히 뚱뚱한 고양이가 2~3일 이상 굶어 체중이 급감하면 치명적인 <strong>지방간</strong>이 발생할 수 있어 응급 상황입니다.
        </GuideBlock>

        <GuideBlock title="2. 식욕이 정상(또는 폭발)인데 체중이 감소하는 경우">
          밥을 평소처럼 먹거나 오히려 더 많이 먹는데도 살이 빠진다면 <strong>갑상선 기능 항진증</strong>이나 <strong>당뇨병</strong>을 의심해야 합니다. 
          <ul>
            <li><strong>갑상선 기능 항진증:</strong> 노령묘에게 흔하며, 대사율이 비정상적으로 높아져 에너지를 과도하게 소모합니다. 활동량이 비정상적으로 많아지고 밤에 우는 증상이 동반될 수 있습니다.</li>
            <li><strong>당뇨병:</strong> 몸 안의 포도당을 제대로 활용하지 못해 소변으로 당이 빠져나가며 체중이 감소합니다. 물을 비정상적으로 많이 마시고(다음), 소변량이 크게 증가하는(다뇨) 증상이 함께 나타납니다.</li>
          </ul>
        </GuideBlock>

        <GuideBlock title="3. 신장 질환 (만성 신부전)">
          고양이의 사망 원인 1위를 다투는 만성 신부전 역시 체중 감소를 유발합니다. 신장 기능이 서서히 망가지면서 몸 안의 독소를 배출하지 못해 요독증이 발생하고, 이로 인한 메스꺼움과 구토, 식욕 저하가 체중 감소로 이어집니다. 신부전 역시 초기에는 다음/다뇨 증상이 먼저 나타나는 경우가 많습니다.
        </GuideBlock>

        <GuideBlock title="정기적인 체중 모니터링">
          질병을 조기에 발견하기 위해 적어도 한 달에 한 번, 노령묘나 질환묘의 경우 1~2주에 한 번은 동일한 체중계를 이용해 몸무게를 재야 합니다. 가정용 유아 체중계나 펫 체중계를 활용하고, <strong>MyLoveCat</strong> 앱의 체중 추적 기능을 통해 미세한 하향 곡선이 그려지지 않는지 주기적으로 확인하세요.
        </GuideBlock>
      </section>

      <AdUnit label="체중 아티클 하단 광고" />
    </article>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <a href={withBase("/")}>소개</a>
      <a href={withBase("/tips")}>건강 팁</a>
      <a href={withBase("/privacy")}>개인정보</a>
      <a href={withBase("/terms")}>약관</a>
      <a href={withBase("/app")}>앱 열기</a>
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
