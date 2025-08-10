import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInAnonymously
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

// This is your correct Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCGqYymOlmLddLqBgjTpS3IVG11PYk-E14",
  authDomain: "new-web-app-87801.firebaseapp.com",
  projectId: "new-web-app-87801",
  storageBucket: "new-web-app-87801.firebasestorage.app",
  messagingSenderId: "743815065338",
  appId: "1:743815065338:web:2ea31b001e7e1b931c6343",
  measurementId: "G-XS019V68VG"
};


// A unique ID for this application instance.
const appId = 'my-final-chat-app';

// --- Main App Component ---
export default function App() {
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);

    // This effect runs once to initialize Firebase and sign in the user.
    useEffect(() => {
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("REPLACE")) {
            setError("Firebase configuration is missing. Please paste your firebaseConfig object into src/App.js.");
            return;
        }
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    setIsReady(true);
                } else {
                    try {
                        await signInAnonymously(authInstance);
                    } catch (authError) {
                        console.error("CRITICAL: Anonymous sign-in failed.", authError);
                        setError(`Authentication Failed: ${authError.message}. Please check your Firebase project settings.`);
                    }
                }
            });
            return () => unsubscribe();
        } catch (initError) {
            console.error("CRITICAL: Firebase initialization failed.", initError);
            setError(`Firebase Initialization Failed: ${initError.message}. Please check your firebaseConfig object.`);
        }
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-100 font-sans">
            <header className="bg-white shadow-md p-4">
                <h1 className="text-xl font-bold text-gray-800">Real-Time Chat</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                {error ? (
                    <div className="flex items-center justify-center h-full text-center">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Configuration Error!</strong>
                            <p className="block sm:inline ml-2">{error}</p>
                        </div>
                    </div>
                ) : isReady && db && user ? (
                    <ChatRoom db={db} user={user} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Connecting to chat service...</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// --- ChatRoom Component ---
function ChatRoom({ db, user }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const messagesCollectionPath = `apps/${appId}/messages`;

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, messagesCollectionPath), orderBy('createdAt'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(fetchedMessages);
        }, (err) => {
            console.error("Error fetching messages:", err);
        });
        return () => unsubscribe();
    }, [db, messagesCollectionPath]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !db) return;
        try {
            await addDoc(collection(db, messagesCollectionPath), {
                text: newMessage,
                createdAt: serverTimestamp(),
                uid: user.uid,
            });
            setNewMessage('');
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {messages.map((msg) => <ChatMessage key={msg.id} message={msg} currentUser={user} />)}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex items-center space-x-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white rounded-full p-3 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
                    disabled={!newMessage.trim()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
            </form>
        </div>
    );
}

// --- ChatMessage Component ---
function ChatMessage({ message, currentUser }) {
    const { text, uid } = message;
    const isCurrentUser = uid === currentUser.uid;
    const messageClass = isCurrentUser ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 text-gray-800 self-start';
    const containerClass = isCurrentUser ? 'justify-end' : 'justify-start';

    return (
        <div className={`flex ${containerClass}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 shadow ${messageClass}`}>
                <p className="text-sm">{text}</p>
            </div>
        </div>
    );
}
