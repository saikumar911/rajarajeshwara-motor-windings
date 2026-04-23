import { db, collection, getDocs } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const loadingIndicator = document.getElementById('loadingIndicator');

    let allBills = [];
    let debounceTimer;

    async function fetchBills() {
        try {
            loadingIndicator.classList.remove('hidden');
            const querySnapshot = await getDocs(collection(db, "bills"));
            allBills = [];
            querySnapshot.forEach((doc) => {
                allBills.push({ id: doc.id, ...doc.data() });
            });
            loadingIndicator.classList.add('hidden');
        } catch (error) {
            console.error("Error fetching bills: ", error);
            loadingIndicator.classList.add('hidden');
            searchResults.innerHTML = `<div class="no-results"><p style="color: var(--danger);">Error loading bills from Firebase.</p></div>`;
        }
    }

    function renderResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = `<div class="no-results">No matching bills found.</div>`;
            return;
        }

        results.forEach(bill => {
            const billNumber = bill.billNo || bill.id;
            const customerName = bill.customerName || 'Unknown Customer';
            const dateStr = bill.dateString || 'Unknown Date';
            const total = bill.total || 0;

            const card = document.createElement('div');
            card.className = 'bill-item';
            card.innerHTML = `
                <div class="bill-item-header">
                    <span class="bill-id">#${billNumber}</span>
                    <span class="bill-date">📅 ${dateStr}</span>
                </div>
                <div>
                    <p style="margin-bottom: 0.5rem; color: var(--text-main);"><strong>Customer:</strong> ${customerName}</p>
                    <div style="color: var(--success); font-weight: 700; font-size: 1.1rem;">₹${Number(total).toLocaleString()}</div>
                </div>
            `;
            searchResults.appendChild(card);
        });
    }

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const searchTerm = e.target.value.toLowerCase().trim();
        
        debounceTimer = setTimeout(() => {
            if (!searchTerm) {
                searchResults.innerHTML = '';
                return;
            }

            const filteredBills = allBills.filter(bill => {
                const billNoStr = String(bill.billNo || bill.id).toLowerCase();
                const customerStr = String(bill.customerName || '').toLowerCase();
                const dateStr = String(bill.dateString || '').toLowerCase();

                return billNoStr.includes(searchTerm) || 
                       customerStr.includes(searchTerm) || 
                       dateStr.includes(searchTerm);
            });

            renderResults(filteredBills);
        }, 300);
    });

    fetchBills();
});
