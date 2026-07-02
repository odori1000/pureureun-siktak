import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import TossCheckoutButton from '../components/payment/TossCheckoutButton';
import { ShippingInfo } from '../lib/orderService';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../lib/firestore';
import DaumPostcode from 'react-daum-postcode';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalAmount, totalCount, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    zipCode: '',
    address: '',
    detailAddress: '',
    memo: '',
  });

  const isInitializedRef = React.useRef(false);

  // 프로필 정보가 있으면 초기 배송지 자동 입력
  React.useEffect(() => {
    if (isInitializedRef.current) return;

    // 이미 사용자가 입력을 시작했다면 자동 입력 방지
    const isFormEmpty = 
      shippingInfo.name === '' && 
      shippingInfo.phone === '' && 
      shippingInfo.address === '' && 
      shippingInfo.memo === '';

    if (!isFormEmpty) {
      isInitializedRef.current = true;
      return;
    }

    if (profile) {
      if (profile.shippingInfo) {
        setShippingInfo({
          name: profile.shippingInfo.name || '',
          phone: profile.shippingInfo.phone || '',
          zipCode: profile.shippingInfo.zipCode || '',
          address: profile.shippingInfo.address || '',
          detailAddress: profile.shippingInfo.detailAddress || '',
          memo: profile.shippingInfo.memo || '',
        });
      } else {
        setShippingInfo(prev => ({
          ...prev,
          name: profile.displayName || prev.name
        }));
      }
      isInitializedRef.current = true;
    } else if (!user) {
      // 로그인하지 않은 경우 초기화 완료로 표시하여 입력 방해 방지
      isInitializedRef.current = true;
    }
  }, [profile, user, shippingInfo.name, shippingInfo.phone, shippingInfo.address, shippingInfo.memo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setShippingInfo(prev => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
    }));
    setIsPostcodeOpen(false);
  };

  const handleCheckoutClick = async () => {
    if (user && saveToProfile) {
      try {
        await updateUserProfile(user.uid, {
          shippingInfo
        });
      } catch (err) {
        console.error('Failed to save shipping info to profile', err);
      }
    }
  };

  const isShippingValid = shippingInfo.name.trim() !== '' && 
                          shippingInfo.phone.trim() !== '' && 
                          shippingInfo.address.trim() !== '' &&
                          (shippingInfo.detailAddress?.trim() !== '');

  const orderName = items.length > 1 
    ? `${items[0].product.name} 외 ${items.length - 1}건` 
    : items.length === 1 
      ? items[0].product.name 
      : '주문 상품 없음';

  const orderItems = items.map(item => ({
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity
  }));

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">장바구니가 비어있습니다</h2>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition"
          >
            상품 보러가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-slate-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">장바구니</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 왼쪽: 상품 목록 및 배송 정보 */}
          <div className="flex-1 space-y-8">
            {/* 상품 목록 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800">주문 상품 ({totalCount}개)</h2>
                <button
                  onClick={() => {
                    if (window.confirm('장바구니를 모두 비우시겠습니까?')) {
                      clearCart();
                    }
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-colors"
                >
                  전체 비우기
                </button>
              </div>
              <ul className="space-y-4">
                {items.map(item => (
                  <li key={item.id} className="flex gap-4 items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.product.name}</p>
                      <p className="text-emerald-600 font-semibold">{item.product.price.toLocaleString()}원</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button 
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >-</button>
                        <span className="px-3 py-1 text-sm font-medium w-8 text-center text-slate-800">{item.quantity}</span>
                        <button 
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >+</button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 배송지 정보 입력 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-4">배송지 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">수령인 성함 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="name"
                    value={shippingInfo.name}
                    onChange={handleInputChange}
                    placeholder="홍길동"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">연락처 <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleInputChange}
                    placeholder="010-1234-5678"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">우편번호</label>
                  <div className="flex gap-2 sm:max-w-[300px]">
                    <input 
                      type="text" 
                      name="zipCode"
                      value={shippingInfo.zipCode || ''}
                      onChange={handleInputChange}
                      placeholder="우편번호"
                      readOnly
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 bg-slate-50 cursor-pointer"
                      onClick={() => setIsPostcodeOpen(true)}
                    />
                    <button 
                      type="button"
                      onClick={() => setIsPostcodeOpen(true)}
                      className="whitespace-nowrap px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
                    >
                      주소 찾기
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">배송지 주소 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    placeholder="기본 주소 (예: 서울특별시 강남구 테헤란로 123)"
                    readOnly
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 bg-slate-50 cursor-pointer"
                    onClick={() => setIsPostcodeOpen(true)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상세 주소 <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="detailAddress"
                    value={shippingInfo.detailAddress || ''}
                    onChange={handleInputChange}
                    placeholder="상세 주소 (예: 101동 202호)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">배송 메모</label>
                  <input 
                    type="text" 
                    name="memo"
                    value={shippingInfo.memo}
                    onChange={handleInputChange}
                    placeholder="부재 시 문 앞에 놓아주세요"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900"
                  />
                </div>
              </div>
              {user && (
                <div className="mt-4 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="saveProfile"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="saveProfile" className="text-sm text-slate-600 cursor-pointer">
                    내 프로필 기본 배송지로 저장하기
                  </label>
                </div>
              )}
              {!user && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex items-center gap-2 border border-slate-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  상단의 <strong className="text-slate-800">Sign In</strong> 버튼을 통해 가입/로그인하시면 다음 번엔 자동으로 채워집니다!
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 결제 요약 */}
          <div className="w-full lg:w-[340px]">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-4">결제 요약</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>총 상품 금액</span>
                  <span>{totalAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>배송비</span>
                  <span>무료</span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg text-slate-900">
                  <span>총 결제 금액</span>
                  <span className="text-emerald-600">{totalAmount.toLocaleString()}원</span>
                </div>
              </div>

              {!isShippingValid && (
                <p className="text-red-500 text-sm mb-3 text-center">
                  배송지 정보(*표시)를 모두 입력해주세요.
                </p>
              )}

              <div onClick={handleCheckoutClick}>
                <TossCheckoutButton
                  amount={totalAmount}
                  orderName={orderName}
                  items={orderItems}
                  shippingInfo={shippingInfo}
                  userId={user?.uid}
                  disabled={!isShippingValid}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 우편번호 검색 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">우편번호 검색</h3>
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
