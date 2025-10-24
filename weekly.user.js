// ==UserScript==
// @name         Barchart Weekly Downloader v2 FIXED
// @namespace    http://tampermonkey.net/weekly-v2
// @version      2.1
// @description  1 haftalık periyotlarla (Pazar-Cuma) Barchart'tan historical data indirir - 12 min only
// @author       You
// @match        https://www.barchart.com/futures/quotes/*/historical-download
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const INTERVAL = '12'; // Sadece 12 min

    function generateDateRanges(startDateStr) {
        const ranges = [];
        const startDate = new Date(startDateStr);
        const today = new Date();

        // Pazar günü kontrolü
        if (startDate.getDay() !== 0) {
            alert('Lütfen bir Pazar günü seçin!');
            return [];
        }

        let currentSunday = new Date(startDate);

        while (currentSunday <= today) {
            const weekStart = new Date(currentSunday.valueOf());
            const weekEnd = new Date(currentSunday.valueOf());
            weekEnd.setDate(weekEnd.getDate() + 5); // Pazar + 5 gün = Cuma

            if (weekEnd > today) {
                weekEnd.setTime(today.getTime());
            }

            ranges.push({
                start: formatDate(weekStart),
                end: formatDate(weekEnd)
            });

            currentSunday.setDate(currentSunday.getDate() + 7); // Bir sonraki Pazar
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
            // Set both values first to avoid reactive auto-adjustments, then dispatch.
            startDateField.value = startDate;
            endDateField.value = endDate;

            // Dispatch in a controlled order; try end -> start to anchor the intended start date
            // so frameworks don't back-calculate a different start from the end.
            dispatchAll(endDateField);
            dispatchAll(startDateField);

            // If framework still auto-adjusted, force the intended values once more.
            if (startDateField.value !== startDate || endDateField.value !== endDate) {
                startDateField.value = startDate;
                endDateField.value = endDate;
                dispatchAll(startDateField);
                dispatchAll(endDateField);
            }

            // Safety: ensure from <= to; if swapped, swap back.
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
            // Fallback to individual updates if one of the fields is missing
            if (startDateField) { startDateField.value = startDate; dispatchAll(startDateField); }
            if (endDateField) { endDateField.value = endDate; dispatchAll(endDateField); }
        }

        setTimeout(() => {
            // Log actual DOM values to verify before click
            const sVal = document.querySelector('input[name="dateFrom"]')?.value;
            const eVal = document.querySelector('input[name="dateTo"]')?.value;
            const downloadBtn = document.querySelector('.download-btn');
            if (downloadBtn) {
                console.log(`[WEEKLY 12 MIN] Download:`, startDate, '->', endDate, '| DOM →', sVal, '→', eVal);
                downloadBtn.click();
            }
        }, 500);
    }

    async function startAutoDownload(startDateStr) {
        const ranges = generateDateRanges(startDateStr);
        
        if (ranges.length === 0) {
            return; // Hatalı tarih
        }

        console.log(`Toplam ${ranges.length} adet haftalık periyot bulundu (12 min).`);

        const infoDiv = document.createElement('div');
        infoDiv.id = 'auto-download-info-weekly';
        infoDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #9C27B0;
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
            infoDiv.textContent = `[WEEKLY 12 MIN] İndiriliyor: ${i + 1}/${ranges.length} - ${range.start} → ${range.end}`;
            
            console.log(`${i + 1}/${ranges.length}: ${range.start} - ${range.end}`);
            fillFormAndDownload(range.start, range.end, INTERVAL);

            if (i < ranges.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        infoDiv.style.background = '#2196F3';
        infoDiv.textContent = `✓ Tamamlandı! ${ranges.length} haftalık dosya indirildi (12 min).`;
        
        setTimeout(() => {
            infoDiv.remove();
            addControlPanel();
        }, 5000);
    }

    function addControlPanel() {
        const oldPanel = document.getElementById('barchart-weekly-panel');
        if (oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'barchart-weekly-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: white;
            border: 2px solid #9C27B0;
            border-radius: 12px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            width: 280px;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="color: #9C27B0; font-size: 16px;">📅 Weekly Downloader</strong>
                <div style="font-size: 11px; color: #999; margin-top: 3px;">1 haftalık (Pazar-Cuma) • 12 min</div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666;">
                    Başlangıç Pazar:
                </label>
                <input 
                    type="text" 
                    id="start-date-input" 
                    placeholder="MM/DD/YYYY (örn: 01/05/2025)"
                    value="01/05/2025"
                    style="
                        width: 100%;
                        padding: 8px 12px;
                        border: 2px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                />
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                    ⚠️ Pazar günü olmalı
                </div>
            </div>
            <button id="start-weekly-download-btn" style="
                width: 100%;
                padding: 12px;
                background: #9C27B0;
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

        const startBtn = document.getElementById('start-weekly-download-btn');
        const dateInput = document.getElementById('start-date-input');

        startBtn.addEventListener('mouseover', () => {
            startBtn.style.background = '#7B1FA2';
            startBtn.style.transform = 'scale(1.02)';
        });

        startBtn.addEventListener('mouseout', () => {
            startBtn.style.background = '#9C27B0';
            startBtn.style.transform = 'scale(1)';
        });

        startBtn.addEventListener('click', () => {
            const startDate = dateInput.value.trim();
            
            if (!startDate) {
                alert('Lütfen başlangıç tarihini girin!');
                return;
            }

            // Tarih format kontrolü
            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(startDate)) {
                alert('Tarih formatı hatalı! MM/DD/YYYY formatında olmalı (örn: 01/05/2025)');
                return;
            }

            panel.remove();
            startAutoDownload(startDate);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addControlPanel);
    } else {
        addControlPanel();
    }

})();
