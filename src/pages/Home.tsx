import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { VIDEO_URLS } from '../config/videos';
import { SITE_CONFIG } from '../config/content';
import type { TossProduct } from '../lib/toss';
import { 
  getAllProducts, 
  initializeProducts, 
  type ProductDetail 
} from '../lib/productService';
import { useCart } from '../context/CartContext';



const INITIAL_PRODUCTS: Omit<ProductDetail, 'id'>[] = [
  {
    tossId: 'connect-ai-basic-kr',
    name: '양상추',
    description: '수경재배로 키운 흙 묻지 않은 깨끗하고 아삭한 프리미엄 양상추',
    image: '🥬',
    price: 3000,
    options: [
      { name: '양상추 12수 개별포장 (18,000원)', priceOffset: 6000 },
      { name: '양상추 12수 벌크 (16,000원)', priceOffset: 4000 },
      { name: '깐양상추 (17,000원)', priceOffset: 5000 },
      { name: '양상추 6수 개별포장 (12,000원)', priceOffset: 0 },
      { name: '적채 7~8구 (14,000원)', priceOffset: 2000 },
    ],
  },
  {
    tossId: 'connect-ai-pro-kr',
    name: '토마토',
    description: '햇살 가득 머금고 붉게 익은 당도 높은 친환경 완숙 토마토',
    image: '🍅',
    price: 3000,
    options: [
      { name: '유럽종 완숙 토마토 2kg (8,500원)', priceOffset: 0 },
      { name: '유럽종 완숙 토마토 5kg (15,500원)', priceOffset: 7000 },
    ],
    secondaryOptions: [
      { name: '1번과 310~250g', priceOffset: 0 },
      { name: '2번과 250~200g', priceOffset: 0 },
      { name: '3번과 200~160g', priceOffset: 0 },
      { name: '4번과 160~100g', priceOffset: 0 },
    ],
  },
  {
    tossId: 'connect-ai-enterprise-kr',
    name: '방울토마토',
    description: '한 입에 쏙 들어가는 달콤하고 과즙이 톡 터지는 대추방울토마토',
    image: '🍒',
    price: 3000,
    options: [
      { name: '대추방울토마토 2kg (12,500원)', priceOffset: 2500 },
      { name: '대추방울토마토 5kg (25,500원)', priceOffset: 15500 },
      { name: '스테비아방울토마토 1kg (10,000원)', priceOffset: 0 },
      { name: '스테비아방울토마토 2kg (15,000원)', priceOffset: 5000 },
    ],
  },
];

