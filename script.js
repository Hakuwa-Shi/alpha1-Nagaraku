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

const timeTable = [
    "08:30 - 09:20", // 1限
    "09:30 - 10:20", // 2限
    "10:30 - 11:20", // 3限
    "11:30 - 12:20", // 4限
    "13:05 - 13:55", // 5限
    "14:05 - 14:55", // 6限
    "15:05 - 15:55"  // 7限
];

const dayLabels = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

const scheduleData = {
    "1": {
        "1": {
            1: ["現代文", "数学I", "英語", "物理基礎", "体育", "歴史総合", "探究"],
            2: ["数学I", "現代文", "歴史総合", "英語", "情報", "体育"],
            3: ["英語", "数学I", "現代文", "物理基礎", "歴史総合", "情報"],
            4: ["歴史総合", "英語", "数学I", "現代文", "体育", "物理基礎"],
            5: ["物理基礎", "歴史総合", "英語", "数学I", "現代文", "LHR"]
        }
    },
    "2": {
        "6": {
            1: ["古典探究", "論理表現II", "数学BC", "歴史総合", "化学", "情報I", "数学II"],
            2: ["EC II", "地理総合", "物理", "保健", "探究", "探究"],
            3: ["化学", "体育", "論理表現II", "情報I", "数学BC", "古典探究"],
            4: ["EC II", "数学II", "地理総合", "論理国語", "物理", "歴史総合"],
            5: ["論理国語", "体育", "数学BC", "数学II", "化学", "EC II", "LHR"]
        }
    }
};

