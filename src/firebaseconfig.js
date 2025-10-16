import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Ambil konfigurasi dari environment variables
const firebaseConfig = {
 apiKey: "AIzaSyDv0zhuaQQFmdxtnWv23tE_ew601RkKbtc",
        authDomain: "fganfinance.firebaseapp.com",
        databaseURL:
            "https://fganfinance-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "fganfinance",
        storageBucket: "fganfinance.firebasestorage.app",
        messagingSenderId: "427567787310",
        appId: "1:427567787310:web:ebe73eed493ff200d89ebf",
        measurementId: "G-14QNBMHYBT"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

export { db, storage };