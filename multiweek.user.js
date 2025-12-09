// ==UserScript==
// @name         Barchart Multi-Week Downloader
// @namespace    http://tampermonkey.net/multiweek
// @version      1.0
// @description  3/4/5 haftalık periyotlarla Barchart'tan historical data indirir
// @author       You
// @match        https://www.barchart.com/futures/quotes/*/historical-download
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const START_DATE = '01/05/2025'; // Sabit başlangıç

    // Seçenekler: { label, interval (dakika), weeks, days (Pazar'dan Cuma'ya) }
    const OPTIONS = [
        { label: '3 Hafta - 12 min', interval: '12', weeks: 3, days: 19 },
        { label: '4 Hafta - 12 min', interval: '12', weeks: 4, days: 26 },
        { label: '5 Hafta - 60 min', interval: '60', weeks: 5, days: 33 }
    ];

    let selectedOption = OPTIONS[0];

    function generateDateRanges(option) {
        const ranges = [];
        const startDate = new Date(START_DATE);
        const today = new Date();

        let currentSunday = new Date(startDate);

        while (currentSunday <= today) {
            const periodStart = new Date(currentSunday.valueOf());
            const periodEnd = new Date(currentSunday.valueOf());
            periodEnd.setDate(periodEnd.getDate() + option.days);

            if (periodEnd > today) {
                periodEnd.setTime(today.getTime());
            }

            ranges.push({
                start: formatDate(periodStart),
                end: formatDate(periodEnd)
            });

            // Sonraki periyot: hafta sayısı * 7 gün sonraki Pazar
            currentSunday.setDate(currentSunday.getDate() + (option.weeks * 7));
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
        const dispatchAll = (el) => {
            if (!el) return;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('blur', { bubbles: true }));
        };

        // Interval (minutes)
        const minField = document.querySelector('input.js-chart-form-minutes, input[name="aggregation"]');
        if (minField) {
            minField.value = minValue;
            dispatchAll(minField);
        }

        // Date fields
        const startDateField = document.querySelector('input[name="dateFrom"]');
        const endDateField = document.querySelector('input[name="dateTo"]');

        if (startDateField && endDateField) {
            startDateField.value = startDate;
            endDateField.value = endDate;

            dispatchAll(endDateField);
            dispatchAll(startDateField);

            // Re-assert if framework auto-adjusted
            if (startDateField.value !== startDate || endDateField.value !== endDate) {
                startDateField.value = startDate;
                endDateField.value = endDate;
                dispatchAll(startDateField);
                dispatchAll(endDateField);
            }

            // Safety: ensure from <= to
            try {
                const sd = new Date(startDateField.value);
                const ed = new Date(endDateField.value);
                if (sd > ed) {
                    const tmp = startDateField.value;
                    startDateField.value = endDateField.value;
                    endDateField.value = tmp;
                    dispatchAll(startDateField);
                    dispatchAll(endDateField);
                }
            } catch (e) {}
        } else {
            if (startDateField) { startDateField.value = startDate; dispatchAll(startDateField); }
            if (endDateField) { endDateField.value = endDate; dispatchAll(endDateField); }
        }

        setTimeout(() => {
            const sVal = document.querySelector('input[name="dateFrom"]')?.value;
            const eVal = document.querySelector('input[name="dateTo"]')?.value;
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                console.log(`[MULTI-WEEK] Download:`, startDate, '->', endDate, '| DOM →', sVal, '→', eVal);
                downloadBtn.click();
            }
        }, 500);
    }

    async function startAutoDownload(option) {
        const ranges = generateDateRanges(option);

        if (ranges.length === 0) {
            alert('Hiç periyot bulunamadı!');
            return;
        }

        console.log(`Toplam ${ranges.length} adet ${option.weeks} haftalık periyot bulundu (${option.interval} min).`);

        const infoDiv = document.createElement('div');
        infoDiv.id = 'auto-download-info-multiweek';
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00796B;
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
            infoDiv.textContent = `[${option.weeks}W ${option.interval}M] İndiriliyor: ${i + 1}/${ranges.length} - ${range.start} → ${range.end}`;

            console.log(`${i + 1}/${ranges.length}: ${range.start} - ${range.end}`);
            fillFormAndDownload(range.start, range.end, option.interval);

            if (i < ranges.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        infoDiv.style.background = '#2196F3';
        infoDiv.textContent = `✓ Tamamlandı! ${ranges.length} dosya indirildi (${option.weeks} hafta, ${option.interval} min).`;

        setTimeout(() => {
            infoDiv.remove();
            addControlPanel();
        }, 5000);
    }

    function addControlPanel() {
        const oldPanel = document.getElementById('barchart-multiweek-panel');
        if (oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'barchart-multiweek-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border: 2px solid #00796B;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            width: 300px;
        `;

        let optionsHTML = OPTIONS.map((opt, idx) => 
            `<option value="${idx}">${opt.label}</option>`
        ).join('');

        panel.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="color: #00796B; font-size: 16px;">📦 Multi-Week Downloader</strong>
                <div style="font-size: 11px; color: #999; margin-top: 3px;">3/4/5 haftalık periyotlar</div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666;">
                    Periyot Seç:
                </label>
                <select id="multiweek-selector" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 2px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    background: white;
                ">
                    ${optionsHTML}
                </select>
            </div>
            <div id="preview-info" style="
                background: #f5f5f5;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 15px;
                font-size: 12px;
                color: #666;
            ">
                <!-- Preview will be updated here -->
            </div>
            <button id="start-multiweek-btn" style="
                width: 100%;
                padding: 12px;
                background: #00796B;
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

        const selector = document.getElementById('multiweek-selector');
        const previewDiv = document.getElementById('preview-info');
        const startBtn = document.getElementById('start-multiweek-btn');

        function updatePreview() {
            const opt = OPTIONS[selector.value];
            const ranges = generateDateRanges(opt);
            previewDiv.innerHTML = `
                <div><strong>Interval:</strong> ${opt.interval} dakika</div>
                <div><strong>Periyot:</strong> ${opt.weeks} hafta (${opt.days} gün)</div>
                <div><strong>Toplam dosya:</strong> ${ranges.length}</div>
                <div><strong>Başlangıç:</strong> ${START_DATE}</div>
            `;
            selectedOption = opt;
        }

        updatePreview();
        selector.addEventListener('change', updatePreview);

        startBtn.addEventListener('mouseover', () => {
            startBtn.style.background = '#00695C';
            startBtn.style.transform = 'scale(1.02)';
        });

        startBtn.addEventListener('mouseout', () => {
            startBtn.style.background = '#00796B';
            startBtn.style.transform = 'scale(1)';
        });

        startBtn.addEventListener('click', () => {
            panel.remove();
            startAutoDownload(selectedOption);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addControlPanel);
    } else {
        addControlPanel();
    }

})();
