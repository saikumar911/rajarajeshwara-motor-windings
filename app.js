import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmT00ZhcM4C-eemno9leJLj1MOMcoNeV8",
    authDomain: "skchat-ee1cf.firebaseapp.com",
    databaseURL: "https://skchat-ee1cf-default-rtdb.firebaseio.com",
    projectId: "skchat-ee1cf",
    storageBucket: "skchat-ee1cf.firebasestorage.app",
    messagingSenderId: "588663804980",
    appId: "1:588663804980:web:229a007e58f95bc35fa661",
    measurementId: "G-8T4K4YCXRJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// App State
let products = [];
let currentBillItems = [];
let billTotal = 0;
let currentBillNumber = '';

// Default Products (As requested by User)
const defaultProducts = ["motor winding", "pump repair", "motor bushes"];

// DOM Elements
const productSelect = document.getElementById('productSelect');
const newProductNameInput = document.getElementById('newProductName');
const addNewProductBtn = document.getElementById('addNewProductBtn');
const customerNameInput = document.getElementById('customerName');
const displayCustomerName = document.getElementById('displayCustomerName');
const productPriceInput = document.getElementById('productPrice');
const addItemBtn = document.getElementById('addItemBtn');
const billItemsList = document.getElementById('billItemsList');
const billTotalSpan = document.getElementById('billTotal');
const billDateSpan = document.getElementById('billDate');
const billTimeSpan = document.getElementById('billTime');
const billNumberDisplay = document.getElementById('billNumberDisplay');
const printBtn = document.getElementById('printBtn');
const shareWhatsappBtn = document.getElementById('shareWhatsappBtn');
const saveBillBtn = document.getElementById('saveBillBtn');

// Initialize App
async function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000 * 60); // Update every minute
    
    generateNewBillNumber();
    
    await loadProducts();
    
    // Attach Event Listeners
    addNewProductBtn.addEventListener('click', handleAddProduct);
    addItemBtn.addEventListener('click', handleAddItemToBill);
    customerNameInput.addEventListener('input', (e) => {
        displayCustomerName.textContent = e.target.value.trim() || 'N/A';
    });
    printBtn.addEventListener('click', () => window.print());
    shareWhatsappBtn.addEventListener('click', handleWhatsAppShare);
    saveBillBtn.addEventListener('click', handleSaveBill);

    // Initial Render
    renderBillItems();
}

/**
 * Generate a random 6 digit bill number
 */
function generateNewBillNumber() {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    currentBillNumber = `BILL-${randomDigits}`;
    if (billNumberDisplay) {
        billNumberDisplay.textContent = currentBillNumber;
    }
}

/**
 * Update the Date and Time in the UI
 */
function updateDateTime() {
    const now = new Date();
    // 21/03/2026 format
    billDateSpan.textContent = now.toLocaleDateString('en-GB');
    // 08:55 PM format
    billTimeSpan.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fetch products from Firestore `products` collection.
 * If empty, populate with initial default products.
 */
async function loadProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = [];
        
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, name: doc.data().name });
        });

        // Initialize Defaults if collection is empty
        if (products.length === 0) {
            console.log("No products found, initializing defaults...");
            for (const name of defaultProducts) {
                const docRef = await addDoc(collection(db, "products"), { name, createdAt: serverTimestamp() });
                products.push({ id: docRef.id, name });
            }
        }

        renderProductSelect();
    } catch (error) {
        console.error("Error loading products:", error);
        alert("Failed to load products from database.");
        // Fallback for UI if DB fails
        products = defaultProducts.map(name => ({ id: name, name }));
        renderProductSelect();
    }
}

/**
 * Render the Product Dropdown Select Menu
 */
function renderProductSelect() {
    productSelect.innerHTML = '<option value="" disabled selected>Select a product...</option>';
    
    // Alphabetically sort products for better UX
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        productSelect.appendChild(opt);
    });
}

/**
 * Add a Custom Product to the Firestore Database
 */
async function handleAddProduct() {
    const name = newProductNameInput.value.trim();
    if (!name) return alert('Please enter a custom product name.');

    // Prevent Duplicates Locally
    if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return alert('This product already exists in the list!');
    }

    try {
        addNewProductBtn.disabled = true;
        addNewProductBtn.textContent = "Saving...";
        
        const docRef = await addDoc(collection(db, "products"), { 
            name,
            createdAt: serverTimestamp()
        });
        
        products.push({ id: docRef.id, name });
        renderProductSelect();
        
        newProductNameInput.value = ''; // Clear Input
        alert('Product added successfully!');
    } catch (e) {
        console.error("Error adding custom product: ", e);
        alert('Failed to add custom product. Check permissions or connection.');
    } finally {
        addNewProductBtn.disabled = false;
        addNewProductBtn.textContent = "Save Product";
    }
}

/**
 * Add a selected product and price to the current bill state
 */
