import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// ✨ Firestoreの機能をインポート
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 【重要】あなたのFirebase設定値に置き換えてください
const firebaseConfig = {
    apiKey: "AIzaSyDRJK_M5KuILJ3kkOraiEOQNKoJ1fqe7_c", 
    authDomain: "nagata-tankyu-404.firebaseapp.com", 
    projectId: "nagata-tankyu-404", 
    storageBucket: "nagata-tankyu-404.firebasestorage.app", 
    messagingSenderId: "661884514833", 
    appId: "1:661884514833:web:d320cde6caa3f2d4f9b7b0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// ✨ Firestoreの初期化
const db = getFirestore(app);

// リアルタイム通信の監視を止めるための関数を入れておく変数
let unsubscribeTodos = null;

// タブ切り替え関数
window.switchTab = function(tabId, title, btnElement) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('header-title').innerText = title;

    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const accountName = document.getElementById('account-name');
    const accountStatus = document.getElementById('account-status');
    
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');

    // --- Googleログイン・ログアウト処理 ---
    loginBtn.addEventListener('click', () => {
        if (!auth.currentUser) {
            signInWithPopup(auth, provider).catch((error) => {
                console.error("エラー:", error);
                alert("ログインに失敗しました。");
            });
        } else {
            signOut(auth);
        }
    });

    // --- ユーザーのログイン状態を監視するリスナー ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 【ログイン時】
            accountName.innerText = user.displayName;
            accountStatus.innerText = `${user.email} でログインしています`;
            loginBtn.innerText = "ログアウト";
            loginBtn.style.backgroundColor = "var(--danger-color)";

            // ログインしたユーザー専用のTodo読み込みを開始
            loadUserTodos(user.uid);
        } else {
            // 【ログアウト時】
            accountName.innerText = "ゲストユーザー";
            accountStatus.innerText = "Classroomと連携するにはログインしてください。";
            loginBtn.innerText = "Googleでログイン";
            loginBtn.style.backgroundColor = "var(--primary-color)";

            // 監視を止めてTodo画面をクリア
            if (unsubscribeTodos) unsubscribeTodos();
            todoList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">ログインするとタスクを管理できます</p>';
        }
    });

    // --- Todoの追加処理 ---
    // --- Todoの追加処理（調査モード） ---
    todoAddBtn.addEventListener('click', async () => {
        console.log("【チェック1】追加ボタンが押されました！");
        
        const taskText = todoInput.value.trim();
        console.log("【チェック2】入力された文字は:", taskText);
        
        if (!taskText) {
            console.log("⚠️文字が空っぽなので処理を終了しました");
            return; 
        }
        
        console.log("【チェック3】現在のログインユーザーのデータ:", auth.currentUser);
        if (!auth.currentUser) {
            alert("タスクを追加するにはログインが必要です。");
            return;
        }

        try {
            console.log("【チェック4】Firestoreへのデータ送信を開始します...");
            await addDoc(collection(db, "todos"), {
                uid: auth.currentUser.uid,
                text: taskText,
                createdAt: new Date()
            });
            console.log("【チェック5】Firestoreへの保存が完全に成功しました！");
            todoInput.value = ""; // 入力欄を空にする
        } catch (error) {
            console.error("❌データ追加でエラーが発生しました:", error);
        }
    });

    // --- ログインユーザーのTodoをリアルタイムに読み込む関数 ---
    function loadUserTodos(uid) {
        // すでに監視中なら一度ストップ
        if (unsubscribeTodos) unsubscribeTodos();

        // データベースから「このユーザーのUIDと同じデータ」だけを、時間が新しい順に取得するクエリ（命令）
        const q = query(
            collection(db, "todos"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );

        // データベースが更新されるたびに自動で画面を書き換える（リアルタイムリッスン）
        unsubscribeTodos = onSnapshot(q, (querySnapshot) => {
            todoList.innerHTML = ""; // 一度画面をリセット

            if (querySnapshot.empty) {
                todoList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">タスクはすべて完了です！✨</p>';
                return;
            }

            // カードの土台を作成
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';

            querySnapshot.forEach((docSnap) => {
                const todoData = docSnap.data();
                const todoId = docSnap.id; // 削除するときに必要なデータの個別ID

                // Todoの1行分のHTMLを作成
                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item';
                todoItem.innerHTML = `
                    <span>${todoData.text}</span>
                    <button class="delete-btn" data-id="${todoId}">完了</button>
                `;

                // 完了（削除）ボタンのクリックイベントを設定
                todoItem.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    // Firestoreから該当するデータを消去
                    await deleteDoc(doc(db, "todos", id));
                });

                cardDiv.appendChild(todoItem);
            });

            todoList.appendChild(cardDiv);
        }, (error) => {
            console.error("Firestore読み込みエラー:", error);
            // ※「インデックスが必要です」というエラーが出た場合はエラーログのURLをクリックして1秒で解決できます
        });
    }
});