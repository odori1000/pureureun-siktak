import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

// Firebase configuration using Node.js process.env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-password'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 관리자 비밀번호 검증
  const adminPassword = process.env.ADMIN_PASSWORD;
  const requestPassword = req.headers['x-admin-password'] || req.body?.adminPassword;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Server configuration error: ADMIN_PASSWORD is not set.' });
  }

  if (requestPassword !== adminPassword) {
    return res.status(401).json({ error: '인증 실패: 관리자 비밀번호가 일치하지 않습니다.' });
  }

  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId가 누락되었습니다.' });
  }

  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return res.status(404).json({ error: '주문 내역을 찾을 수 없습니다.' });
    }

    const orderData = orderSnap.data();
    const updatePayload: any = {
      paymentStatus: 'CONFIRMED',
      updatedAt: new Date()
    };

    // 현재 상태가 대기 또는 실패인 경우 PAID로 상태 업데이트
    if (orderData.status === 'PENDING' || orderData.status === 'FAILED') {
      updatePayload.status = 'PAID';
    }

    await updateDoc(orderRef, updatePayload);

    return res.status(200).json({ 
      success: true, 
      message: '입금 확인 상태로 변경되었습니다.',
      orderId 
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: error.message || '입금 확인 처리 중 서버 에러 발생' });
  }
}
