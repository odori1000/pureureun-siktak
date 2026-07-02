import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile } from '../lib/firestore';
import { getOrdersByUserId, OrderData, ShippingInfo } from '../lib/orderService';
import DaumPostcode from 'react-daum-postcode';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'shipping'>('orders');
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    zipCode: '',
    address: '',
    detailAddress: '',
    memo: '',
  });
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 로그인 안된 경우 홈으로
  useEffect(() => {
    // Wait slightly to let auth initialize
    const timer = setTimeout(() => {
      if (user === null) {
        navigate('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user, navigate]);

  // 주문 내역 로드
  useEffect(() => {
    if (user && activeTab === 'orders') {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const userOrders = await getOrdersByUserId(user.uid);
          setOrders(userOrders);
        } catch (error) {
          console.error("Failed to fetch orders:", error);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [user, activeTab]);

  // 배송지 정보 초기화
  useEffect(() => {
    if (profile?.shippingInfo) {
      setShippingInfo({
        name: profile.shippingInfo.name || '',
        phone: profile.shippingInfo.phone || '',
        zipCode: profile.shippingInfo.zipCode || '',
        address: profile.shippingInfo.address || '',
        detailAddress: profile.shippingInfo.detailAddress || '',
        memo: profile.shippingInfo.memo || '',
      });
    } else if (profile) {
      setShippingInfo(prev => ({
        ...prev,
        name: profile.displayName || ''
      }));
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setShippingInfo(prev => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
    }));
    setIsPostcodeOpen(false);
  };

  const handleSaveShipping = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { shippingInfo });
      alert('배송지 정보가 정상적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              aria-label="돌아가기"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-slate-900">내 정보</h1>
          </div>
          <button 
            onClick={async () => { await signOut(); navigate('/'); }}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            로그아웃
          </button>
        </div>

        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'orders' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
            onClick={() => setActiveTab('orders')}
          >
            구매 내역
          </button>
          <button
            className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'shipping' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 font-medium'}`}
            onClick={() => setActiveTab('shipping')}
          >
            기본 배송지 관리
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loadingOrders ? (
              <div className="p-8 text-center text-slate-500 font-medium">구매 내역을 불러오는 중...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">아직 구매하신 내역이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {orders.map(order => {
                  const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : '';
                  return (
                    <li key={order.orderId} className="p-6 hover:bg-slate-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">{date} · 주문번호: {order.orderId}</p>
                          <h3 className="text-lg font-bold text-slate-900">{order.orderName}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status === 'PAID' ? '결제완료' : order.status === 'PENDING' ? '결제대기' : '결제실패'}
                        </span>
                      </div>
                      <p className="text-slate-700 font-bold text-lg mt-2">{order.amount.toLocaleString()}원</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="space-y-5 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">수령인 성함</label>
                <input 
                  type="text" name="name" value={shippingInfo.name} onChange={handleInputChange}
                  placeholder="홍길동" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
                <input 
                  type="tel" name="phone" value={shippingInfo.phone} onChange={handleInputChange}
                  placeholder="010-1234-5678" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">우편번호</label>
                <div className="flex gap-2 sm:max-w-[300px]">
                  <input 
                    type="text" name="zipCode" value={shippingInfo.zipCode || ''} onChange={handleInputChange}
                    placeholder="우편번호" readOnly className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 bg-slate-50 cursor-pointer" onClick={() => setIsPostcodeOpen(true)}
                  />
                  <button type="button" onClick={() => setIsPostcodeOpen(true)} className="whitespace-nowrap px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
                    주소 찾기
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">배송지 주소</label>
                <input 
                  type="text" name="address" value={shippingInfo.address} onChange={handleInputChange}
                  placeholder="기본 주소" readOnly className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 bg-slate-50 cursor-pointer" onClick={() => setIsPostcodeOpen(true)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">상세 주소</label>
                <input 
                  type="text" name="detailAddress" value={shippingInfo.detailAddress || ''} onChange={handleInputChange}
                  placeholder="상세 주소" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">배송 메모</label>
                <input 
                  type="text" name="memo" value={shippingInfo.memo || ''} onChange={handleInputChange}
                  placeholder="부재 시 문 앞에 놓아주세요" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 mt-6">
                <button 
                  onClick={handleSaveShipping}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '기본 배송지로 저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 우편번호 검색 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">우편번호 검색</h3>
              <button onClick={() => setIsPostcodeOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-0 h-[400px]">
              <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '100%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