export default function Home() {
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore에서 상품 불러오기
  useEffect(() => {
    async function loadProducts() {
      try {
        let fetched = await getAllProducts();
        
        // 상품이 하나도 없다면 초기 데이터 세팅
        if (fetched.length === 0) {
          await initializeProducts(INITIAL_PRODUCTS);
          fetched = await getAllProducts();
        }
        
        setProducts(fetched);
      } catch (err) {
        console.error('상품 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProducts();
  }, []);

  /* ── Hero video mouse-scrub ── */
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const isSeekingRef = useRef(false);

  const handleSeeked = useCallback(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    isSeekingRef.current = false;
    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.01) {
      isSeekingRef.current = true;
      video.currentTime = targetTimeRef.current;
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = heroVideoRef.current;
      if (!video || !video.duration) return;
      const deltaX = e.movementX;
      const sensitivity = 0.8;
      const change = (deltaX / window.innerWidth) * video.duration * sensitivity;
      targetTimeRef.current = Math.max(
        0,
        Math.min(video.duration, targetTimeRef.current + change)
      );
      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = targetTimeRef.current;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ── Entrance delay ── */
  useEffect(() => {
    const timer = setTimeout(() => setEntranceComplete(true), 800);
    return () => clearTimeout(timer);
  }, []);

  /* ── Scroll-driven Hero Parallax Effect ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const heroTranslateY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  const { hero, footer } = SITE_CONFIG;

  return (
    <div style={{ fontFamily: '"Space Mono", monospace' }} className="bg-black text-white min-h-screen">
      <Navbar entranceComplete={entranceComplete} />

      {/* ════════════════ SECTION 1: HERO ════════════════ */}
      <section ref={heroRef} className="relative h-screen h-[100dvh] flex flex-col overflow-hidden">
        {/* Video background (mouse-scrubbed) */}
        {VIDEO_URLS.hero && (
          <motion.video
            ref={heroVideoRef}
            src={VIDEO_URLS.hero}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: heroOpacity, scale: heroScale }}
            playsInline
            muted
            preload="auto"
            onSeeked={handleSeeked}
          />
        )}

        {/* Dark overlay for rich aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#A5C3CF] z-10 pointer-events-none" />

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.05,
          }}
        />

        {/* Watermark text */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          style={{ paddingTop: 50 }}
        >
          <span
            className="uppercase select-none font-bold"
            style={{
              fontFamily: '"Anton SC", sans-serif',
              fontSize: 'clamp(80px, 20vw, 400px)',
              letterSpacing: '-4px',
              opacity: 0.03,
              background:
                'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'white',
              lineHeight: 1,
            }}
          >
            {hero.title}
          </span>
        </div>

        {/* Hero content */}
        <motion.div
          className="relative z-20 flex flex-col items-center justify-center flex-1 px-6 text-center"
          style={{ opacity: heroOpacity, y: heroTranslateY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: entranceComplete ? 1 : 0 }}
          transition={{ duration: 1 }}
        >
          <h1
            className="text-white font-bold leading-tight tracking-[-0.03em] mb-8"
            style={{ fontSize: 'clamp(40px, 8vw, 90px)', wordBreak: 'keep-all' }}
          >
            {hero.title}
          </h1>

          <motion.p
            className="max-w-xl text-[14px] sm:text-[18px] text-white/70 leading-relaxed font-light"
            initial={{ opacity: 0, y: 25 }}
            animate={entranceComplete ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.9,
              ease: [0.215, 0.61, 0.355, 1.0],
              delay: 0.2,
            }}
          >
            {hero.description}
          </motion.p>

          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ 
              opacity: { delay: 1.2, duration: 0.5 },
              y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
            }}
            onClick={() => {
              window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
            }}
          >
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/40">Scroll Down</span>
            <div className="w-[1px] h-[35px] bg-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════ SECTION 1.5: METRICS ════════════════ */}
      <section id="metrics-section" className="relative bg-[#A5C3CF] py-24 border-t border-[#A5C3CF]/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-400/30">
            {SITE_CONFIG.metrics?.map((metric, idx) => (
              <motion.div
                key={idx}
                className="text-center flex flex-col items-center justify-center px-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <div className="text-emerald-700 text-[32px] sm:text-[40px] md:text-[48px] font-semibold mb-2 font-mono">
                  {metric.value}
                </div>
                <div className="text-slate-700 text-[13px] sm:text-[15px] tracking-wider font-bold">
                  {metric.title}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ SECTION 2: PRODUCT PURCHASE ════════════════ */}
      <section id="products-section" className="relative min-h-screen bg-[#A5C3CF] py-32 px-6 flex flex-col justify-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <motion.div
            className="text-center mb-24"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0 }}
            viewport={{ once: true, amount: 0.3 }}
          >
            <p className="text-emerald-700 text-[13px] sm:text-[14px] tracking-[0.25em] uppercase mb-4 font-bold font-mono">
              Premium Store
            </p>
            <h2
              className="text-slate-900 font-semibold leading-[1.15] tracking-[-0.02em] mb-6 font-sans"
              style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}
            >
              Choose Your Fresh Layer
            </h2>
            <p className="text-slate-700 font-medium text-[15px] sm:text-[17px] leading-relaxed max-w-xl mx-auto">
              산지에서 갓 수확한 신선한 채소를 최상의 상태로 배송해 드립니다. 옵션을 선택하고 간편하게 결제해 보세요.
            </p>
          </motion.div>

          {/* Product Cards Container (Responsive layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {loading ? (
              <div className="col-span-1 md:col-span-3 text-center text-slate-600 py-20 font-bold">
                상품을 불러오는 중입니다...
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-1 md:col-span-3 text-center text-slate-600 py-20 font-bold">
                등록된 상품이 없습니다.
              </div>
            ) : (
              products.map((prod) => (
                <ProductCard key={prod.id} detail={prod} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="bg-[#A5C3CF] border-t border-white/30 overflow-hidden py-16">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="mb-8">
            <span className="text-[20px] font-extrabold text-slate-900 tracking-wider block mb-4">
              {SITE_CONFIG.brandName}
            </span>
            <p className="text-slate-700 font-medium text-[14px] sm:text-[15px] leading-relaxed max-w-xl mx-auto whitespace-pre-line break-keep">
              {footer.tagline}
            </p>
          </div>

          {footer.companyInfo && (
            <div className="flex flex-col gap-1.5 mb-12 text-[13px] text-slate-600 font-medium">
              {footer.companyInfo.map((info, idx) => (
                <span key={idx}>{info}</span>
              ))}
            </div>
          )}

          <p className="text-slate-500 font-bold text-[12px] font-mono">
            {SITE_CONFIG.copyright}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── 개별 상품 카드 컴포넌트 ──
interface ProductCardProps {
  detail: ProductDetail;
}

function ProductCard({ detail }: ProductCardProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [selectedSecondaryOptionIndex, setSelectedSecondaryOptionIndex] = useState(-1);
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);

  // ProductDetail 내부에 저장된 기본 price 사용
  const basePrice = detail.price || 3000;

  const currentOption = detail.options[selectedOptionIndex];
  const currentSecondaryOption = detail.secondaryOptions && selectedSecondaryOptionIndex >= 0 ? detail.secondaryOptions[selectedSecondaryOptionIndex] : null;

  const extractPrice = (name: string) => {
    const match = name.match(/\(([\d,]+)원\)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return null;
  };

  const parsedPrice = currentOption ? extractPrice(currentOption.name) : null;
  const finalPrice = parsedPrice !== null 
    ? parsedPrice + (currentSecondaryOption?.priceOffset || 0)
    : basePrice + (currentOption?.priceOffset || 0) + (currentSecondaryOption?.priceOffset || 0);
  
  let finalProductName = `${detail.name} [${currentOption.name}]`;
  if (currentSecondaryOption) {
    finalProductName += ` [${currentSecondaryOption.name}]`;
  }

  const isCheckoutDisabled = detail.secondaryOptions ? selectedSecondaryOptionIndex === -1 : false;

  const productForCheckout: TossProduct = {
    id: detail.tossId,
    name: finalProductName,
    price: finalPrice,
    currency: 'KRW',
  };

  return (
    <motion.div
      className="border border-white/40 rounded-2xl p-8 flex flex-col bg-white/30 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-white/60 hover:bg-white/40"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8 }}
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    >
      {/* Glow Effect */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/40 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[44px] select-none filter drop-shadow-md">{detail.image}</span>
        <span className="bg-emerald-600/10 text-emerald-700 text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full border border-emerald-600/20 font-mono">
          Fresh Product
        </span>
      </div>

      {/* Product Details */}
      <h3 className="text-slate-900 text-[24px] font-bold tracking-tight mb-3 font-sans">
        {detail.name}
      </h3>
      <p className="text-slate-700 font-medium text-[13px] sm:text-[14px] leading-relaxed mb-8 min-h-[48px]">
        {detail.description}
      </p>

      {/* Dropdown Options */}
      <div className="mb-8">
        <label className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-2 font-mono">
          Select Option
        </label>
        <div className="relative mb-3">
          <select
            value={selectedOptionIndex}
            onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
            className="w-full bg-white/80 border border-slate-300 hover:border-slate-400 rounded-lg h-[48px] px-4 text-slate-900 text-[13px] font-semibold appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
          >
            {detail.options.map((opt, idx) => (
              <option key={idx} value={idx} className="bg-white text-slate-900 font-medium">
                {opt.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[12px]">
            ▼
          </div>
        </div>

        {detail.secondaryOptions && (
          <>
            <label className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-2 font-mono mt-4">
              크기 선택
            </label>
            <div className="relative">
              <select
                value={selectedSecondaryOptionIndex}
                onChange={(e) => setSelectedSecondaryOptionIndex(Number(e.target.value))}
                className="w-full bg-white/80 border border-slate-300 hover:border-slate-400 rounded-lg h-[48px] px-4 text-slate-900 text-[13px] font-semibold appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
              >
                <option value={-1} disabled>없음 (크기를 선택해주세요)</option>
                {detail.secondaryOptions.map((opt, idx) => (
                  <option key={idx} value={idx} className="bg-white text-slate-900 font-medium">
                    {opt.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[12px]">
                ▼
              </div>
            </div>
          </>
        )}
      </div>

      {/* Price & Checkout */}
      <div className="mt-auto">
        <div className="flex items-baseline gap-1.5 justify-center mb-6">
          <span className="text-slate-600 font-bold text-[12px] font-mono">KRW</span>
          <span className="text-slate-900 text-[32px] font-bold tracking-tight">
            {finalPrice.toLocaleString()}
          </span>
          <span className="text-slate-600 font-medium text-[12px]">/ 기본단위</span>
        </div>

        <button
          onClick={() => {
            addToCart(productForCheckout, 1);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
          }}
          disabled={isCheckoutDisabled}
          className={`
            w-full h-[50px] rounded-lg font-medium text-[15px]
            flex items-center justify-center gap-2 transition-all duration-200
            ${isCheckoutDisabled 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white'
            }
          `}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          장바구니 담기
        </button>
      </div>

      {/* 장바구니 추가 완료 토스트 */}
      {showToast && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium z-50 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          장바구니에 담겼습니다
        </motion.div>
      )}
    </motion.div>
  );
}
