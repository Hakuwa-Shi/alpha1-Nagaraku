import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Firestoreの機能をインポート
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, orderBy, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebaseの設定値
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
    // ⚙️ HTMLの要素をすべて最初にまとめて取得
    const loginBtn = document.getElementById('login-btn');
    const accountName = document.getElementById('account-name');
    const accountStatus = document.getElementById('account-status');
    
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');

    const profileSettings = document.getElementById('profile-settings');
    const profileNickname = document.getElementById('profile-nickname');
    const profileGrade = document.getElementById('profile-grade');
    const profileClass = document.getElementById('profile-class');
    const profileNumber = document.getElementById('profile-number');
    const profileSaveBtn = document.getElementById('profile-save-btn');

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
            
            // プロフィール設定フォームを表示して、データを読み込む
            profileSettings.style.display = "block";
            loadUserProfile(user.uid);
            loadUserTodos(user.uid);
        } else {
            // 【ログアウト時】
            accountName.innerText = "ゲストユーザー";
            document.getElementById('account-profile-info').innerText = ""; 
            accountStatus.innerText = "Classroomと連携するにはログインしてください。";
            document.getElementById('developer-badge').style.display = "none"; 
            profileSettings.style.display = "none";

            if (unsubscribeTodos) unsubscribeTodos();
            todoList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">ログインするとタスクを管理できます</p>';
        }
    });

    // --- Todoの追加処理 ---
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
            todoInput.value = ""; 
        } catch (error) {
            console.error("❌データ追加でエラーが発生しました:", error);
        }
    });

    // --- ログインユーザーのTodoをリアルタイムに読み込む関数 ---
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

    // === 👤 プロフィール（クラス情報）機能 ===
    
    // 開発者バッジの判定関数
    function checkDeveloperBadge(grade, classNum, studentNum) {
        const devBadge = document.getElementById('developer-badge');
        if (grade === "2" && classNum === "6" && studentNum === "16") {
            devBadge.style.display = "inline-block";
        } else {
            devBadge.style.display = "none";
        }
    }

    // ログインユーザーのプロフィールを読み込む関数
    async function loadUserProfile(uid) {
        try {
            const userDocRef = doc(db, "users", uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                profileNickname.value = data.nickname || "";
                profileGrade.value = data.grade || "1";
                profileClass.value = data.classNum || "1"; 
                profileNumber.value = data.studentNum || "";
                
                if (data.nickname) {
                    document.getElementById('account-name').innerText = data.nickname;
                }
                
                if (data.grade && data.classNum && data.studentNum) {
                    document.getElementById('account-profile-info').innerText = `${data.grade}年 ${data.classNum}組 ${data.studentNum}番`;
                    checkDeveloperBadge(data.grade, data.classNum, data.studentNum);
                }
            }
        } catch (error) {
            console.error("プロフィール読み込みエラー:", error);
        }
    }

    // 保存ボタンが押された時の処理
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

        try {
            await setDoc(doc(db, "users", uid), profileData, { merge: true });
            alert("プロフィールを保存しました！");
            
            if (profileData.nickname) {
                document.getElementById('account-name').innerText = profileData.nickname;
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
}); // 👈 ここで綺麗に完結させました！