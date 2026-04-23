import { db, collection, getDocs } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const billsList = document.getElementById('billsList');
    const loadingIndicator = document.getElementById('loadingIndicator');

    async function fetchAllBills() {
        try {
            const querySnapshot = await getDocs(collection(db, "bills"));
            const bills = [];
            querySnapshot.forEach((doc) => {
                bills.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by date descending if possible
            bills.sort((a, b) => {
                const dateA = a.date ? a.date.toMillis() : 0;
                const dateB = b.date ? b.date.toMillis() : 0;
                return dateB - dateA;
            });

            loadingIndicator.classList.add('hidden');
            renderBills(bills);
        } catch (error) {
            console.error("Error fetching bills: ", error);
            loadingIndicator.classList.add('hidden');
            billsList.innerHTML = `<div class="no-results"><p style="color: var(--danger);">Error loading bills: ${error.message}</p></div>`;
        }
    }

    function renderBills(bills) {
        if (bills.length === 0) {
            billsList.innerHTML = `<div class="no-results">No bills found in the database.</div>`;
            return;
        }

        bills.forEach((bill) => {
            const billNumber = bill.billNo || bill.id;
            const customerName = bill.customerName || 'Unknown Customer';
            const dateStr = bill.dateString || 'Unknown Date';
            const total = bill.total || 0;
            const items = bill.items || [];
            
            let itemsHTML = '';
            if (items.length > 0) {
                itemsHTML = `<table style="width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                                        <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500;">Item</th>
                                        <th style="padding: 0.5rem; color: var(--text-muted); font-weight: 500; text-align: right;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                items.forEach(item => {
                    itemsHTML += `<tr>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">${item.name}</td>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: right;">₹${item.price.toFixed(2)}</td>
                                  </tr>`;
                });
                itemsHTML += `  </tbody>
                             </table>`;
            } else {
                itemsHTML = '<p style="color: var(--text-muted); margin-top: 1rem;">No items recorded.</p>';
            }

            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            
            accordionItem.innerHTML = `
                <div class="accordion-header">
                    <div><strong style="color: #a78bfa;">#${billNumber}</strong></div>
                    <div class="col-customer" style="color: var(--text-main); font-weight: 500;">👤 ${customerName}</div>
                    <div style="color: var(--success); font-weight: 700; text-align: right; padding-right: 1rem;">₹${Number(total).toLocaleString()}</div>
                    <div class="accordion-icon" style="text-align: right;">▼</div>
                </div>
                <div class="accordion-content">
                    <div class="accordion-inner details-grid">
                        <div>
                            <p style="margin-bottom: 0.5rem;"><strong>Date:</strong> <span style="color: var(--text-muted)">${dateStr}</span></p>
                            <p style="margin-bottom: 0.5rem;"><strong>Customer:</strong> <span style="color: var(--text-muted)">${customerName}</span></p>
                            <p style="margin-bottom: 0.5rem;"><strong>Total Amount:</strong> <span style="color: var(--success); font-weight: bold;">₹${Number(total).toLocaleString()}</span></p>
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px;">
                            <strong style="color: #a78bfa;">Items Purchased:</strong>
                            ${itemsHTML}
                        </div>
                    </div>
                </div>
            `;

            const header = accordionItem.querySelector('.accordion-header');
            header.addEventListener('click', () => {
                const isActive = accordionItem.classList.contains('active');
                
                document.querySelectorAll('.accordion-item').forEach(item => {
                    item.classList.remove('active');
                });

                if (!isActive) {
                    accordionItem.classList.add('active');
                }
            });

            billsList.appendChild(accordionItem);
        });
    }

    fetchAllBills();
});
