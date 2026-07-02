import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateUserProfile } from '../lib/firestore';
import { getOrdersByUserId, updateOrderStatus, OrderData, ShippingInfo } from '../lib/orderService';
import DaumPostcode from 'react-daum-postcode';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'shipping'>('orders');
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateOrders, setSelectedDateOrders] = useState<OrderData[] | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  
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

  const getOrdersForDate = (year: number, month: number, day: number) => {
    return orders.filter(order => {
      if (!order.createdAt) return false;
      const d = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('정말로 이 주문을 취소하시겠습니까?')) return;
    try {
      await updateOrderStatus(orderId, 'FAILED', { failReason: '사용자 요청으로 인한 주문 취소' });
      alert('주문이 성공적으로 취소되었습니다.');
      setSelectedDateOrders(null);
      setSelectedCalendarDay(null);
      if (user) {
        setLoadingOrders(true);
        const userOrders = await getOrdersByUserId(user.uid);
        setOrders(userOrders);
        setLoadingOrders(false);
      }
    } catch (err) {
      console.error(err);
      alert('주문 취소에 실패했습니다.');
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
          <div className="space-y-6">
            {/* 보기 방식 토글 */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-sm font-bold text-slate-800">주문 내역 보기 방식</span>
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                <button
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setViewMode('list')}
                >
                  리스트 보기
                </button>
                <button
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setViewMode('calendar')}
                >
                  달력 보기
                </button>
              </div>
            </div>

            {viewMode === 'list' ? (
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
                        <li 
                          key={order.orderId} 
                          onClick={() => setSelectedDateOrders([order])}
                          className="p-6 hover:bg-slate-50 transition cursor-pointer flex justify-between items-center"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs text-slate-400 font-mono">주문번호: {order.orderId}</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-500">{date}</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 truncate mb-1">{order.orderName}</h3>
                            <p className="text-emerald-600 font-extrabold text-sm">{order.amount.toLocaleString()}원</p>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'DELIVERED' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {order.status === 'PAID' ? '결제완료' : 
                               order.status === 'PENDING' ? '결제대기' : 
                               order.status === 'SHIPPING' ? '배송중' : 
                               order.status === 'DELIVERED' ? '배송완료' : '주문취소'}
                            </span>
                            <span className="text-slate-300 font-bold">❯</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                {loadingOrders ? (
                  <div className="text-center text-slate-500 py-10">구매 내역을 불러오는 중...</div>
                ) : (
                  <div>
                    {/* 달력 헤더 */}
                    <div className="flex justify-between items-center mb-6">
                      <button 
                        onClick={handlePrevMonth}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer font-bold text-lg"
                      >
                        ◀
                      </button>
                      <h3 className="text-lg font-black text-slate-800">
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                      </h3>
                      <button 
                        onClick={handleNextMonth}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer font-bold text-lg"
                      >
                        ▶
                      </button>
                    </div>

                    {/* 요일 */}
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500">
                      <div className="text-red-500">일</div>
                      <div>월</div>
                      <div>화</div>
                      <div>수</div>
                      <div>목</div>
                      <div>금</div>
                      <div className="text-blue-500">토</div>
                    </div>

                    {/* 날짜 그리드 */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* 이전 달 빈 칸 */}
                      {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[85px] bg-slate-50/30 rounded-xl border border-transparent"></div>
                      ))}

                      {/* 이번 달 날짜들 */}
                      {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                        const day = i + 1;
                        const dayOrders = getOrdersForDate(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const hasOrders = dayOrders.length > 0;
                        const totalAmount = dayOrders.reduce((sum, o) => sum + o.amount, 0);

                        return (
                          <div
                            key={`day-${day}`}
                            onClick={() => {
                              if (hasOrders) {
                                setSelectedDateOrders(dayOrders);
                                setSelectedCalendarDay(day);
                              }
                            }}
                            className={`min-h-[85px] p-2 border rounded-xl flex flex-col justify-between transition-all select-none ${
                              hasOrders
                                ? 'border-emerald-500 bg-emerald-50/10 hover:bg-emerald-50/30 cursor-pointer shadow-xs scale-[1.01]'
                                : 'border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-700">{day}</span>
                            {hasOrders && (
                              <div className="mt-1 flex flex-col items-center">
                                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                  {dayOrders.length}건
                                </span>
                                <span className="text-[9px] text-emerald-600 font-extrabold mt-1 truncate max-w-full leading-none">
                                  {totalAmount.toLocaleString()}원
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
      {/* 주문 상세 모달 */}
      <AnimatePresence>
        {selectedDateOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedDateOrders(null); setSelectedCalendarDay(null); }}
            />
            <motion.div
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedCalendarDay 
                    ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${selectedCalendarDay}일 주문 상세`
                    : '주문 상세 정보'
                  }
                </h3>
                <button
                  onClick={() => { setSelectedDateOrders(null); setSelectedCalendarDay(null); }}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* 모달 바디 (스크롤 가능) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
                {selectedDateOrders.map((order) => {
                  const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : '';
                  return (
                    <div key={order.orderId} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
                      {/* 헤더 및 주문 정보 */}
                      <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400 mb-1 font-mono">주문번호: {order.orderId}</p>
                          <p className="text-xs text-slate-500">{date}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'DELIVERED' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {order.status === 'PAID' ? '결제완료' : 
                           order.status === 'PENDING' ? '결제대기' : 
                           order.status === 'SHIPPING' ? '배송중' : 
                           order.status === 'DELIVERED' ? '배송완료' : '주문취소'}
                        </span>
                      </div>

                      {/* 주문 상품 리스트 */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">주문 상품</h4>
                        <ul className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2">
                          {order.items && order.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex justify-between text-sm py-1">
                              <span className="text-slate-700 font-medium">{item.name}</span>
                              <span className="text-slate-600 font-bold font-mono">
                                {item.quantity}개 · {(item.price * item.quantity).toLocaleString()}원
                              </span>
                            </li>
                          ))}
                          {(!order.items || order.items.length === 0) && (
                            <li className="flex justify-between text-sm py-1">
                              <span className="text-slate-700 font-medium">{order.orderName}</span>
                              <span className="text-slate-600 font-bold font-mono">
                                {order.amount.toLocaleString()}원
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* 배송지 정보 */}
                      {order.shippingInfo && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">배송 정보</h4>
                          <div className="bg-slate-50/50 rounded-xl p-4 space-y-1.5 text-xs text-slate-700">
                            <p><span className="font-bold text-slate-500">수령인:</span> {order.shippingInfo.name}</p>
                            <p><span className="font-bold text-slate-500">연락처:</span> {order.shippingInfo.phone}</p>
                            <p><span className="font-bold text-slate-500">주소:</span> ({order.shippingInfo.zipCode}) {order.shippingInfo.address} {order.shippingInfo.detailAddress}</p>
                            {order.shippingInfo.memo && (
                              <p className="mt-2 text-slate-500 border-t border-slate-200/60 pt-1.5">
                                <span className="font-bold text-slate-500">배송 메모:</span> {order.shippingInfo.memo}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 총 가격 */}
                      <div className="flex justify-between items-baseline pt-4 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-600">결제 금액</span>
                        <span className="text-lg font-black text-emerald-600 font-mono">
                          {order.amount.toLocaleString()}원
                        </span>
                      </div>

                      {/* 주문 취소 버튼 추가 */}
                      {order.status !== 'FAILED' && (
                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                          {order.status === 'PENDING' || order.status === 'PAID' ? (
                            <button
                              onClick={() => handleCancelOrder(order.orderId)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border-none active:scale-[0.98]"
                            >
                              주문 취소
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold bg-slate-100 px-3 py-2 rounded-lg select-none border border-slate-200">
                              배송 진행 중으로 주문 취소 불가
                            </span>
                          )}
                        </div>
                      )}
                      {order.status === 'FAILED' && (
                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                          <span className="text-red-500 text-xs font-bold bg-red-50 px-3 py-2 rounded-lg select-none border border-red-100">
                            취소된 주문 ({order.failReason || '사용자 취소'})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
