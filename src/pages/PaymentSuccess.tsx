import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { updateOrderStatus } from '../lib/orderService';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'fail'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  
  // Strict mode 에서 두 번 호출되는 것 방지
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    const paymentType = searchParams.get('paymentType');
    if (paymentType === 'wire' || paymentKey === 'wire') {
      setStatus('success');
      return;
    }

    if (!paymentKey || !orderId || !amount) {
      setStatus('fail');
      setErrorMessage('결제 정보가 유효하지 않습니다.');
      return;
    }

    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    async function confirmPayment() {
      try {
        const secretKey = import.meta.env.VITE_TOSS_SECRET_KEY;
        if (!secretKey) {
          throw new Error('서버 시크릿 키가 설정되지 않았습니다.');
        }

        // 시크릿 키 Base64 인코딩 (Toss Payments Basic Auth)
        const encodedKey = btoa(secretKey + ':');

        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${encodedKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '결제 승인 중 오류가 발생했습니다.');
        }

        // Firebase 결제 완료 처리
        await updateOrderStatus(orderId as string, 'PAID', { paymentKey: paymentKey ?? undefined });
        
        setStatus('success');
      } catch (error: any) {
        console.error('Payment confirmation error:', error);
        setStatus('fail');
        setErrorMessage(error.message);
        
        // 오류 발생 시 FAILED 처리
        try {
          await updateOrderStatus(orderId as string, 'FAILED', { failReason: error.message });
        } catch (dbErr) {
          console.error('Failed to update order status to FAILED', dbErr);
        }
      }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount, searchParams]);

  return (
    <div className="min-h-screen bg-[#A5C3CF] flex items-center justify-center p-6" style={{ fontFamily: '"Space Mono", monospace' }}>
      <div className="bg-white/80 backdrop-blur-md border border-white/40 p-10 rounded-2xl max-w-md w-full text-center shadow-xl">
        {status === 'processing' && (
          <>
            <svg className="animate-spin h-10 w-10 text-emerald-600 mx-auto mb-6" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-sans">결제 승인 중...</h2>
            <p className="text-slate-600 text-sm">잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-sans">
              {searchParams.get('paymentType') === 'wire' || paymentKey === 'wire' ? '주문이 접수되었습니다!' : '결제가 완료되었습니다!'}
            </h2>
            <p className="text-slate-600 text-sm mb-2">주문번호: {orderId}</p>
            {(searchParams.get('paymentType') === 'wire' || paymentKey === 'wire') && (
              <p className="text-slate-500 text-xs mb-6 bg-slate-50/80 p-3 rounded-lg border border-slate-100 leading-relaxed font-sans font-medium">
                계좌이체 입금이 확인되는 대로<br/>
                신선하고 신속하게 배송해 드리겠습니다.
              </p>
            )}
            {!(searchParams.get('paymentType') === 'wire' || paymentKey === 'wire') && <div className="mb-6" />}
            
            <Link to="/" className="inline-block w-full bg-emerald-600 text-white font-medium py-3 rounded-lg hover:bg-emerald-700 transition-colors">
              홈으로 돌아가기
            </Link>
          </>
        )}

        {status === 'fail' && (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-sans">결제 승인 실패</h2>
            <p className="text-red-600 text-sm mb-6">{errorMessage}</p>
            
            <button 
              onClick={() => navigate('/')} 
              className="inline-block w-full bg-slate-200 text-slate-800 font-medium py-3 rounded-lg hover:bg-slate-300 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