function handleAddItemToBill() {
    const name = productSelect.value;
    const priceStr = productPriceInput.value;
    const price = parseFloat(priceStr);

    if (!name) return alert('Please select a product from the list.');
    if (isNaN(price) || price < 0) return alert('Please enter a valid positive price.');

    // Add to state
    currentBillItems.push({
        id: Date.now().toString(), // unique temp ID for removing
        name,
        price
    });
    
    // Clear Input
    productSelect.selectedIndex = 0;
    productPriceInput.value = '';

    // Re-render
    renderBillItems();
}

/**
 * Remove an item from the current bill
 */
function removeBillItem(id) {
    currentBillItems = currentBillItems.filter(item => item.id !== id);
    renderBillItems();
}

/**
 * Render the Items Table in the Bill Preview
 */
function renderBillItems() {
    billItemsList.innerHTML = '';
    billTotal = 0;

    if (currentBillItems.length === 0) {
        billItemsList.innerHTML = '<tr class="empty-row"><td colspan="3" class="text-center">No items added yet.</td></tr>';
        billTotalSpan.textContent = "0.00";
        return;
    }

    currentBillItems.forEach(item => {
        billTotal += item.price;
        
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = item.name;
        
        const tdPrice = document.createElement('td');
        tdPrice.className = 'text-right';
        tdPrice.textContent = `₹${item.price.toFixed(2)}`;
        
        const tdAction = document.createElement('td');
        tdAction.className = 'action-col text-center no-print';
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.textContent = 'Remove';
        delBtn.onclick = () => removeBillItem(item.id);
        
        tdAction.appendChild(delBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdPrice);
        tr.appendChild(tdAction);
        
        billItemsList.appendChild(tr);
    });

    billTotalSpan.textContent = billTotal.toFixed(2);
}

/**
 * Generate an image of the bill and share to WhatsApp
 */
async function handleWhatsAppShare() {
    if (currentBillItems.length === 0) return alert("Please add at least one item to the bill before sharing.");
    
    const billElement = document.getElementById('printableBill');
    
    // Temporarily hide action columns / remove buttons
    const actionCols = document.querySelectorAll('.action-col');
    actionCols.forEach(el => el.style.display = 'none');
    
    const originalShadow = billElement.style.boxShadow;
    billElement.style.boxShadow = 'none'; // clean image capture
    
    shareWhatsappBtn.disabled = true;
    shareWhatsappBtn.textContent = "Processing...";
    
    try {
        const canvas = await window.html2canvas(billElement, {
            scale: 2, // high resolution
            backgroundColor: '#ffffff'
        });
        
        canvas.toBlob(async (blob) => {
            if (!blob) return alert('Failed to generate image.');
            
            const file = new File([blob], 'bill.png', { type: 'image/png' });
            
            // Try Web Share API with file support (Works on Mobile/some Desktop)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Rajarajeshwara Motor Winding Bill',
                        text: 'Here is your bill.'
                    });
                } catch (err) {
                    console.log('Share canceled or failed:', err);
                }
            } else {
                // Fallback: Copy to Clipboard (For Desktop WhatsApp Web)
                try {
                    const item = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([item]);
                    alert('Bill copied as Image! You can now Paste (Ctrl+V) it directly into your WhatsApp Web chat.');
                } catch (err) {
                    console.error('Clipboard copy failed:', err);
                    alert('Direct sharing is not supported on this browser. Downloading image instead so you can send it manually.');
                    // Fallback to Download
                    const link = document.createElement('a');
                    link.download = 'bill.png';
                    link.href = URL.createObjectURL(blob);
                    link.click();
                }
            }
        }, 'image/png');
    } catch (error) {
        console.error("Error generating image:", error);
        alert('Failed to generate bill image.');
    } finally {
        actionCols.forEach(el => el.style.display = ''); // restore
        billElement.style.boxShadow = originalShadow;
        shareWhatsappBtn.disabled = false;
        shareWhatsappBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> WhatsApp';
    }
}

/**
 * Save final bill object to Firestore `bills` collection
 */
async function handleSaveBill() {
    if (currentBillItems.length === 0) return alert("Please add at least one item to the bill before saving.");
    const customerName = customerNameInput.value.trim() || 'Unknown';
    
    // Convert current date/time to a simple string for easy querying
    const dateStr = new Date().toLocaleDateString('en-GB');

    try {
        saveBillBtn.disabled = true;
        saveBillBtn.textContent = "Saving...";
        
        const billData = {
            billNo: currentBillNumber,
            customerName,
            items: currentBillItems.map(item => ({ name: item.name, price: item.price })), // strip out temp IDs
            total: billTotal,
            dateString: dateStr, // stored as string for easier search
            date: serverTimestamp() // Set DB Timestamp
        };
        
        await addDoc(collection(db, "bills"), billData);
        
        alert("Bill saved successfully into the database!");
        
        // Reset the form for the next bill
        customerNameInput.value = '';
        displayCustomerName.textContent = 'N/A';
        currentBillItems = [];
        renderBillItems();
        generateNewBillNumber(); // generate new bill number for next customer
        
    } catch (e) {
        console.error("Error saving bill: ", e);
        alert("Failed to save bill. Check permissions or connection.");
    } finally {
        saveBillBtn.disabled = false;
        saveBillBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save Bill';
    }
}

export { app, db, collection, getDocs, serverTimestamp };
// Start The App
init();
