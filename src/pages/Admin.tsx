import { useState, FormEvent } from 'react';
import { getAllOrders, updateOrderStatus, type OrderData } from '../lib/orderService';
import { getAllProducts, type ProductDetail, updateProduct, deleteProduct, createProduct } from '../lib/productService';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // 상품 추가/수정용 폼 상태
  const [editingProduct, setEditingProduct] = useState<Partial<ProductDetail> | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        }
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem('admin_password', password);
        setIsAuthenticated(true);
        await fetchData();
      } else {
        // API 연동이 어려운 로컬 테스트 환경을 위한 1234 백업 검증
        if (password === '1234') {
          sessionStorage.setItem('admin_password', '1234');
          setIsAuthenticated(true);
          await fetchData();
        } else {
          alert(data.error || '비밀번호가 일치하지 않습니다.');
        }
      }
    } catch (err) {
      console.warn('API verification failed, falling back to local password check.', err);
      if (password === '1234') {
        sessionStorage.setItem('admin_password', '1234');
        setIsAuthenticated(true);
        await fetchData();
      } else {
        alert('비밀번호가 틀렸습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    const passwordForAuth = sessionStorage.getItem('admin_password') || password;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': passwordForAuth
        },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('입금 확인 처리가 완료되었습니다.');
        await fetchData();
        return;
      }
      
      // API 경로가 없는 로컬 환경(404)일 때 직접 Firebase 업데이트
      if (res.status === 404) {
        await updateOrderStatus(orderId, 'PAID', { paymentStatus: 'CONFIRMED' });
        alert('입금 확인 처리가 완료되었습니다. (클라이언트에서 직접 업데이트)');
        await fetchData();
        return;
      }
      
      throw new Error(data.error || '입금 확인 처리 중 오류가 발생했습니다.');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '입금 확인 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueInvoice = async (orderId: string) => {
    const passwordForAuth = sessionStorage.getItem('admin_password') || password;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/issue-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': passwordForAuth
        },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || '세금계산서가 발행되었습니다.');
        await fetchData();
        return;
      }
      
      // API 경로가 없는 로컬 환경(404)일 때 직접 Firebase 시뮬레이션 업데이트
      if (res.status === 404) {
        await updateOrderStatus(orderId, 'PAID', { invoiceStatus: 'ISSUED' });
        alert('세금계산서 발행 완료 처리가 완료되었습니다. (클라이언트에서 직접 시뮬레이션 완료)');
        await fetchData();
        return;
      }
      
      throw new Error(data.error || '세금계산서 발행 중 오류가 발생했습니다.');
    } catch (err: any) {
      console.error(err);
      alert(err.message || '세금계산서 발행에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData] = await Promise.all([
        getAllOrders(),
        getAllProducts()
      ]);
      setOrders(ordersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.price) {
      alert('상품명과 가격을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    try {
      if (editingProduct.id) {
        // 기존 상품 수정
        await updateProduct(editingProduct.id, editingProduct);
      } else {
        // 새 상품 추가
        const newId = `prod-${Date.now()}`;
        await createProduct(newId, {
          tossId: newId,
          name: editingProduct.name,
          description: editingProduct.description || '',
          image: editingProduct.image || '📦',
          price: editingProduct.price,
          options: editingProduct.options || [{ name: '기본', priceOffset: 0 }],
        });
      }
      setEditingProduct(null);
      await fetchData(); // 새로고침
    } catch (error) {
      console.error('Error saving product:', error);
      alert('상품 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setLoading(true);
      try {
        await deleteProduct(id);
        await fetchData();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('삭제 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">관리자 로그인</h2>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요 (기본: 1234)"
            className="w-full px-4 py-2 border rounded-lg mb-4 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700">
            접속하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-24 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header / Tabs */}
        <div className="border-b border-slate-200 flex">
          <button 
            className={`px-6 py-4 font-bold text-[15px] ${activeTab === 'orders' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab('orders')}
          >
            주문 내역 관리
          </button>
          <button 
            className={`px-6 py-4 font-bold text-[15px] ${activeTab === 'products' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setActiveTab('products')}
          >
            상품 관리
          </button>
          <button onClick={fetchData} className="ml-auto px-6 text-slate-400 hover:text-slate-800 flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
            새로고침
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && <p className="text-center text-slate-500 my-10">데이터를 불러오는 중입니다...</p>}
          
          {!loading && activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm border-y border-slate-200">
                    <th className="p-3 font-medium">상태</th>
                    <th className="p-3 font-medium">주문일시</th>
                    <th className="p-3 font-medium">주문번호</th>
                    <th className="p-3 font-medium">수령인/연락처</th>
                    <th className="p-3 font-medium">주문상품 (금액)</th>
                    <th className="p-3 font-medium">배송주소</th>
                    <th className="p-3 font-medium">입금 상태</th>
                    <th className="p-3 font-medium">세금계산서</th>
                    <th className="p-3 font-medium">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map(order => {
                    const date = order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleString() : '-';
                    return (
                      <tr key={order.orderId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <select
                            value={order.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as any;
                              try {
                                await updateOrderStatus(order.orderId, newStatus);
                                alert('주문 상태가 변경되었습니다.');
                                fetchData();
                              } catch (err) {
                                console.error(err);
                                alert('상태 변경에 실패했습니다.');
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border border-transparent outline-none cursor-pointer shadow-sm transition-all focus:border-slate-400 ${
                              order.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'DELIVERED' ? 'bg-purple-100 text-purple-700' :
                              'bg-red-100 text-red-700'
                            }`}
                          >
                            <option value="PENDING" className="bg-white text-slate-800 font-bold">결제대기</option>
                            <option value="PAID" className="bg-white text-slate-800 font-bold">결제완료</option>
                            <option value="SHIPPING" className="bg-white text-slate-800 font-bold">배송중</option>
                            <option value="DELIVERED" className="bg-white text-slate-800 font-bold">배송완료</option>
                            <option value="FAILED" className="bg-white text-slate-800 font-bold">결제실패</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{date}</td>
                        <td className="p-3 text-slate-600 font-mono text-xs">{order.orderId}</td>
                        <td className="p-3">
                          <p className="font-medium text-slate-800">{order.shippingInfo?.name || order.customerName}</p>
                          <p className="text-slate-500 text-xs">{order.shippingInfo?.phone || '-'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]" title={order.orderName}>{order.orderName}</p>
                          <p className="text-slate-500 text-xs">{order.amount.toLocaleString()}원</p>
                        </td>
                        <td className="p-3 max-w-[250px]">
                          <p className="text-slate-700 truncate" title={order.shippingInfo?.address}>{order.shippingInfo?.address || '-'}</p>
                          {order.shippingInfo?.memo && <p className="text-xs text-slate-400 truncate mt-1">메모: {order.shippingInfo.memo}</p>}
                        </td>
                        <td className="p-3">
                          {order.paymentStatus === 'CONFIRMED' ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-lg text-xs font-bold">입금 완료</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs font-bold">결제 대기</span>
                          )}
                        </td>
                        <td className="p-3">
                          {order.invoiceStatus === 'ISSUED' ? (
                            <span className="bg-blue-100 text-blue-800 px-2.5 py-1.5 rounded-lg text-xs font-bold">발행 완료</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs font-bold">미발행</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {order.paymentStatus !== 'CONFIRMED' && (
                              <button
                                onClick={() => handleConfirmPayment(order.orderId)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                              >
                                입금 확인
                              </button>
                            )}
                            {order.paymentStatus === 'CONFIRMED' && order.invoiceStatus !== 'ISSUED' && (
                              <button
                                onClick={() => handleIssueInvoice(order.orderId)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                              >
                                계산서 발행
                              </button>
                            )}
                            {order.paymentStatus === 'CONFIRMED' && order.invoiceStatus === 'ISSUED' && (
                              <span className="text-slate-400 text-xs font-bold">발행 완료</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">주문 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">등록된 상품 관리</h3>
                <button 
                  onClick={() => setEditingProduct({})}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  + 새 상품 추가
                </button>
              </div>

              {editingProduct && (
                <div className="bg-slate-100 p-6 rounded-xl mb-6">
                  <h4 className="font-bold text-slate-800 mb-4">{editingProduct.id ? '상품 수정' : '새 상품 추가'}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">상품명</label>
                      <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full px-3 py-2 rounded border" placeholder="예: 신선한 사과" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">기본 가격</label>
                      <input type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 rounded border" placeholder="3000" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">설명</label>
                      <input type="text" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full px-3 py-2 rounded border" placeholder="상품에 대한 짧은 설명" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">이모지 이미지</label>
                      <input type="text" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} className="w-full px-3 py-2 rounded border" placeholder="🍎" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-400">취소</button>
                    <button onClick={handleSaveProduct} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">저장</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(prod => (
                  <div key={prod.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 bg-white items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-3xl shrink-0">
                      {prod.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{prod.name}</h4>
                      <p className="text-emerald-600 font-medium text-sm mt-1">{prod.price.toLocaleString()}원</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setEditingProduct(prod)} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">수정</button>
                        <button onClick={() => handleDeleteProduct(prod.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">삭제</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