let currentGrade = "1";
let currentClass = "1";
let displayDay = 1; 

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
    const loginScreen = document.getElementById('login-screen');
    const setupScreen = document.getElementById('setup-screen');
    const mainContent = document.getElementById('main-content');
    const bottomNav = document.getElementById('bottom-nav');

    const mainLoginBtn = document.getElementById('main-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accountName = document.getElementById('account-name');
    const accountStatus = document.getElementById('account-status');
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoList = document.getElementById('todo-list');
    
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');

    const headerUserContainer = document.getElementById('header-user-container');
    const headerUserBtn = document.getElementById('header-user-btn');
    const userPopup = document.getElementById('user-popup');
    const popupEmail = document.getElementById('popup-email');
    const popupInfo = document.getElementById('popup-info');

    const profileNickname = document.getElementById('profile-nickname');
    const profileGrade = document.getElementById('profile-grade');
    const profileClass = document.getElementById('profile-class');
    const profileNumber = document.getElementById('profile-number');
    const profileSaveBtn = document.getElementById('profile-save-btn');

    const setupNickname = document.getElementById('setup-nickname');
    const setupGrade = document.getElementById('setup-grade');
    const setupClass = document.getElementById('setup-class');
    const setupNumber = document.getElementById('setup-number');
    const setupSaveBtn = document.getElementById('setup-save-btn');

    headerUserBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        userPopup.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        userPopup.classList.remove('active');
    });

    prevDayBtn.addEventListener('click', () => {
        displayDay = (displayDay + 6) % 7; 
        renderSchedule(currentGrade, currentClass, displayDay);
    });

    nextDayBtn.addEventListener('click', () => {
        displayDay = (displayDay + 1) % 7; 
        renderSchedule(currentGrade, currentClass, displayDay);
    });

    mainLoginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch((error) => {
            console.error("ログインエラー:", error);
            alert("ログインに失敗しました。");
        });
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const uid = user.uid;
            const userDocRef = doc(db, "users", uid);
            
            try {
                const userSnap = await getDoc(userDocRef);
                
                if (userSnap.exists()) {
                    showMainApp(user, userSnap.data());
                } else {
                    showSetupScreen();
                }
            } catch (error) {
                console.error("プロフィール確認エラー:", error);
            }
        } else {
            showLoginScreen();
        }
    });

    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        setupScreen.style.display = 'none';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
        headerUserContainer.style.display = 'none'; 
        
        if (unsubscribeTodos) unsubscribeTodos();
    }

    function showSetupScreen() {
        loginScreen.style.display = 'none';
        setupScreen.style.display = 'flex';
        mainContent.style.display = 'none';
        bottomNav.style.display = 'none';
        headerUserContainer.style.display = 'none'; 
    }

    function showMainApp(user, data) {
        loginScreen.style.display = 'none';
        setupScreen.style.display = 'none';
        mainContent.style.display = 'block';
        bottomNav.style.display = 'flex';
        headerUserContainer.style.display = 'block'; 

        popupEmail.innerText = user.email || "アカウント情報なし";
        accountStatus.innerText = `${user.email} でログインしています`;
        
        profileNickname.value = data.nickname || "";
        profileGrade.value = data.grade || "1";
        profileClass.value = data.classNum || "1"; 
        profileNumber.value = data.studentNum || "";
        
        if (data.nickname) {
            accountName.innerText = data.nickname;
        }
        
        currentGrade = data.grade || "1";
        currentClass = data.classNum || "1";

        if (data.grade && data.classNum && data.studentNum) {
            const classInfoText = `${data.grade}年 ${data.classNum}組 ${data.studentNum}番`;
            document.getElementById('account-profile-info').innerText = classInfoText;
            popupInfo.innerText = classInfoText; 
            checkDeveloperBadge(data.grade, data.classNum, data.studentNum);
        } else {
            popupInfo.innerText = "クラス情報未登録";
        }

        loadUserTodos(user.uid);
        
        let now = new Date();
        let currentDay = now.getDay(); 
        if (now.getHours() >= 17) {
            currentDay = (currentDay + 1) % 7; 
        }
        displayDay = currentDay;

        renderSchedule(currentGrade, currentClass, displayDay);
    }

    setupSaveBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;
        
        const nickname = setupNickname.value.trim();
        const grade = setupGrade.value;
        const classNum = setupClass.value;
        const studentNum = setupNumber.value;

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
            currentGrade = grade;
            currentClass = classNum;
            showMainApp(auth.currentUser, profileData);
        } catch (error) {
            console.error("初期設定エラー:", error);
            alert("設定の保存に失敗しました。");
        }
    });

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
            
            currentGrade = profileData.grade;
            currentClass = profileData.classNum;

            if (profileData.nickname) {
                accountName.innerText = profileData.nickname;
            }
            
            if (profileData.grade && profileData.classNum && profileData.studentNum) {
                const classInfoText = `${profileData.grade}年 ${profileData.classNum}組 ${profileData.studentNum}番`;
                document.getElementById('account-profile-info').innerText = classInfoText;
                popupInfo.innerText = classInfoText; 
                checkDeveloperBadge(profileData.grade, profileData.classNum, profileData.studentNum);
                
                renderSchedule(currentGrade, currentClass, displayDay);
            }
        } catch (error) {
            console.error("プロフィール保存エラー:", error);
            alert("保存に失敗しました。");
        }
    });

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
                todoList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">タスクはすべて完了です！</p>';
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

    function checkDeveloperBadge(grade, classNum, studentNum) {
        const devBadge = document.getElementById('developer-badge');
        if (grade === "2" && classNum === "6" && studentNum === "16") {
            devBadge.style.display = "inline-block";
        } else {
            devBadge.style.display = "none";
        }
    }

    function renderSchedule(grade, classNum, day) {
        const scheduleList = document.getElementById('schedule-list');
        const dayLabel = document.getElementById('current-day-label');
        
        dayLabel.innerText = dayLabels[day];
        scheduleList.innerHTML = ""; 

        if (day === 0 || day === 6) {
            scheduleList.innerHTML = `
                <div style="text-align:center; color:#888; padding:40px 20px;">
                    <p style="font-weight: bold; color: var(--text-color); font-size: 1.2rem; margin-bottom: 8px;">学校はお休みです</p>
                    <p style="font-size: 0.9rem; line-height: 1.5;">次の登校日に向けてしっかり休みましょう。<br>課題やタスクの確認も忘れずに。</p>
                </div>
            `;
            return;
        }

        if (scheduleData[grade] && scheduleData[grade][classNum] && scheduleData[grade][classNum][day]) {
            const todaySubjects = scheduleData[grade][classNum][day]; 

            todaySubjects.forEach((subject, index) => {
                const period = index + 1; 
                const time = timeTable[index] || "時間未定"; 

                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.innerHTML = `
                    <div class="card-title">${period}限 (${time})</div>
                    <div class="card-main">${subject}</div>
                `;
                scheduleList.appendChild(cardDiv);
            });
        } else {
            scheduleList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">このクラス・曜日の時間割はまだ登録されていません。</p>';
        }
    }
});