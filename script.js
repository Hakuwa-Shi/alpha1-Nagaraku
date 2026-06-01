// Firebaseの機能をインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 【重要】あなたのFirebase設定値に置き換えてください
const firebaseConfig = {
    apiKey: "AIzaSyDRJK_M5KuILJ3kkOraiEOQNKoJ1fqe7_c",
    authDomain: "nagata-tankyu-404.firebaseapp.com",
    projectId: "nagata-tankyu-404",
    storageBucket: "nagata-tankyu-404.firebasestorage.app",
    messagingSenderId: "661884514833",
    appId: "1:661884514833:web:d320cde6caa3f2d4f9b7b0"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// HTMLのonclickから呼び出せるように、タブ切り替え関数をグローバル（window）に登録
window.switchTab = function(tabId, title, btnElement) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('header-title').innerText = title;

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

// 画面が読み込まれた後の処理
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const accountName = document.getElementById('account-name');
    const accountStatus = document.getElementById('account-status');

    // ログイン・ログアウトボタンが押された時の処理
    loginBtn.addEventListener('click', () => {
        if (!auth.currentUser) {
            // 未ログインならポップアップでGoogleログインを実行
            signInWithPopup(auth, provider)
                .then((result) => {
                    console.log("ログイン成功:", result.user);
                }).catch((error) => {
                    console.error("エラー:", error);
                    alert("ログインに失敗しました。");
                });
        } else {
            // ログイン済みならログアウトを実行
            signOut(auth).then(() => {
                console.log("ログアウトしました");
            });
        }
    });

    // ユーザーのログイン状態を24時間監視するリスナー
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ログインしている時：Googleアカウントの情報を画面に反映
            accountName.innerText = user.displayName; // 名前（例：山田太郎）
            accountStatus.innerText = `${user.email} でログインしています`;
            loginBtn.innerText = "ログアウト";
            loginBtn.style.backgroundColor = "#e06666"; // ボタンを赤色に
        } else {
            // ログアウトしている時：ゲスト表示に戻す
            accountName.innerText = "ゲストユーザー";
            accountStatus.innerText = "Classroomと連携するにはログインしてください。";
            loginBtn.innerText = "Googleでログイン";
            loginBtn.style.backgroundColor = "#4A90E2"; // ボタンを青色に
        }
    });
});