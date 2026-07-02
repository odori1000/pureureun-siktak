import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import crypto from 'crypto';

// Firebase configuration using Node.js process.env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD7d2chbxs8C2b55tIyV2MGAEqEQp2rv_k",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "pureureun-siktak.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "pureureun-siktak",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "pureureun-siktak.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1096919953860",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:1096919953860:web:03f2c38cf4fbea38317491"
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

    // 결제 완료(입금 확인) 여부 검증
    if (orderData.paymentStatus !== 'CONFIRMED') {
      return res.status(400).json({ error: '입금 확인(결제완료) 처리가 되지 않은 주문은 세금계산서를 발행할 수 없습니다.' });
    }

    // 팝빌 환경 변수 로드
    const linkId = process.env.POPBILL_LINK_ID;
    const secretKey = process.env.POPBILL_SECRET_KEY;
    const corpNum = process.env.POPBILL_CORP_NUM; // 발행인 사업자번호 (하이픈 없이 10자리)
    const isTest = process.env.POPBILL_IS_TEST !== 'false';

    // 팝빌 키가 설정되어 있지 않으면 시뮬레이터(Mock Mode)로 작동
    const isMockMode = !linkId || !secretKey || !corpNum || linkId === 'mock' || secretKey === 'mock';

    if (isMockMode) {
      console.log(`[Popbill Mock Mode] 세금계산서 발행 시뮬레이션 실행 - 주문ID: ${orderId}`);
      
      // 2초 지연 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Firestore 세금계산서 발행 상태 완료로 업데이트
      await updateDoc(orderRef, {
        invoiceStatus: 'ISSUED',
        invoiceIssuedAt: new Date(),
        updatedAt: new Date()
      });

      return res.status(200).json({
        success: true,
        mode: 'MOCK',
        message: '세금계산서 발행이 성공적으로 시뮬레이션 되었습니다. (Mock Mode)',
        popbillReceiptNum: `MOCK-PB-${Date.now()}`,
        orderId
      });
    }

    // ==========================================
    // 팝빌(Popbill) API 연동 실구현
    // ==========================================
    // 세금계산서 정보 매핑
    const totalAmount = orderData.amount;
    const supplyCost = Math.round(totalAmount / 1.1);
    const tax = totalAmount - supplyCost;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const mgtKey = `invoice_${orderId}`;

    const taxInvoiceData = {
      writeDate: todayStr,
      chargeDirection: '정발행',
      issueType: '일반',
      purposeType: '영수',
      taxType: '과세',
      
      // 공급자 (우리 쇼핑몰)
      invoicerCorpNum: corpNum,
      invoicerMgtKey: mgtKey,
      invoicerCorpName: '푸르른 식탁',
      invoicerCEOName: '관리자',
      invoicerAddr: '서울시 강남구 테헤란로',
      invoicerBizType: '도소매',
      invoicerBizClass: '농수산물',
      invoicerContactName: '고객지원',
      invoicerEmail: 'admin@pureureun.com',

      // 공급받는자 (구매자)
      invoiceeCorpNum: '9999999999999', // 개인용 주민번호 대체 대역 또는 비사업자 기본값
      invoiceeCorpName: orderData.shippingInfo?.name || orderData.customerName || '고객',
      invoiceeCEOName: orderData.shippingInfo?.name || orderData.customerName || '고객',
      invoiceeAddr: orderData.shippingInfo ? `${orderData.shippingInfo.address} ${orderData.shippingInfo.detailAddress || ''}` : '',
      invoiceeEmail1: orderData.customerEmail || '',

      // 금액 정보
      supplyCostTotal: supplyCost.toString(),
      taxTotal: tax.toString(),
      totalAmount: totalAmount.toString(),
    };

    const host = isTest ? 'api-test.popbill.com' : 'api.popbill.com';
    const path = `/TaxInvoice/RegistTS`; // 작성 및 즉시발행 API 경로

    // 팝빌 HMAC Signature 생성
    const dateStr = new Date().toUTCString();
    const bodyStr = JSON.stringify(taxInvoiceData);
    const md5Hash = crypto.createHash('md5').update(bodyStr).digest('base64');
    
    const signString = [
      'POST',
      md5Hash,
      dateStr,
      '1.0',
      path
    ].join('\n');

    const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'base64'));
    const signature = hmac.update(signString).digest('base64');

    // 팝빌 API 요청
    const response = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pb-version': '1.0',
        'x-pb-linkid': linkId,
        'x-pb-auth': signature,
        'Date': dateStr,
      },
      body: bodyStr
    });

    const resultData = await response.json();

    if (!response.ok) {
      throw new Error(resultData.message || `팝빌 API 에러 (코드: ${resultData.code})`);
    }

    // DB 상태 업데이트
    await updateDoc(orderRef, {
      invoiceStatus: 'ISSUED',
      invoiceIssuedAt: new Date(),
      popbillReceiptNum: resultData.receiptNum || '', // 팝빌 접수번호
      updatedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      mode: 'PRODUCTION',
      message: '세금계산서가 성공적으로 발행되었습니다.',
      popbillReceiptNum: resultData.receiptNum || '',
      orderId
    });

  } catch (error: any) {
    console.error('Error issuing tax invoice:', error);
    return res.status(500).json({ error: error.message || '세금계산서 발행 중 서버 에러 발생' });
  }
}
