import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface ProductOption {
  name: string;
  priceOffset: number;
}

export interface ProductDetail {
  id: string;        // 파이어베이스 문서 ID 겸 tossId로 사용
  tossId: string;    // 하위 호환을 위해 남김
  name: string;
  description: string;
  image: string;
  options: ProductOption[];
  secondaryOptions?: ProductOption[];
  price: number;     // 기본 가격
  createdAt?: number;
}

const COLLECTION_NAME = 'products';

// 모든 상품 가져오기
export async function getAllProducts(): Promise<ProductDetail[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const products: ProductDetail[] = [];
  querySnapshot.forEach((doc) => {
    products.push({ id: doc.id, ...doc.data() } as ProductDetail);
  });
  // 오래된 순 또는 등록 순 정렬이 필요하면 여기서 sort
  return products.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// 특정 상품 가져오기
export async function getProduct(id: string): Promise<ProductDetail | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ProductDetail;
  }
  return null;
}

// 새 상품 생성
export async function createProduct(id: string, productData: Omit<ProductDetail, 'id'>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await setDoc(docRef, {
    ...productData,
    createdAt: Date.now()
  });
}

// 상품 업데이트
export async function updateProduct(id: string, productData: Partial<ProductDetail>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, productData);
}

// 상품 삭제
export async function deleteProduct(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// ── 초기 데이터 세팅 함수 ──
export async function initializeProducts(initialData: Omit<ProductDetail, 'id'>[]) {
  // 이미 데이터가 있는지 확인
  const existing = await getAllProducts();
  if (existing.length > 0) {
    console.log('[productService] 상품 데이터가 이미 존재합니다. 초기화를 건너뜁니다.');
    return;
  }

  console.log('[productService] 상품 데이터 초기화 중...');
  for (const prod of initialData) {
    await createProduct(prod.tossId, prod);
  }
  console.log('[productService] 상품 데이터 초기화 완료');
}
