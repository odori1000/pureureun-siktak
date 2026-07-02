import { collection, doc, setDoc, getDoc, getDocs, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ShippingInfo {
  name: string;
  phone: string;
  zipCode?: string;
  address: string;
  detailAddress?: string;
  memo?: string;
}

export interface OrderData {
  orderId: string;
  orderName: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'SHIPPING' | 'DELIVERED';
  items?: OrderItem[];
  shippingInfo?: ShippingInfo;
  customerName?: string;
  customerEmail?: string;
  userId?: string;
  paymentKey?: string;
  failReason?: string;
  paymentStatus?: 'PENDING' | 'CONFIRMED';
  invoiceStatus?: 'UNISSUED' | 'ISSUED';
  createdAt: any; // Firestore Timestamp
  updatedAt?: any;
}

/**
 * 결제 전 새로운 주문 생성 (PENDING 상태)
 */
export async function createOrder(orderId: string, data: Omit<OrderData, 'orderId' | 'status' | 'createdAt'>) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      orderId,
      ...data,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      invoiceStatus: 'UNISSUED',
      createdAt: serverTimestamp(),
    });
    console.log(`Order created: ${orderId}`);
  } catch (error) {
    console.error('Error creating order in Firestore:', error);
    throw error;
  }
}

/**
 * 특정 주문 조회
 */
export async function getOrder(orderId: string): Promise<OrderData | null> {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(orderRef);
    if (snapshot.exists()) {
      return snapshot.data() as OrderData;
    }
    return null;
  } catch (error) {
    console.error('Error getting order from Firestore:', error);
    throw error;
  }
}


/**
 * 특정 사용자의 주문 조회
 */
export async function getOrdersByUserId(userId: string): Promise<OrderData[]> {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const orders: OrderData[] = [];
    querySnapshot.forEach((doc) => {
      orders.push(doc.data() as OrderData);
    });
    // 최신 주문순으로 정렬
    return orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    return [];
  }
}

/**
 * 모든 주문 조회 (관리자용)
 */
export async function getAllOrders(): Promise<OrderData[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders: OrderData[] = [];
    querySnapshot.forEach((doc) => {
      orders.push(doc.data() as OrderData);
    });
    // 최신 주문순으로 정렬
    return orders.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error getting all orders:', error);
    return [];
  }
}

/**
 * 결제 후 주문 상태 업데이트
 */
export async function updateOrderStatus(
  orderId: string, 
  status: 'PENDING' | 'PAID' | 'FAILED' | 'SHIPPING' | 'DELIVERED', 
  additionalData?: Partial<OrderData>
) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const updateData: any = {
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    };
    if (status === 'PAID' || status === 'SHIPPING' || status === 'DELIVERED') {
      updateData.paymentStatus = 'CONFIRMED';
    }
    await updateDoc(orderRef, updateData);
    console.log(`Order ${orderId} updated to ${status}`);
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}
