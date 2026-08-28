// Firebase 최신버전(10.x) 모듈 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// 🌟 에러를 뱉던 예전 방식 대신, 최신 오프라인 캐시 모듈을 가져옵니다.
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 🔥 본인의 파이어베이스 설정값
const firebaseConfig = {
  apiKey: "AIzaSyDUV9N62MqEI9aB51_UW_KA6xa9AP4yvXo",
  authDomain: "triplan-d9209.firebaseapp.com",
  projectId: "triplan-d9209",
  storageBucket: "triplan-d9209.firebasestorage.app",
  messagingSenderId: "858830786187",
  appId: "1:858830786187:web:a364be5a965e200188ce8e"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🌟 핵심 해결책: DB를 처음 켤 때부터 '오프라인 캐시'를 장착시켜서 충돌을 원천 차단합니다!
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

// 구글 로그인 공급자 내보내기
export const provider = new GoogleAuthProvider();
export { signInWithPopup, signOut, onAuthStateChanged };

console.log("Firebase 서버 및 무적 오프라인 모듈 준비 완료! 🚀");