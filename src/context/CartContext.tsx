import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { TossProduct } from '../lib/toss';

export interface CartItem {
  id: string; // 장바구니용 고유 ID (예: timestamp)
  product: TossProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: TossProduct, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // 로컬 스토리지에서 초기값 불러오기
    const saved = localStorage.getItem('pureureun_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // items가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('pureureun_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: TossProduct, quantity: number = 1) => {
    setItems((prev) => {
      // 이미 같은 상품(옵션 포함 이름이 완전히 같은 경우)이 있는지 확인
      const existing = prev.find(item => item.product.name === product.name);
      if (existing) {
        return prev.map(item => 
          item.id === existing.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        product,
        quantity
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prev) => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalAmount,
      totalCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
