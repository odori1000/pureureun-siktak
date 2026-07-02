import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { updateOrderStatus } from '../lib/orderService';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const code = searchParams.get('code');
  const message = searchParams.get('message') || '결제 중 오류가 발생했습니다.';
  const orderId = searchParams.get('orderId');

  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (orderId && !hasRequestedRef.current) {
      hasRequestedRef.current = true;
      // Firebase에 실패 기록
      updateOrderStatus(orderId as string, 'FAILED', { failReason: message }).catch(console.error);
    }
  }, [orderId, message]);

  return (
    <div className="min-h-screen bg-[#A5C3CF] flex items-center justify-center p-6" style={{ fontFamily: '"Space Mono", monospace' }}>
      <div className="bg-white/80 backdrop-blur-md border border-white/40 p-10 rounded-2xl max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-sans">결제 실패</h2>
        <p className="text-red-600 text-sm mb-2">{message}</p>
        {code && <p className="text-slate-500 text-xs mb-6">Error Code: {code}</p>}
        
        <button 
          onClick={() => navigate('/')} 
          className="inline-block w-full bg-slate-200 text-slate-800 font-medium py-3 rounded-lg hover:bg-slate-300 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
