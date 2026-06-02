import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, orderBy, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

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
    // 画面要素の取得
    const loginScreen = document.getElementById('login-screen');
    const setupScreen = document.getElementById('setup-screen');
    const mainContent = document.getElementById('main-content');
    const bottomNav = document.getElementById('bottom-nav');
    const headerTitle = document.getElementById('header-title');

    // 各種ボタンと要素
    const mainLoginBtn = document.getElementById('main-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accountName = document.getElementById('account-name');
    const accountStatus = document.getElementById('account-status');
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');
    
    // アカウント画面の設定フォーム
    const profileNickname = document.getElementById('profile-nickname');
    const profileGrade = document.getElementById('profile-grade');
    const profileClass = document.getElementById('profile-class');
    const profileNumber = document.getElementById('profile-number');
    const profileSaveBtn = document.getElementById('profile-save-btn');

    // 初期設定画面のフォーム
    const setupNickname = document.getElementById('setup-nickname');
    const setupGrade = document.getElementById('setup-grade');
    const setupClass = document.getElementById('setup-class');
    const setupNumber = document.getElementById('setup-number');
    const setupSaveBtn = document.getElementById('setup-save-btn');

    // --- ログイン処理 ---
    mainLoginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error("ログインエラー:", error);
            alert("ログインに失敗しました。");
        });
    });

    // --- ログアウト処理 ---
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    // --- ログイン状態の監視 ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ログイン済みの場合は、まずプロフィールデータがあるか確認する
            const uid = user.uid;
            const userDocRef = doc(db, "users", uid);
            
            try {
                const userSnap = await getDoc(userDocRef);
                
                if (userSnap.exists()) {
                    // データがある（＝すでに初期設定済み）なら、メイン画面を表示
                    showMainApp(user, userSnap.data());
                } else {
                    // データがない（＝初めてのログイン）なら、初期設定画面を表示
                    showSetupScreen();
                }
            } catch (error) {
                console.error("プロフィール確認エラー:", error);
            }
        } else {
            // ログアウト時（未ログイン時）は、強制ログイン画面を表示
            showLoginScreen();
        }
    });

    // --- 画面切り替え用の関数 ---
    
    // 1. 強制ログイン画面を表示
    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        setupScreen.style.display = 'none';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
        headerTitle.style.display = 'none';
        
        if (unsubscribeTodos) unsubscribeTodos();
    }

    // 2. 初期設定画面を表示
    function showSetupScreen() {
        loginScreen.style.display = 'none';
        setupScreen.style.display = 'flex';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
        headerTitle.style.display = 'none';
    }

    // 3. メイン画面（アプリ本体）を表示
    function showMainApp(user, data) {
        loginScreen.style.display = 'none';
        setupScreen.style.display = 'none';
        mainContent.style.display = 'block';
        bottomNav.style.display = 'flex';
        headerTitle.style.display = 'block';

        // アカウント画面の表示を更新
        accountStatus.innerText = `${user.email} でログインしています`;
        
        // 読み込んだデータをアカウント画面の設定フォームにもセット
        profileNickname.value = data.nickname || "";
        profileGrade.value = data.grade || "1";
        profileClass.value = data.classNum || "1"; 
        profileNumber.value = data.studentNum || "";
        
        if (data.nickname) {
            accountName.innerText = data.nickname;
        }
        
        if (data.grade && data.classNum && data.studentNum) {
            document.getElementById('account-profile-info').innerText = `${data.grade}年 ${data.classNum}組 ${data.studentNum}番`;
            checkDeveloperBadge(data.grade, data.classNum, data.studentNum);
        }

        // タスクの読み込みを開始
        loadUserTodos(user.uid);
    }

    // --- 初期設定画面の「はじめる」ボタン処理 ---
    setupSaveBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        
        const nickname = setupNickname.value.trim();
        const grade = setupGrade.value;
        const classNum = setupClass.value;
        const studentNum = setupNumber.value;

        // 入力チェック
        if (!nickname || !studentNum) {
            alert("ニックネームと出席番号は必ず入力してください！");
            return;
        }

        const uid = auth.currentUser.uid;
        const profileData = {
            nickname: nickname,
            grade: grade,
            classNum: classNum,
            studentNum: studentNum,
            updatedAt: new Date()
        };

        try {
            await setDoc(doc(db, "users", uid), profileData, { merge: true });
            // 保存に成功したら、そのままメイン画面へ移行
            showMainApp(auth.currentUser, profileData);
        } catch (error) {
            console.error("初期設定エラー:", error);
            alert("設定の保存に失敗しました。");
        }
    });

    // --- アカウント画面の「保存する」ボタン処理（既存の処理） ---
    profileSaveBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        
        const uid = auth.currentUser.uid;
        const profileData = {
            nickname: profileNickname.value.trim(),
            grade: profileGrade.value,
            classNum: profileClass.value,
            studentNum: profileNumber.value,
            updatedAt: new Date()
        };

        if (!profileData.nickname || !profileData.studentNum) {
            alert("ニックネームと出席番号は必ず入力してください！");
            return;
        }

        try {
            await setDoc(doc(db, "users", uid), profileData, { merge: true });
            alert("プロフィールを更新しました！");
            
            if (profileData.nickname) {
                accountName.innerText = profileData.nickname;
            }
            
            if (profileData.grade && profileData.classNum && profileData.studentNum) {
                document.getElementById('account-profile-info').innerText = `${profileData.grade}年 ${profileData.classNum}組 ${profileData.studentNum}番`;
                checkDeveloperBadge(profileData.grade, profileData.classNum, profileData.studentNum);
            }
        } catch (error) {
            console.error("プロフィール保存エラー:", error);
            alert("保存に失敗しました。");
        }
    });

    // --- Todoの追加処理 ---
    todoAddBtn.addEventListener('click', async () => {
        const taskText = todoInput.value.trim();
        if (!taskText || !auth.currentUser) return; 

        try {
            await addDoc(collection(db, "todos"), {
                uid: auth.currentUser.uid,
                text: taskText,
                createdAt: new Date()
            });
            todoInput.value = ""; 
        } catch (error) {
            console.error("データ追加エラー:", error);
        }
    });

    // --- Todoの読み込み関数 ---
    function loadUserTodos(uid) {
        if (unsubscribeTodos) unsubscribeTodos();

        const q = query(
            collection(db, "todos"),
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );

        unsubscribeTodos = onSnapshot(q, (querySnapshot) => {
            todoList.innerHTML = ""; 

            if (querySnapshot.empty) {
                todoList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">タスクはすべて完了です！✨</p>';
                return;
            }

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';

            querySnapshot.forEach((docSnap) => {
                const todoData = docSnap.data();
                const todoId = docSnap.id; 

                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item';
                todoItem.innerHTML = `
                    <span>${todoData.text}</span>
                    <button class="delete-btn" data-id="${todoId}">完了</button>
                `;

                todoItem.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    await deleteDoc(doc(db, "todos", id));
                });

                cardDiv.appendChild(todoItem);
            });

            todoList.appendChild(cardDiv);
        }, (error) => {
            console.error("Firestore読み込みエラー:", error);
        });
    }

    // --- 開発者バッジの判定関数 ---
    function checkDeveloperBadge(grade, classNum, studentNum) {
        const devBadge = document.getElementById('developer-badge');
        if (grade === "2" && classNum === "6" && studentNum === "16") {
            devBadge.style.display = "inline-block";
        } else {
            devBadge.style.display = "none";
        }
    }
});