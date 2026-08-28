// Firebase 최신버전(10.x) 모듈 가져오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// 🌟 1. enableIndexedDbPersistence 기능 추가로 가져오기
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 🔥 여기에 Step 2에서 발급받은 본인의 설정값(firebaseConfig)을 넣으세요!
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
export const db = getFirestore(app);

// 🌟 2. DB 초기화 직후에 오프라인(비행기 모드) 캐시 활성화!
enableIndexedDbPersistence(db).catch((err) => {
    console.log("오프라인 모드 에러:", err.message);
});

// 구글 로그인 공급자 내보내기
export const provider = new GoogleAuthProvider();
export { signInWithPopup, signOut, onAuthStateChanged };

console.log("Firebase 서버 및 인증 모듈 준비 완료! 🚀");