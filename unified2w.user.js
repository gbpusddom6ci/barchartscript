// ==UserScript==
// @name         Barchart Historical Data Auto Downloader (Unified)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Tek script'ten tüm interval'lar için otomatik indirme (12, 20, 60, 90 min)
// @author       You
// @match        https://www.barchart.com/futures/quotes/*/historical-download
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let selectedInterval = '12'; // Varsayılan

    function generateDateRanges() {
        const ranges = [];
        const startDate = new Date('2025-01-05');
        const today = new Date();

        let currentSunday = new Date(startDate);

        while (currentSunday <= today) {
            const endDate = new Date(currentSunday);
            endDate.setDate(endDate.getDate() + 12);

            if (endDate > today) {
                endDate.setTime(today.getTime());
            }

            ranges.push({
                start: formatDate(currentSunday),
                end: formatDate(endDate)
            });

            currentSunday.setDate(currentSunday.getDate() + 7);
        }

        return ranges;
    }

    function formatDate(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    function fillFormAndDownload(startDate, endDate, minValue) {
        const minField = document.querySelector('input.js-chart-form-minutes, input[name="aggregation"]');
        if (minField) {
            minField.value = minValue;
            minField.dispatchEvent(new Event('input', { bubbles: true }));
            minField.dispatchEvent(new Event('change', { bubbles: true }));
            minField.dispatchEvent(new Event('blur', { bubbles: true }));
        } else {
            console.warn('Min field bulunamadı!');
        }

        const startDateField = document.querySelector('input[name="dateFrom"]');
        if (startDateField) {
            startDateField.value = startDate;
            startDateField.dispatchEvent(new Event('input', { bubbles: true }));
            startDateField.dispatchEvent(new Event('change', { bubbles: true }));
            startDateField.dispatchEvent(new Event('blur', { bubbles: true }));
        } else {
            console.warn('Start date field bulunamadı!');
        }

        const endDateField = document.querySelector('input[name="dateTo"]');
        if (endDateField) {
            endDateField.value = endDate;
            endDateField.dispatchEvent(new Event('input', { bubbles: true }));
            endDateField.dispatchEvent(new Event('change', { bubbles: true }));
            endDateField.dispatchEvent(new Event('blur', { bubbles: true }));
        } else {
            console.warn('End date field bulunamadı!');
        }

        setTimeout(() => {
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                // Dosya ismini özelleştir: "12min_01-05-2025"
                const fileName = `${minValue}min_${startDate.replace(/\//g, '-')}`;
                downloadBtn.setAttribute('data-bc-download-button', fileName);
                
                console.log(`[${minValue} MIN] Download:`, startDate, '->', endDate, '| File:', fileName);
                downloadBtn.click();
            } else {
                console.warn('Download button bulunamadı!');
            }
        }, 500);
    }

    async function startAutoDownload(interval) {
        const ranges = generateDateRanges();
        console.log(`Toplam ${ranges.length} adet 2 haftalık periyot bulundu (${interval} min).`);

        const infoDiv = document.createElement('div');
        infoDiv.id = 'auto-download-info';
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(infoDiv);

        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            infoDiv.textContent = `[${interval} MIN] İndiriliyor: ${i + 1}/${ranges.length} - ${range.start} → ${range.end}`;
            
            console.log(`${i + 1}/${ranges.length}: ${range.start} - ${range.end}`);
            fillFormAndDownload(range.start, range.end, interval);

            if (i < ranges.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        infoDiv.style.background = '#2196F3';
        infoDiv.textContent = `✓ Tamamlandı! ${ranges.length} dosya indirildi (${interval} min).`;
        
        setTimeout(() => {
            infoDiv.remove();
            addControlPanel(); // Panel'i geri getir
        }, 5000);
    }

    function addControlPanel() {
        // Eski panel varsa kaldır
        const oldPanel = document.getElementById('barchart-control-panel');
        if (oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'barchart-control-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 2px solid #FF5722;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="color: #FF5722; font-size: 16px;">📊 Auto Downloader</strong>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666;">
                    Interval Seç:
                </label>
                <select id="interval-selector" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 2px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    background: white;
                ">
                    <option value="12">12 dakika</option>
                    <option value="20">20 dakika</option>
                    <option value="30">30 dakika</option>
                    <option value="60">60 dakika (1 saat)</option>
                </select>
            </div>
            <button id="start-download-btn" style="
                width: 100%;
                padding: 12px;
                background: #FF5722;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            ">
                🚀 İndirmeyi Başlat
            </button>
        `;

        document.body.appendChild(panel);

        // Event listeners
        const selector = document.getElementById('interval-selector');
        const startBtn = document.getElementById('start-download-btn');

        selector.value = selectedInterval;
        
        selector.addEventListener('change', (e) => {
            selectedInterval = e.target.value;
        });

        startBtn.addEventListener('mouseover', () => {
            startBtn.style.background = '#E64A19';
            startBtn.style.transform = 'scale(1.02)';
        });

        startBtn.addEventListener('mouseout', () => {
            startBtn.style.background = '#FF5722';
            startBtn.style.transform = 'scale(1)';
        });

        startBtn.addEventListener('click', () => {
            panel.remove();
            startAutoDownload(selectedInterval);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addControlPanel);
    } else {
        addControlPanel();
    }

})();
