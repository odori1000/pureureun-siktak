// ============================================================
// Site Content Configuration — 텍스트/데이터 관리
// ============================================================

export const SITE_CONFIG = {
  // 브랜드
  brandName: '푸르른 식탁',
  copyright: 'Copyrights © 2026 푸르른 식탁. All Rights Reserved.',

  // 히어로 섹션
  hero: {
    title: '오늘 가장 신선한 식탁',
    description:
      '복잡한 유통 과정 없이, 자연 그대로의 싱그러움을 집 앞까지 배달합니다.',
  },

  // 지표 (Metrics) 섹션
  metrics: [
    { title: '누적 신선 배송', value: '50,000+' },
    { title: '계약 산지', value: '120+' },
    { title: '당일 수확 배송률', value: '99%' },
    { title: '고객 만족도', value: '4.9/5' },
  ],

  // 푸터
  footer: {
    tagline:
      '더 신선하게, 더 투명하게.\n우리가 먹는 모든 채소에 진심을 담습니다.\n꼼꼼한 선별부터 친환경 패키징까지,\n푸르른 식탁이 지키는 건강한 원칙입니다.',
    companyInfo: [
      '주소: 경기도 오산시 OO로...',
      '통신판매업 신고번호: 제0000-경기오산-0000호',
      '대표: OOO, 상호명: 푸르른 식탁',
      '고객센터: 000-0000-0000',
      '이메일: support@yourdomain.com',
    ],
  },

  // 네비게이션
  nav: {
    links: [
      { label: 'Store', scrollMultiplier: 1 },
    ],
    downloadLabel: 'Contact',
  },
};
