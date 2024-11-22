import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  push, 
  onValue, 
  set 
} from 'firebase/database';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let currentUser = null;
let currentChat = null;

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('chatSection').classList.remove('hidden');
    document.getElementById('userEmail').textContent = user.email;
    loadChats();
  } else {
    currentUser = null;
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('chatSection').classList.add('hidden');
  }
});

// Auth functions
window.register = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
};

window.login = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
};

window.logout = () => signOut(auth);

// Chat functions
window.createGroup = async () => {
  const groupName = prompt('Enter group name:');
  if (groupName) {
    const groupRef = ref(db, 'chats');
    await push(groupRef, {
      name: groupName,
      createdBy: currentUser.uid,
      type: 'group'
    });
  }
};

function loadChats() {
  const chatsRef = ref(db, 'chats');
  onValue(chatsRef, (snapshot) => {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    snapshot.forEach((chat) => {
      const chatData = chat.val();
      const div = document.createElement('div');
      div.textContent = chatData.name;
      div.onclick = () => selectChat(chat.key, chatData);
      chatList.appendChild(div);
    });
  });
}

function selectChat(chatId, chatData) {
  currentChat = chatId;
  loadMessages(chatId);
}

function loadMessages(chatId) {
  const messagesRef = ref(db, `messages/${chatId}`);
  onValue(messagesRef, (snapshot) => {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    
    snapshot.forEach((message) => {
      const messageData = message.val();
      const div = document.createElement('div');
      div.className = `message ${messageData.senderId === currentUser.uid ? 'sent' : 'received'}`;
      
      if (messageData.type === 'text') {
        div.textContent = messageData.content;
      } else if (messageData.type === 'image') {
        const img = document.createElement('img');
        img.src = messageData.content;
        img.style.maxWidth = '200px';
        div.appendChild(img);
      }
      
      messagesDiv.appendChild(div);
    });
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

window.sendMessage = async () => {
  if (!currentChat) return;
  
  const messageInput = document.getElementById('messageInput');
  const fileInput = document.getElementById('fileInput');
  const content = messageInput.value.trim();
  const file = fileInput.files[0];
  
  if (!content && !file) return;
  
  const messageRef = ref(db, `messages/${currentChat}`);
  
  if (file) {
    const fileRef = storageRef(storage, `uploads/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    await push(messageRef, {
      type: 'image',
      content: downloadURL,
      senderId: currentUser.uid,
      timestamp: Date.now()
    });
    
    fileInput.value = '';
  }
  
  if (content) {
    await push(messageRef, {
      type: 'text',
      content,
      senderId: currentUser.uid,
      timestamp: Date.now()
    });
    
    messageInput.value = '';
  }
};