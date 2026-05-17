import React from "react";

type IconProps = {
  size?: number;
  className?: string;
  color?: string;
};

/**
 * MyLoveCat 전용 고양이 감성 아이콘 세트
 * Lucide의 깔끔함과 고양이의 귀여움을 결합한 커스텀 SVG
 */

// 식욕 (고양이 밥그릇과 귀)
export const CatAppetiteIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 20h18" />
    <path d="M5 20a7 7 0 0 1 14 0" />
    <path d="M8 13.5c-.5-1.5-2-1.5-2.5 0" />
    <path d="M18.5 13.5c-.5-1.5-2-1.5-2.5 0" />
    <circle cx="12" cy="17" r="1" />
  </svg>
);

// 음수량 (물방울과 고양이 혀 느낌)
export const CatWaterIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    <path d="M9 15c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5" />
  </svg>
);

// 배변/소변 (화장실 삽과 발바닥)
export const CatLitterIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 3l9 9-4.5 4.5-9-9z" />
    <path d="M15 7l3 3" />
    <path d="M8 12c-1.5 1.5-4 1.5-5.5 0s-1.5-4 0-5.5" />
    <circle cx="18" cy="18" r="3" />
  </svg>
);

// 활동량 (노는 고양이 꼬리 느낌)
export const CatActivityIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    <path d="M18 5c1 1 3 1 4 0" />
    <path d="M19 8c.5.5 1.5.5 2 0" />
  </svg>
);

// 컨디션 (고양이 얼굴)
export const CatConditionIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 21c-4.5 0-8-3.5-8-8 0-1.5.5-3 1.5-4.5L7 4l3 3 2-1 2 1 3-3 1.5 4.5c1 1.5 1.5 3 1.5 4.5 0 4.5-3.5 8-8 8z" />
    <path d="M9 13h.01" />
    <path d="M15 13h.01" />
    <path d="M10 16c.5.5 1.5.5 2 0s1.5-.5 2 0" />
  </svg>
);

// 구토 (경고 표지판과 고양이 귀)
export const CatVomitIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M7 2h2" />
    <path d="M15 2h2" />
  </svg>
);

// 체중 (저울 위 고양이 발)
export const CatWeightIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M12 21V7" />
    <path d="M12 11c-1 0-2 .5-2 1.5s1 1.5 2 1.5 2 .5 2 1.5-1 1.5-2 1.5" />
    <path d="M7 4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2" />
  </svg>
);

// 약 복용 (알약과 발바닥)
export const CatMedIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
    <circle cx="5" cy="5" r="1" />
    <circle cx="19" cy="19" r="1" />
  </svg>
);
