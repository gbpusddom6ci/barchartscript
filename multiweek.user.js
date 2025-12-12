// ==UserScript==
// @name         Barchart Multi-Week Downloader
// @namespace    http://tampermonkey.net/multiweek
// @version      1.1
// @description  3/4/5 haftalık periyotlarla Barchart'tan historical data indirir (başlangıç tarihi seçilebilir)
// @author       You
// @match        https://www.barchart.com/futures/quotes/*/historical-download
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const DEFAULT_START_DATE = '01/05/2025'; // Varsayılan başlangıç (Pazar)

    // Seçenekler: { label, interval (dakika), weeks, days (Pazar'dan Cuma'ya) }
    const OPTIONS = [
        { label: '3 Hafta - 12 min', interval: '12', weeks: 3, days: 19 },
        { label: '4 Hafta - 12 min', interval: '12', weeks: 4, days: 26 },
        { label: '5 Hafta - 60 min', interval: '60', weeks: 5, days: 33 }
    ];

    let selectedOption = OPTIONS[0];
    let selectedStartDateStr = DEFAULT_START_DATE;

    const DAY_NAMES_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    function parseMMDDYYYY(dateStr) {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
        if (!m) return null;

        const month = Number(m[1]);
        const day = Number(m[2]);
        const year = Number(m[3]);

        if (!Number.isInteger(month) || month < 1 || month > 12) return null;
        if (!Number.isInteger(day) || day < 1 || day > 31) return null;
        if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;

        const d = new Date(year, month - 1, day);
        if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;

        d.setHours(0, 0, 0, 0);
        return d;
    }

    function generateDateRanges(option, startDate) {
        const ranges = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentSunday = new Date(startDate.valueOf());

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
                const sd = parseMMDDYYYY(startDateField.value);
                const ed = parseMMDDYYYY(endDateField.value);
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

    async function startAutoDownload(option, startDateStr) {
        const startDate = parseMMDDYYYY(startDateStr);
        if (!startDate) {
            alert('Tarih formatı hatalı! MM/DD/YYYY formatında olmalı (örn: 01/05/2025)');
            addControlPanel();
            return;
        }
        if (startDate.getDay() !== 0) {
            alert('Lütfen bir Pazar günü seçin!');
            addControlPanel();
            return;
        }

        const ranges = generateDateRanges(option, startDate);

        if (ranges.length === 0) {
            alert('Hiç periyot bulunamadı!');
            addControlPanel();
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
            width: 320px;
        `;

        let optionsHTML = OPTIONS.map((opt, idx) => 
            `<option value="${idx}">${opt.label}</option>`
        ).join('');

        panel.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong style="color: #00796B; font-size: 16px;">📦 Multi-Week Downloader</strong>
                <div style="font-size: 11px; color: #999; margin-top: 3px;">3/4/5 haftalık periyotlar</div>
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666;">
                    Başlangıç Pazar:
                </label>
                <input 
                    type="text" 
                    id="multiweek-start-date" 
                    placeholder="MM/DD/YYYY (örn: 01/05/2025)"
                    value="${selectedStartDateStr}"
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
	        const startDateInput = document.getElementById('multiweek-start-date');

	        function updatePreview() {
	            const opt = OPTIONS[selector.value];
	            const startStr = (startDateInput?.value || '').trim();
	            const errorMessages = [];
	            if (!startStr) {
	                errorMessages.push('Lütfen başlangıç tarihini girin.');
	            }

	            const startDate = startStr ? parseMMDDYYYY(startStr) : null;
	            if (startStr && !startDate) {
	                errorMessages.push('Tarih formatı hatalı (MM/DD/YYYY).');
	            } else if (startDate && startDate.getDay() !== 0) {
	                errorMessages.push(`Başlangıç günü Pazar olmalı (şu an: ${DAY_NAMES_TR[startDate.getDay()]}).`);
	            }

	            if (errorMessages.length) {
	                previewDiv.innerHTML = `
	                    <div style="color: #D32F2F;">
	                        <strong>Hata:</strong> ${errorMessages.join(' ')}
	                    </div>
	                `;
	                startBtn.disabled = true;
	                startBtn.style.opacity = '0.6';
	                startBtn.style.cursor = 'not-allowed';
	                selectedOption = opt;
	                return;
	            }

	            const ranges = generateDateRanges(opt, startDate);
	            if (ranges.length === 0) {
	                previewDiv.innerHTML = `
	                    <div style="color: #D32F2F;">
	                        <strong>Hata:</strong> Başlangıç tarihi bugün sonrası olamaz.
	                    </div>
	                `;
	                startBtn.disabled = true;
	                startBtn.style.opacity = '0.6';
	                startBtn.style.cursor = 'not-allowed';
	                selectedOption = opt;
	                return;
	            }

	            selectedStartDateStr = startStr;
	            previewDiv.innerHTML = `
	                <div><strong>Interval:</strong> ${opt.interval} dakika</div>
	                <div><strong>Periyot:</strong> ${opt.weeks} hafta (${opt.days} gün)</div>
	                <div><strong>Başlangıç:</strong> ${selectedStartDateStr} (${DAY_NAMES_TR[startDate.getDay()]})</div>
	                <div><strong>Toplam dosya:</strong> ${ranges.length}</div>
	                <div style="margin-top: 6px;"><strong>Örnek:</strong> ${ranges[0].start} → ${ranges[0].end}</div>
	            `;

	            startBtn.disabled = false;
	            startBtn.style.opacity = '1';
	            startBtn.style.cursor = 'pointer';
	            selectedOption = opt;
	        }

        updatePreview();
        selector.addEventListener('change', updatePreview);
        startDateInput.addEventListener('input', updatePreview);

        startBtn.addEventListener('mouseover', () => {
            if (startBtn.disabled) return;
            startBtn.style.background = '#00695C';
            startBtn.style.transform = 'scale(1.02)';
        });

        startBtn.addEventListener('mouseout', () => {
            startBtn.style.background = '#00796B';
            startBtn.style.transform = 'scale(1)';
        });

        startBtn.addEventListener('click', () => {
            const startStr = (startDateInput?.value || '').trim();
            if (!startStr) {
                alert('Lütfen başlangıç tarihini girin!');
                return;
            }
            if (!parseMMDDYYYY(startStr)) {
                alert('Tarih formatı hatalı! MM/DD/YYYY formatında olmalı (örn: 01/05/2025)');
                return;
            }
            panel.remove();
            startAutoDownload(selectedOption, startStr);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addControlPanel);
    } else {
        addControlPanel();
    }

})();
