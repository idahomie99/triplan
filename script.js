import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// 🚀 Gemini AI API 키
const GEMINI_API_KEY = 'AQ.Ab8RN6Kz9AQPUJVDnJBwEtopgto_BHGbahhbYIsG7U4qPssg9w';

document.addEventListener('DOMContentLoaded', () => {
    
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        // 👇 맨 뒤에 1500을 1000(1초)으로 변경!
        setTimeout(() => { splashScreen.classList.add('hide'); setTimeout(() => splashScreen.remove(), 500); }, 1000);
    }

    const mainContent = document.getElementById('main-content');
    const topHeader = document.getElementById('top-header');
    mainContent.addEventListener('scroll', () => {
        topHeader.classList.toggle('scrolled', mainContent.scrollTop > 10);
    });

    const bindRipple = () => {
        const rippleBtns = document.querySelectorAll('.ripple-btn, .small-ripple-btn, .pill-btn, .rec-list-item');
        rippleBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                const ripple = document.createElement('span'); ripple.classList.add('ripple');
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x - size / 2}px`; ripple.style.top = `${y - size / 2}px`;
                ripple.style.animation = this.classList.contains('small-ripple-btn') ? 'ripple-anim-small 0.4s ease-out forwards' : 'ripple-anim-large 0.6s ease-out forwards';
                this.appendChild(ripple); setTimeout(() => ripple.remove(), 600);
            });
        });
    };
    bindRipple();

    const showCustomAlert = (options) => {
        const overlay = document.getElementById('custom-alert-overlay');
        const modal = document.getElementById('custom-alert-modal');
        document.getElementById('alert-icon').innerHTML = `<span class="material-symbols-rounded">${options.icon || 'info'}</span>`;
        document.getElementById('alert-title').innerText = options.title;
        document.getElementById('alert-desc').innerText = options.desc;
        
        const confirmBtn = document.getElementById('btn-alert-confirm');
        confirmBtn.innerText = options.confirmText || '확인했어요';
        if(options.isDanger) confirmBtn.classList.add('danger'); else confirmBtn.classList.remove('danger');
        
        const cancelBtn = document.getElementById('btn-alert-cancel');
        if(options.showCancel) { cancelBtn.style.display = 'block'; cancelBtn.innerText = options.cancelText || '취소'; } 
        else { cancelBtn.style.display = 'none'; }
        
        overlay.classList.add('active'); modal.classList.add('active');
        
        confirmBtn.onclick = () => {
            modal.classList.remove('active'); overlay.classList.remove('active');
            setTimeout(() => { if(options.onConfirm) options.onConfirm(); }, 300);
        };
        cancelBtn.onclick = () => { modal.classList.remove('active'); overlay.classList.remove('active'); };
    };

    const btnAccount = document.getElementById('nav-account');
    const btnTopProfile = document.getElementById('btn-top-profile'); 
    const profilePic = document.querySelector('.profile-pic');
    const greeting = document.querySelector('.greeting');
    const accountScreen = document.getElementById('account-screen');
    const btnBackAccount = document.getElementById('btn-back-account');
    
    const defaultProfileSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394A3B8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`;

    onAuthStateChanged(auth, (user) => {
        if (user) { 
            greeting.innerText = `${user.displayName}님,\n어디로 떠나시나요?`; profilePic.style.backgroundImage = `url('${user.photoURL}')`; 
            document.getElementById('account-name').innerText = user.displayName; document.getElementById('account-email').innerText = user.email; 
            document.getElementById('account-profile-pic').style.backgroundImage = `url('${user.photoURL}')`;
        } else { 
            greeting.innerText = `어디로 떠나시나요?`; profilePic.style.backgroundImage = defaultProfileSvg; 
            document.getElementById('account-name').innerText = '로그인이 필요합니다'; document.getElementById('account-email').innerText = '이메일 정보 없음'; 
            document.getElementById('account-profile-pic').style.backgroundImage = defaultProfileSvg; accountScreen.classList.remove('active');
        }
    });

    const handleLoginOrMyPage = () => { if (auth.currentUser) accountScreen.classList.add('active'); else signInWithPopup(auth, provider).catch(err => alert("로그인 에러")); };
    if(btnTopProfile) btnTopProfile.addEventListener('click', handleLoginOrMyPage);
    if(btnAccount) btnAccount.addEventListener('click', handleLoginOrMyPage);
    if(btnBackAccount) btnBackAccount.addEventListener('click', () => accountScreen.classList.remove('active'));

    let aiMode = 'standard'; let currentAiStep = 1; let aiStepHistory = [1]; 
    const totalAiSteps = 11; const aiProgressBar = document.getElementById('ai-progress-bar'); 
    const btnAiNext = document.getElementById('btn-ai-next'); const btnPrevAiStep = document.getElementById('btn-prev-ai-step');
    const aiScreen = document.getElementById('ai-screen'); 
    
let isCurrentPlanSaved = false; // 🌟 현재 일정이 저장되었는지 기억하는 변수

    let aiData = { 
        startDate: null, endDate: null, totalTripDays: 0,
        destinations: [{ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }], 
        isOptimizeRoute: false, transports: [], arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [], myStyles: [], ptStyles: [], themes: [], stamina: 3 
    };

    let tempStartDate = null; let tempEndDate = null; let calendarTargetIndex = -1; 
    const calendarModal = document.getElementById('calendar-modal'); const calendarOverlay = document.getElementById('calendar-overlay'); const calendarContainer = document.getElementById('calendar-grid-container'); 

    const fm = (d) => { if(!d) return ''; if(typeof d === 'string') return d; return `${d.getMonth()+1}.${d.getDate()}`; };

    const updateDateTexts = () => {
        const aiText = document.getElementById('ai-date-text');
        if(aiText) {
            if(!aiData.startDate) aiText.innerText = '날짜를 선택해주세요';
            else aiText.innerText = aiData.endDate ? `${fm(aiData.startDate)} ~ ${fm(aiData.endDate)} (${aiData.totalTripDays}일)` : `${fm(aiData.startDate)} ~ 선택 중`;
        }
        document.getElementById('label-arr-date').innerText = aiData.startDate ? `(${aiData.startDate.getMonth()+1}/${aiData.startDate.getDate()})` : ''; 
        document.getElementById('label-dep-date').innerText = aiData.endDate ? `(${aiData.endDate.getMonth()+1}/${aiData.endDate.getDate()})` : ''; 
        renderDestinations(); validateAiStep();
    };

    document.getElementById('btn-open-calendar-ai')?.addEventListener('click', () => {
        calendarTargetIndex = -1; tempStartDate = aiData.startDate; tempEndDate = aiData.endDate;
        calendarOverlay.style.display = 'block'; setTimeout(() => calendarModal.classList.add('active'), 10); renderCalendar();
    });
    
    const closeCalendar = () => { calendarModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    document.getElementById('btn-close-calendar')?.addEventListener('click', closeCalendar); 
    
    // 👇 배경(오버레이) 클릭 시 열려있는 모든 바텀 시트(모달)를 찾아 깔끔하게 닫아주는 만능 로직!
    calendarOverlay.addEventListener('click', () => {
        // 화면에 있는 모든 바텀 시트의 'active' 클래스를 제거해서 스르륵 내림
        document.querySelectorAll('.bottom-sheet').forEach(sheet => {
            sheet.classList.remove('active');
        });
        // 0.3초 뒤에 까만 배경도 숨김
        setTimeout(() => { calendarOverlay.style.display = 'none'; }, 300);
    });
    
    document.getElementById('btn-confirm-date')?.addEventListener('click', () => {
        if (!tempStartDate || !tempEndDate) { showCustomAlert({ icon: 'error', title: '알림', desc: '시작일과 종료일을 모두 선택해주세요.' }); return; }
        
        if (calendarTargetIndex === -1) {
            aiData.startDate = tempStartDate; aiData.endDate = tempEndDate;
            aiData.totalTripDays = Math.round((tempEndDate - tempStartDate) / (1000 * 60 * 60 * 24)) + 1;
            updateDateTexts(); 
        } else {
            const dest = aiData.destinations[calendarTargetIndex];
            dest.startDate = tempStartDate; dest.endDate = tempEndDate;
            dest.stayDays = Math.round((tempEndDate - tempStartDate) / (1000 * 60 * 60 * 24)) + 1;
            aiData.destinations.sort((a, b) => {
                if (!a.startDate && !b.startDate) return 0;
                if (!a.startDate) return 1; if (!b.startDate) return -1;
                return a.startDate.getTime() - b.startDate.getTime();
            });
            renderDestinations();
        }
        closeCalendar(); validateAiStep();
    });

    const holidays2026 = ['1.1', '2.16', '2.17', '2.18', '3.1', '5.5', '5.24', '6.6', '8.15', '9.24', '9.25', '9.26', '10.3', '10.9', '12.25'];

    const renderCalendar = () => {
        if (!calendarContainer) return; calendarContainer.innerHTML = '';
        const today = new Date(); today.setHours(0,0,0,0);
        for (let i = 0; i < 12; i++) {
            const year = today.getFullYear(); const month = today.getMonth() + i; const drawDate = new Date(year, month, 1);
            const monthTitle = document.createElement('div'); monthTitle.className = 'month-title'; monthTitle.innerText = `${drawDate.getFullYear()}년 ${drawDate.getMonth() + 1}월`; calendarContainer.appendChild(monthTitle);
            const grid = document.createElement('div'); grid.className = 'calendar-grid';
            for(let j = 0; j < drawDate.getDay(); j++) { grid.innerHTML += `<div></div>`; }
            const lastDate = new Date(year, month + 1, 0).getDate();
            for(let d = 1; d <= lastDate; d++) {
                const currentDate = new Date(year, month, d); const cell = document.createElement('div'); cell.className = 'cal-day'; cell.innerText = d;
                
                const dayOfWeek = currentDate.getDay(); const dateStr = `${currentDate.getMonth()+1}.${currentDate.getDate()}`;
                if(dayOfWeek === 0 || dayOfWeek === 6) cell.classList.add('weekend');
                if(holidays2026.includes(dateStr)) cell.classList.add('holiday');

                const tCur = currentDate.getTime(); let isDisabled = false;
                if (currentDate < today) isDisabled = true;
                else if (calendarTargetIndex !== -1 && aiData.startDate && aiData.endDate) {
                    const tStart = aiData.startDate.getTime(); const tEnd = aiData.endDate.getTime();
                    if (tCur < tStart || tCur > tEnd) isDisabled = true;
                }

                if (isDisabled) { cell.classList.add('disabled'); } else {
                    const timeStart = tempStartDate ? tempStartDate.getTime() : null; const timeEnd = tempEndDate ? tempEndDate.getTime() : null;
                    if (timeStart === tCur || timeEnd === tCur) cell.classList.add('selected');
                    if (timeStart && timeEnd) { if (tCur > timeStart && tCur < timeEnd) cell.classList.add('in-range'); if (tCur === timeStart && timeStart !== timeEnd) cell.classList.add('range-start'); if (tCur === timeEnd && timeStart !== timeEnd) cell.classList.add('range-end'); }
                    
                    cell.addEventListener('click', () => {
                        if (!tempStartDate || (tempStartDate && tempEndDate)) { tempStartDate = currentDate; tempEndDate = null; }
                        else if (tempStartDate && !tempEndDate) { if (currentDate >= tempStartDate) tempEndDate = currentDate; else tempStartDate = currentDate; }
                        renderCalendar(); 
                    });
                }
                grid.appendChild(cell);
            }
            calendarContainer.appendChild(grid);
        }
    };

    // 👇 구글 검색을 위한 국가별 ISO 코드 매핑
    const countryIsoMap = {
        '대한민국': 'KR', '일본': 'JP', '중국': 'CN', '대만': 'TW', '홍콩': 'HK', '마카오': 'MO', '태국': 'TH', '베트남': 'VN', '필리핀': 'PH', '싱가포르': 'SG', '말레이시아': 'MY', '인도네시아': 'ID', '인도': 'IN', '몰디브': 'MV', '몽골': 'MN',
        '영국': 'GB', '프랑스': 'FR', '이탈리아': 'IT', '스페인': 'ES', '스위스': 'CH', '독일': 'DE', '체코': 'CZ', '오스트리아': 'AT', '헝가리': 'HU', '크로아티아': 'HR', '네덜란드': 'NL', '포르투갈': 'PT', '그리스': 'GR', '노르웨이': 'NO', '스웨덴': 'SE', '핀란드': 'FI', '튀르키예': 'TR', '아이슬란드': 'IS',
        '미국': 'US', '캐나다': 'CA', '멕시코': 'MX', '페루': 'PE', '브라질': 'BR', '아르헨티나': 'AR', '칠레': 'CL', '콜롬비아': 'CO', '쿠바': 'CU', '볼리비아': 'BO',
        '호주': 'AU', '뉴질랜드': 'NZ', '괌': 'GU', '사이판': 'MP', '피지': 'FJ', '팔라우': 'PW', '이집트': 'EG', '모로코': 'MA'
    };

    const countryData = {
        '아시아': ['대한민국', '일본', '중국', '대만', '홍콩', '마카오', '태국', '베트남', '필리핀', '싱가포르', '말레이시아', '인도네시아', '인도', '몰디브', '몽골'],
        '유럽': ['영국', '프랑스', '이탈리아', '스페인', '스위스', '독일', '체코', '오스트리아', '헝가리', '크로아티아', '네덜란드', '포르투갈', '그리스', '노르웨이', '스웨덴', '핀란드', '튀르키예', '아이슬란드'],
        '아메리카': ['미국', '캐나다', '멕시코', '페루', '브라질', '아르헨티나', '칠레', '콜롬비아', '쿠바', '볼리비아'],
        '오세아니아/기타': ['호주', '뉴질랜드', '괌', '사이판', '피지', '팔라우', '이집트', '모로코']
    };

    const destContainer = document.getElementById('dest-form-container');
    const countryModal = document.getElementById('country-modal');
    const countryListContainer = document.getElementById('country-list-container');
    const btnCountryBack = document.getElementById('btn-country-back');
    const countryModalTitle = document.getElementById('country-modal-title');
    let activeDestIndex = 0; 

    const renderDestinations = () => {
        destContainer.innerHTML = '';
        const isMulti = aiData.destinations.length > 1;

        if (isMulti) document.getElementById('ai-optimize-wrapper').style.display = 'flex';
        else {
            document.getElementById('ai-optimize-wrapper').style.display = 'none';
            document.getElementById('chk-optimize-route').checked = false;
            aiData.isOptimizeRoute = false;
        }

        aiData.destinations.forEach((dest, index) => {
            const dateStr = dest.startDate ? `${fm(dest.startDate)} ~ ${fm(dest.endDate)} (${dest.stayDays}일)` : '일정 선택';
            const countryStr = dest.country || '국가를 선택하세요';
            const countryColor = dest.country ? '#2563EB' : 'inherit';
            
            const pinVal = dest.pin || 'auto';
            let pinIcon = 'auto_awesome'; let pinText = 'AI가 순서 자동 배치';
            if(pinVal === 'start') { pinIcon = 'flight_takeoff'; pinText = '출발지로 지정'; }
            else if(pinVal === 'end') { pinIcon = 'flight_land'; pinText = '도착지로 지정'; }
            else if(pinVal === 'start_end') { pinIcon = 'sync_alt'; pinText = '출발 및 도착지로 지정'; }
            
            const isCityDisabled = !dest.country;
            const cityPlaceholder = isCityDisabled ? '국가를 먼저 선택해주세요' : '도시 이름 검색 (자동완성)';
            const cityStyle = isCityDisabled ? 'opacity: 0.5; cursor: not-allowed; background: var(--card-border);' : '';

            const html = `
                <div class="dest-item" data-index="${index}" style="animation: fadeIn 0.3s ease-out;">
                    <div class="dest-num" style="${isMulti ? 'display:flex;' : 'display:none;'}">${index + 1}</div>
                    <div class="dest-inputs">
                        <button class="country-select-btn ripple-btn"><span style="color:${countryColor};">${countryStr}</span><span class="material-symbols-rounded">expand_more</span></button>
                        
                        <div class="autocomplete-hint" style="display: none; font-size: 12px; color: #DC2626; margin-bottom: 6px; padding-left: 4px; font-weight: 700; align-items: center; gap: 4px; animation: fadeIn 0.2s ease-out;">
                            <span class="material-symbols-rounded" style="font-size: 16px;">error</span> 아래 자동완성 목록을 눌러서 선택해 주세요.
                        </div>
                        
                        <div style="position: relative; display: flex; align-items: center; width: 100%;">
                            <input type="text" class="city-input" placeholder="${cityPlaceholder}" value="${dest.city}" ${isCityDisabled ? 'disabled' : ''} style="${cityStyle} width: 100%; padding-right: 48px;">
                            <button class="open-city-map-btn ripple-btn" style="position: absolute; right: 6px; border: none; background: transparent; color: ${isCityDisabled ? 'var(--card-border)' : '#3B82F6'}; cursor: ${isCityDisabled ? 'not-allowed' : 'pointer'}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" ${isCityDisabled ? 'disabled' : ''}>
                                <span class="material-symbols-rounded" style="font-size: 18px;">map</span>
                            </button>
                        </div>
                        
                        <button class="stay-date-btn ripple-btn" style="${isMulti && aiData.totalTripDays > 0 && !aiData.isOptimizeRoute ? 'display:flex;' : 'display:none;'}"><span class="material-symbols-rounded" style="font-size:16px;">calendar_month</span><span class="stay-date-val">${dateStr}</span></button>
                        
                        <!-- 🌟 누락됐던 핀 설정/AI 자동 배치 UI 완벽 복구! -->
                        <div class="custom-pin-select" style="${isMulti && aiData.isOptimizeRoute ? 'display:block;' : 'display:none;'}">
                            <div class="pin-selected"><span class="material-symbols-rounded icon">${pinIcon}</span> <span class="text">${pinText}</span> <span class="material-symbols-rounded arrow">unfold_more</span></div>
                            <div class="pin-options">
                                <div class="pin-option" data-val="auto"><span class="material-symbols-rounded">auto_awesome</span> AI가 순서 자동 배치</div>
                                <div class="pin-option" data-val="start"><span class="material-symbols-rounded">flight_takeoff</span> 출발지로 지정</div>
                                <div class="pin-option" data-val="end"><span class="material-symbols-rounded">flight_land</span> 도착지로 지정</div>
                                <div class="pin-option" data-val="start_end"><span class="material-symbols-rounded">sync_alt</span> 출발 및 도착지로 지정</div>
                            </div>
                        </div>
                    </div>
                    <div class="remove-dest-btn" style="${isMulti ? 'display:flex;' : 'display:none;'}"><span class="material-symbols-rounded" style="font-size:16px;">close</span></div>
                </div>
            `;
            destContainer.insertAdjacentHTML('beforeend', html);
        });

        document.querySelectorAll('.city-input').forEach((inputEl, index) => {
            const dest = aiData.destinations[index];
            const hintEl = inputEl.closest('.dest-item').querySelector('.autocomplete-hint');
            
            dest.isVerified = dest.isVerified !== undefined ? dest.isVerified : (dest.city ? true : false);

            if (!dest.isVerified && inputEl.value.trim().length > 0) hintEl.style.display = 'flex';

            if (window.google && window.google.maps && window.google.maps.places) {
                const isoCode = countryIsoMap[dest.country];
                const autocomplete = new google.maps.places.Autocomplete(inputEl, { types: ['(cities)'], componentRestrictions: isoCode ? { country: isoCode } : undefined });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place && place.name) {
                        aiData.destinations[index].city = place.name;
                        aiData.destinations[index].isVerified = true; 
                        hintEl.style.display = 'none'; 
                        validateAiStep(); 
                    }
                });
            }

            // 🌟 강제로 글씨 날아가는 blur 삭제! (안내 문구와 비활성화 제어만 함)
            
            inputEl.addEventListener('input', () => {
                aiData.destinations[index].isVerified = false;
                aiData.destinations[index].city = inputEl.value.trim();
                if (inputEl.value.trim().length > 0) hintEl.style.display = 'flex';
                else hintEl.style.display = 'none';
                validateAiStep();
            });
        });
    };
    
   // 🌟 날짜 선택 시 뒤에 화면 확실히 까매지도록 z-index 상향!
    document.getElementById('btn-open-calendar-ai')?.addEventListener('click', () => {
        calendarTargetIndex = -1; tempStartDate = aiData.startDate; tempEndDate = aiData.endDate;
        calendarOverlay.style.zIndex = '1000'; // 👈 100을 1000으로 수정!
        calendarOverlay.style.display = 'block'; setTimeout(() => calendarModal.classList.add('active'), 10); renderCalendar();
    });

    document.getElementById('btn-add-dest')?.addEventListener('click', () => { aiData.destinations.push({ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }); renderDestinations(); validateAiStep(); });
    document.getElementById('chk-optimize-route')?.addEventListener('change', (e) => { aiData.isOptimizeRoute = e.target.checked; renderDestinations(); });

    destContainer?.addEventListener('click', (e) => {
        const item = e.target.closest('.dest-item');
        if(!item) return;
        const index = parseInt(item.getAttribute('data-index'));

        if(e.target.closest('.country-select-btn')) { openCountryModal(index); }
        else if(e.target.closest('.remove-dest-btn')) { if(aiData.destinations.length > 1) { aiData.destinations.splice(index, 1); renderDestinations(); validateAiStep(); } }
        else if(e.target.closest('.stay-date-btn')) {
            calendarTargetIndex = index; tempStartDate = aiData.destinations[index].startDate || aiData.startDate; tempEndDate = aiData.destinations[index].endDate || aiData.endDate;
            calendarOverlay.style.zIndex = '1000'; 
            calendarOverlay.style.display = 'block'; 
            setTimeout(() => calendarModal.classList.add('active'), 10); 
            renderCalendar();
        }
        else if(e.target.closest('.open-city-map-btn')) {
            const btn = e.target.closest('.open-city-map-btn');
            if(btn.disabled) return;
            
            const selectedCountry = aiData.destinations[index].country;
            currentMapTarget = { type: 'city', index: index, country: selectedCountry };

            const titleEl = document.getElementById('map-modal-title');
            if(titleEl) titleEl.innerText = '지도에서 도시 찾기';
            const searchInput = document.getElementById('map-search-input');
            if(searchInput) searchInput.placeholder = '도시 이름 검색 (예: 도쿄, 오사카)';

            calendarOverlay.style.display = 'block'; 
            document.getElementById('map-modal').classList.add('active'); 
            setTimeout(() => initMap(), 300);
        }
        else if(e.target.closest('.pin-selected')) {
            const selectContainer = e.target.closest('.custom-pin-select');
            const isOp = selectContainer.classList.contains('open');
            document.querySelectorAll('.custom-pin-select').forEach(el => el.classList.remove('open')); 
            if(!isOp) selectContainer.classList.add('open');
        }
        else if(e.target.closest('.pin-option')) {
            const opt = e.target.closest('.pin-option'); const val = opt.getAttribute('data-val');
            aiData.destinations[index].pin = val; renderDestinations(); 
        }
    });

    document.addEventListener('click', (e) => { if(!e.target.closest('.custom-pin-select')) { document.querySelectorAll('.custom-pin-select').forEach(el => el.classList.remove('open')); } });
    destContainer?.addEventListener('input', (e) => {
        const item = e.target.closest('.dest-item'); if(!item) return; const index = parseInt(item.getAttribute('data-index'));
        if(e.target.classList.contains('city-input')) { aiData.destinations[index].city = e.target.value.trim(); validateAiStep(); }
    });

    const openCountryModal = (index) => {
        activeDestIndex = index; countryModalTitle.innerText = '대륙 선택'; btnCountryBack.style.display = 'none';
        let html = ''; Object.keys(countryData).forEach(continent => { html += `<div class="country-list-item" data-continent="${continent}">${continent}<span class="material-symbols-rounded" style="color:#CBD5E1;">chevron_right</span></div>`; });
        countryListContainer.innerHTML = html; calendarOverlay.style.zIndex = '1000'; calendarOverlay.style.display = 'block'; setTimeout(() => countryModal.classList.add('active'), 10);
        document.querySelectorAll('.country-list-item').forEach(el => {
            el.addEventListener('click', () => {
                const cont = el.getAttribute('data-continent'); countryModalTitle.innerText = cont; btnCountryBack.style.display = 'flex';
                const countries = countryData[cont].sort(); let subHtml = '';
                countries.forEach(c => { subHtml += `<div class="country-list-item final-country" data-country="${c}">${c}</div>`; });
                countryListContainer.innerHTML = subHtml;
                document.querySelectorAll('.final-country').forEach(cel => {
                    cel.addEventListener('click', () => {
                        aiData.destinations[activeDestIndex].country = cel.getAttribute('data-country');
                        renderDestinations(); closeCountryModal(); validateAiStep();
                    });
                });
            });
        });
    };

    const closeCountryModal = () => { countryModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    document.getElementById('btn-close-country')?.addEventListener('click', closeCountryModal);
    btnCountryBack?.addEventListener('click', () => openCountryModal(activeDestIndex));

    document.getElementById('btn-ai-standard')?.addEventListener('click', () => { aiMode = 'standard'; aiScreen.classList.add('active'); resetAiFlow(); });
    document.getElementById('btn-ai-tension')?.addEventListener('click', () => { 
        aiMode = 'tension'; 
        aiScreen.classList.add('active'); 
        resetAiFlow(); 
        // 👇 추가
        aiData.people = 2; 
        document.getElementById('people-count').innerText = '2명';
    });
    
    btnPrevAiStep?.addEventListener('click', () => {
        if(aiStepHistory.length > 1) {
            const curStepNum = aiStepHistory.pop();
            const prevStepNum = aiStepHistory[aiStepHistory.length - 1];
            const curEl = document.getElementById(`ai-step-${curStepNum}`);
            const prevEl = document.getElementById(`ai-step-${prevStepNum}`);
            curEl.classList.remove('active'); prevEl.classList.remove('exit'); setTimeout(() => prevEl.classList.add('active'), 10);
            currentAiStep = prevStepNum; aiProgressBar.style.width = `${(currentAiStep/totalAiSteps)*100}%`;
            if(aiStepHistory.length === 1) btnPrevAiStep.style.display = 'none';
            btnAiNext.innerText = '다음으로'; validateAiStep();
        }
    });

    document.getElementById('btn-back-ai')?.addEventListener('click', () => { 
        showCustomAlert({ icon: 'warning', title: '일정 생성 취소', desc: '일정 짜기를 그만두시겠습니까?\n진행 중인 정보는 저장되지 않습니다.', showCancel: true, confirmText: '네, 그만둘래요', isDanger: true, onConfirm: () => { aiScreen.classList.remove('active'); }});
    });

    // 🚀 구글 맵 (Google Maps API) 연동 전역 변수
    let map = null; let marker = null; let geocoder = null;
    let currentMapTarget = { type: 'accom', index: -1 }; 
    let tempSelectedPlace = ''; 

    // 숙소 지도 버튼 클릭 시
    document.getElementById('btn-open-map')?.addEventListener('click', () => { 
        currentMapTarget = { type: 'accom', index: -1 };
        
        const titleEl = document.getElementById('map-modal-title');
        if(titleEl) titleEl.innerText = '지도에서 숙소 찾기';
        const searchInput = document.getElementById('map-search-input');
        if(searchInput) searchInput.placeholder = '호텔이나 랜드마크 이름 검색';

        // 🌟 팝업 띄울 때 까만 배경 우선순위 올려서 엉킴 방지!
        document.getElementById('calendar-overlay').style.zIndex = '1000'; 
        document.getElementById('calendar-overlay').style.display = 'block'; 
        document.getElementById('map-modal').classList.add('active'); 
        setTimeout(() => initMap(), 300); 
    });

    const initMap = () => {
        if(!map) { 
            map = new google.maps.Map(document.getElementById('map-container'), {
                zoom: 14,
                disableDefaultUI: true 
            });
            geocoder = new google.maps.Geocoder();
            
            const searchInput = document.getElementById('map-search-input');
            const searchBox = new google.maps.places.SearchBox(searchInput);
            
            map.addListener('bounds_changed', () => { searchBox.setBounds(map.getBounds()); });
            
            searchBox.addListener('places_changed', () => {
                const places = searchBox.getPlaces();
                if (places.length == 0) return;
                const place = places[0];
                if (!place.geometry || !place.geometry.location) return;

                if(marker) marker.setMap(null);
                map.setCenter(place.geometry.location);
                map.setZoom(16);
                marker = new google.maps.Marker({ position: place.geometry.location, map: map });
                
                tempSelectedPlace = place.name; 
                document.getElementById('map-selected-address').innerText = tempSelectedPlace;
                document.getElementById('btn-confirm-map').disabled = false; // 🌟 핀 꽂으면 설정 버튼 활성화!
            });
            
            map.addListener('click', (e) => { 
                if(marker) marker.setMap(null); 
                marker = new google.maps.Marker({ position: e.latLng, map: map }); 
                
                geocoder.geocode({ location: e.latLng }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        tempSelectedPlace = results[0].formatted_address;
                        document.getElementById('map-selected-address').innerText = tempSelectedPlace; 
                        document.getElementById('btn-confirm-map').disabled = false; // 🌟 핀 꽂으면 설정 버튼 활성화!
                    }
                }); 
            }); 
        }

        tempSelectedPlace = '';
        document.getElementById('map-search-input').value = '';
        document.getElementById('map-selected-address').innerText = '지도를 탭하거나 검색하세요';
        document.getElementById('btn-confirm-map').disabled = true; // 🌟 처음엔 버튼 비활성화
        
        if (currentMapTarget.type === 'city' && currentMapTarget.country) {
            geocoder.geocode({ address: currentMapTarget.country }, (results, status) => {
                if (status === 'OK' && results[0]) { map.setCenter(results[0].geometry.location); map.setZoom(5); }
            });
        } else if (currentMapTarget.type === 'accom' && aiData.destinations[0]?.city) {
            geocoder.geocode({ address: aiData.destinations[0].city }, (results, status) => {
                if (status === 'OK' && results[0]) { map.setCenter(results[0].geometry.location); map.setZoom(13); }
            });
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => { map.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude }); map.setZoom(14); },
                () => { map.setCenter({lat: 37.5665, lng: 126.9780}); map.setZoom(14); } 
            );
        } else {
            map.setCenter({lat: 37.5665, lng: 126.9780}); map.setZoom(14);
        }
        
        setTimeout(() => google.maps.event.trigger(map, 'resize'), 100);
    };

    // 🌟 배경 까매짐 꼬임 방지를 위해 zIndex 초기화 추가
    const closeMap = () => { 
        document.getElementById('map-modal').classList.remove('active'); 
        document.getElementById('calendar-overlay').style.zIndex = ''; 
        document.getElementById('calendar-overlay').style.display = 'none'; 
    }; 
    document.getElementById('btn-close-map')?.addEventListener('click', closeMap); 

    // 🌟 빠져있던 '이 위치로 설정' 버튼 클릭 로직 부활! (이제 딱 1번만 선언됩니다)
    const btnConfirmMap = document.getElementById('btn-confirm-map');
    if (btnConfirmMap) {
        btnConfirmMap.addEventListener('click', () => {
            if (tempSelectedPlace) {
                if (currentMapTarget.type === 'accom') { 
                    document.getElementById('ai-input-accom').value = tempSelectedPlace; 
                    aiData.accom = tempSelectedPlace; 
                    aiData.isAccomVerified = true; 
                    validateAiStep(); 
                } 
                else if (currentMapTarget.type === 'city') { 
                    aiData.destinations[currentMapTarget.index].city = tempSelectedPlace; 
                    aiData.destinations[currentMapTarget.index].isVerified = true; 
                    renderDestinations(); 
                    validateAiStep(); 
                }
            }
            closeMap();
        });
    }

    const resetAiFlow = () => { 
        currentAiStep = 1; aiStepHistory = [1]; aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`; btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true; btnPrevAiStep.style.display = 'none';
        for(let i=1; i<=totalAiSteps; i++) { const stepEl = document.getElementById(`ai-step-${i}`); if(stepEl) { stepEl.classList.remove('exit'); stepEl.className = i===1 ? 'ai-step active' : 'ai-step'; } }
        aiData = { startDate: null, endDate: null, totalTripDays: 0, destinations: [{ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }], isOptimizeRoute: false, transports: [], arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [], myStyles: [], ptStyles: [], themes: [], stamina: 3, mustDo: '' }; 
        tempStartDate = null; tempEndDate = null; updateDateTexts(); renderDestinations(); 
        document.getElementById('ai-input-arr-time').value = ''; document.getElementById('ai-input-dep-time').value = ''; document.getElementById('ai-input-accom').value = ''; document.getElementById('people-count').innerText = '1명'; 
        document.getElementById('ai-input-stamina').value = 3; document.getElementById('stamina-emoji').innerHTML = '<span class="material-symbols-rounded" style="font-size: 48px; color: #10B981; transition: color 0.3s ease;">battery_5_bar</span>';
        document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('selected')); 
        if(aiMode === 'standard') { document.getElementById('step-7-standard').style.display = 'block'; document.getElementById('step-7-tension').style.display = 'none'; } else { document.getElementById('step-7-standard').style.display = 'none'; document.getElementById('step-7-tension').style.display = 'block'; }

        const mustDoInput = document.getElementById('ai-input-must-do');
        if(mustDoInput) mustDoInput.value = '';
    };
    
    const validateAiStep = () => { 
        if(!btnAiNext) return; 
        if(currentAiStep === 1) btnAiNext.disabled = !(aiData.startDate && aiData.endDate);
        else if(currentAiStep === 2) btnAiNext.disabled = !aiData.destinations.every(d => d.city.trim() !== '' && d.isVerified); // 🌟 도시 검증 필수
        else if(currentAiStep === 3) btnAiNext.disabled = aiData.transports.length === 0;
        else if(currentAiStep === 4) btnAiNext.disabled = false; 
        else if(currentAiStep === 5) {
            // 🌟 숙소: 빈칸이면 통과! 한글자라도 쳤는데 검증(선택) 안했으면 버튼 비활성화
            const accomVal = document.getElementById('ai-input-accom')?.value.trim() || '';
            btnAiNext.disabled = (accomVal !== '' && !aiData.isAccomVerified);
        }
        else if(currentAiStep === 6) btnAiNext.disabled = aiData.companion === ''; 
        else if(currentAiStep === 7) btnAiNext.disabled = aiData.ages.length === 0;
        else if(currentAiStep === 8) { if(aiMode === 'standard') btnAiNext.disabled = aiData.styles.length === 0; else btnAiNext.disabled = (aiData.myStyles.length === 0 || aiData.ptStyles.length === 0); }
        else if(currentAiStep === 9) btnAiNext.disabled = aiData.themes.length === 0;
        else if(currentAiStep === 10) btnAiNext.disabled = false;
        else if(currentAiStep === 11) btnAiNext.disabled = false;
    };
    
    document.querySelectorAll('.ai-option-card').forEach(card => { 
        card.addEventListener('click', () => { 
            document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); 
            card.classList.add('selected'); 
            aiData.companion = card.getAttribute('data-val'); 

            if(aiData.companion === '혼자서') {
                aiData.people = 1;
                document.getElementById('people-count').innerText = '1명';
                if(aiData.ages.length > 1) {
                    aiData.ages = [aiData.ages[0]];
                    document.querySelectorAll('.age-chip').forEach(c => {
                        if(c.getAttribute('data-val') !== aiData.ages[0]) c.classList.remove('selected');
                    });
                }
                const hideThemes = ['우정여행', '커플여행', '신혼여행', '가족여행', '효도여행'];
                document.querySelectorAll('.theme-chip').forEach(c => {
                    const val = c.getAttribute('data-val');
                    if(hideThemes.includes(val)) {
                        c.style.display = 'none';
                        if(c.classList.contains('selected')) { c.classList.remove('selected'); aiData.themes = aiData.themes.filter(t => t !== val); }
                    }
                });
            } else {
                if(aiData.people < 2) { aiData.people = 2; document.getElementById('people-count').innerText = '2명'; }
                document.querySelectorAll('.theme-chip').forEach(c => c.style.display = 'inline-flex');
            }
            validateAiStep(); 
        }); 
    });

    document.getElementById('btn-minus-people')?.addEventListener('click', () => { 
        const minLimit = (aiMode === 'tension' || aiData.companion !== '혼자서') ? 2 : 1;
        if(aiData.people > minLimit) { aiData.people--; document.getElementById('people-count').innerText = `${aiData.people}명`; }
    }); 
    document.getElementById('btn-plus-people')?.addEventListener('click', () => { 
        if (aiData.companion === '혼자서') { showCustomAlert({icon:'info', title:'알림', desc:'혼자 여행할 때는 인원을 추가할 수 없어요!'}); return; }
        if(aiData.people < 20) { aiData.people++; document.getElementById('people-count').innerText = `${aiData.people}명`; }
    });

    document.querySelectorAll('.ai-chip').forEach(chip => { 
        chip.addEventListener('click', () => { 
            if(chip.classList.contains('transport-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.transports = aiData.transports.filter(s => s !== val); } 
                else { chip.classList.add('selected'); aiData.transports.push(val); }
            }
            else if(chip.classList.contains('age-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.ages = aiData.ages.filter(a => a !== val); } 
                else { 
                    if(aiData.companion === '혼자서' && aiData.ages.length >= 1) { showCustomAlert({icon:'info', title:'알림', desc:'혼자 여행할 때는 연령대를 1개만 선택할 수 있어요!'}); return; }
                    chip.classList.add('selected'); aiData.ages.push(val); 
                }
            }
            else if(chip.classList.contains('std-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.styles = aiData.styles.filter(s => s !== val); } 
                else { if(aiData.styles.length >= 3) { showCustomAlert({icon:'info', title:'알림', desc:'스타일은 최대 3개까지만 선택할 수 있어요!'}); return; } chip.classList.add('selected'); aiData.styles.push(val); }
            }
            else if(chip.classList.contains('my-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.myStyles = aiData.myStyles.filter(s => s !== val); } 
                else { if(aiData.myStyles.length >= 2) { showCustomAlert({icon:'info', title:'알림', desc:'내 스타일은 2개까지만!'}); return; } chip.classList.add('selected'); aiData.myStyles.push(val); }
            }
            else if(chip.classList.contains('pt-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.ptStyles = aiData.ptStyles.filter(s => s !== val); } 
                else { if(aiData.ptStyles.length >= 2) { showCustomAlert({icon:'info', title:'알림', desc:'동행자 스타일은 2개까지만!'}); return; } chip.classList.add('selected'); aiData.ptStyles.push(val); }
            }
            else if(chip.classList.contains('theme-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.themes = aiData.themes.filter(s => s !== val); } 
                else { if(aiData.themes.length >= 2) { showCustomAlert({icon:'info', title:'알림', desc:'테마는 최대 2개까지만 선택할 수 있어요!'}); return; } chip.classList.add('selected'); aiData.themes.push(val); }
            }
            validateAiStep(); 
        }); 
    });

    const staminaSlider = document.getElementById('ai-input-stamina');
    const staminaEmoji = document.getElementById('stamina-emoji');
    if(staminaSlider) {
        staminaSlider.addEventListener('input', (e) => {
            aiData.stamina = e.target.value;
            let iconName = 'battery_5_bar'; let iconColor = '#10B981';
            if(aiData.stamina == 1) { iconName = 'battery_1_bar'; iconColor = '#DC2626'; }
            else if(aiData.stamina == 2) { iconName = 'battery_3_bar'; iconColor = '#F59E0B'; }
            else if(aiData.stamina == 3) { iconName = 'battery_5_bar'; iconColor = '#10B981'; }
            else if(aiData.stamina == 4) { iconName = 'battery_full'; iconColor = '#3B82F6'; }
            else if(aiData.stamina == 5) { iconName = 'bolt'; iconColor = '#8B5CF6'; }
            staminaEmoji.innerHTML = `<span class="material-symbols-rounded" style="font-size: 48px; color: ${iconColor}; transition: color 0.3s ease;">${iconName}</span>`;
        });
    }

    if(btnAiNext) {
        btnAiNext.addEventListener('click', () => {
            if (currentAiStep < totalAiSteps) {
                if(currentAiStep === 4) { aiData.arrTime = document.getElementById('ai-input-arr-time').value; aiData.depTime = document.getElementById('ai-input-dep-time').value; }
                if(currentAiStep === 5) aiData.accom = document.getElementById('ai-input-accom').value.trim();

                let nextStep = currentAiStep + 1;
                
                if (currentAiStep === 2) {
                    const isDomesticOnly = aiData.destinations.length > 0 && aiData.destinations.every(d => d.country === '대한민국');
                    if (isDomesticOnly) nextStep = 3; else nextStep = 4; 
                } 
                else if (currentAiStep === 3) {
                    const hasAirplane = aiData.transports.includes('비행기');
                    if (hasAirplane) nextStep = 4; else nextStep = 5; 
                }

                if (nextStep <= totalAiSteps) {
                    const curEl = document.getElementById(`ai-step-${currentAiStep}`);
                    const nextEl = document.getElementById(`ai-step-${nextStep}`);
                    curEl.classList.remove('active'); curEl.classList.add('exit');
                    setTimeout(() => nextEl.classList.add('active'), 100);
                    
                    aiStepHistory.push(nextStep); 
                    btnPrevAiStep.style.display = 'flex'; 
                    
                    currentAiStep = nextStep; 
                    aiProgressBar.style.width = `${(currentAiStep/totalAiSteps)*100}%`;
                    if(currentAiStep === totalAiSteps) btnAiNext.innerText = 'AI 일정 생성하기';
                    validateAiStep();
                } else { submitAiFlow(); }
            } else if (currentAiStep === totalAiSteps) { submitAiFlow(); }
        });
    }

    async function submitAiFlow() {
        let statusInterval = null;
        try {
            const loadingOverlay = document.getElementById('ai-loading-overlay');
            const statusText = document.getElementById('ai-loading-status');
            loadingOverlay.classList.add('active');

            let loadingMessages = [];
            if (aiData.transports.includes('비행기')) { loadingMessages.push(`<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">flight_takeoff</span> 항공편 시간 및 공항 이동 동선 계산 중...`); }
            loadingMessages.push(
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">cloud</span> 현지 기상 상황 분석 및 날씨 데이터 연동 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">location_on</span> 선택하신 테마에 맞는 핫플레이스 수집 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">directions_walk</span> 체력 소모도를 분석해 무리 없는 루트 구성 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">auto_awesome</span> 완벽한 여행 일정을 정리하고 있어요!`
            );

            let msgIdx = 0;
            if (statusText) {
                statusText.innerHTML = loadingMessages[0];
                statusInterval = setInterval(() => {
                    msgIdx = (msgIdx + 1) % loadingMessages.length;
                    statusText.classList.add('fade');
                    setTimeout(() => { statusText.innerHTML = loadingMessages[msgIdx]; statusText.classList.remove('fade'); }, 300);
                }, 2500);
            }

            let weatherContextStr = '';
            const today = new Date(); today.setHours(0,0,0,0);
            const startD = new Date(aiData.startDate); startD.setHours(0,0,0,0);
            const diffDays = Math.ceil((startD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            const mainCity = aiData.destinations[0]?.city || 'Seoul';
            
            if (diffDays <= 5 && diffDays >= 0) {
                try {
                    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(mainCity)}&appid=e47059c3681366dbf59d9cc81fe7336f&units=metric&lang=kr`);
                    if (res.ok) {
                        const wData = await res.json();
                        let forecasts = {};
                        wData.list.forEach(item => {
                            const date = item.dt_txt.split(' ')[0];
                            if(item.dt_txt.includes('12:00:00') || item.dt_txt.includes('15:00:00')) { forecasts[date] = { temp: Math.round(item.main.temp), desc: item.weather[0].description }; }
                        });
                        
                        weatherContextStr = '[날씨 데이터]\n다음은 실제 일기예보입니다. 맞춰 동선을 배분하세요:\n';
                        for(let i=0; i<aiData.totalTripDays; i++) {
                            let d = new Date(startD); d.setDate(d.getDate() + i);
                            const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                            if(forecasts[dStr]) weatherContextStr += `- Day ${i+1}: ${forecasts[dStr].desc}, ${forecasts[dStr].temp}°C\n`;
                            else weatherContextStr += `- Day ${i+1}: 예보 없음. 평균 날씨 반영 바람\n`;
                        }
                    }
                } catch(e) { weatherContextStr = `[날씨 데이터]\n해당 도시의 ${startD.getMonth()+1}월 평균 날씨를 반영하여 짜주세요.`; }
            } else { weatherContextStr = `[날씨 데이터]\n여행일이 6일 이후입니다. 해당 도시의 ${startD.getMonth()+1}월 평균 기온과 날씨(건기/우기)를 반영하여 짜주세요.`; }

            aiData.mustDo = document.getElementById('ai-input-must-do')?.value.trim();
            const destText = aiData.destinations.map(d => `${d.country} ${d.city} (${d.stayDays}일, 옵션: ${d.pin})`).join(', ');
            const themeText = aiData.themes.join(', ');
            const styleText = aiMode === 'standard' ? aiData.styles.join(', ') : `내 스타일(${aiData.myStyles.join(',')}), 동행(${aiData.ptStyles.join(',')})`;

            // 🌟 우리가 화면에 띄운 설명 그대로 AI에게 '절대 규칙'으로 주입하기 위한 딕셔너리!
            const themeGuidelines = {
                '우정여행': '트렌디한 핫플, 포토존, 액티비티 위주로 텐션 높게 일정을 구성할 것.',
                '커플여행': '분위기 좋은 식당과 감성 카페 등 데이트하기 좋은 로맨틱한 동선으로 짤 것.',
                '신혼여행': '평생 한 번뿐인 허니문을 위해 고급스럽고 프라이빗한 럭셔리 일정 위주로 짤 것.',
                '가족여행': '아이부터 어른까지 호불호 없는 대중적인 명소와 무난하고 편안한 동선을 유지할 것.',
                '효도여행': '부모님 체력을 최우선으로 하여 걷는 동선을 최소화하고, 고급스러운 뷰와 식사(한식/현지식 조화)에 집중할 것.',
                '자유여행': '뻔한 패키지를 벗어나 발길 닿는 대로 골목과 문화를 탐험하는 현지 밀착형 일정으로 짤 것.',
                '배낭여행': '대중교통과 로컬 찐 맛집을 적극 활용하는 가성비 좋고 활동적인 일정으로 짤 것.',
                '식도락여행': '오직 맛을 위해! 웨이팅이 아깝지 않은 로컬 맛집과 미슐랭 위주의 일정으로 식사 비중을 높일 것.'
            };

            // 사용자가 선택한 테마의 가이드라인만 뽑아서 프롬프트에 넣을 문자열로 만들기
            let themeRules = aiData.themes.map(t => `- [${t} 테마 규칙]: ${themeGuidelines[t]}`).join('\n            ');

            const prompt = `너는 세계 최고의 맞춤형 여행 플래너 AI야. 실존하는 장소로 구성된 완벽한 여행 일정을 JSON 형식으로 짜줘.
            [사용자 정보]
            - 여행지: ${destText}
            - 전체 여행: ${aiData.totalTripDays}일 (${fm(aiData.startDate)} ~ ${fm(aiData.endDate)})
            - 항공편: 도착시간 ${aiData.arrTime || '미정'}, 출발시간 ${aiData.depTime || '미정'}
            - 숙소: ${aiData.accom || '미정'}
            - 교통수단: ${aiData.transports.join(', ') || '대중교통, 도보'}
            - 동행: ${aiData.companion} (${aiData.people}명, 연령대: ${aiData.ages.join(', ')})
            - 테마: ${themeText}
            - 스타일: ${styleText}
            - 체력(1~5): ${aiData.stamina} 
            - 특별 요청: ${aiData.mustDo || '없음'}
            ${weatherContextStr}
            
            [응답 JSON 구조 - 반드시 지킬 것]
            { "dailyPlans": [ { "day": 1, "city": "도시 이름", "hp": 80, "weather": { "mIcon": "sunny", "temp": "28°C", "text": "맑음" }, "spots": [ { "time": "10:00", "type": "tour", "catName": "관광", "mIcon": "photo_camera", "name": "실존 장소 이름", "lat": 35.6895, "lng": 139.6917, "desc": "장소 설명 및 이동 수단", "tip": "꿀팁" } ] } ] }
            
            [AI 제약 조건 및 필수 규칙]
            1. 무조건 JSON 응답.
            2. 특별요청 최우선 반영.
            3. 위경도 필수 기재.
            4. 날씨 mIcon 필수, text에 깔끔하게 기재. 비가 오면 실내 액티비티 적극 배치.
            5. 사용자가 선택한 테마에 맞춰 아래 규칙을 반드시 일정에 강하게 반영할 것!
            ${themeRules}
            `;

            let data = null; let maxRetries = 2; let attempt = 0;
            while (attempt <= maxRetries) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } })
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        if ((response.status === 503 || response.status === 429) && attempt < maxRetries) { attempt++; await new Promise(resolve => setTimeout(resolve, 3000)); continue; }
                        throw new Error("API 연결 실패");
                    }
                    data = await response.json(); break; 
                } catch (err) {
                    if (attempt < maxRetries) { attempt++; await new Promise(resolve => setTimeout(resolve, 3000)); continue; } throw err; 
                }
            }
            let aiResponseText = data.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(aiResponseText);

            if (statusInterval) clearInterval(statusInterval);
            loadingOverlay.classList.remove('active'); 
            isCurrentPlanSaved = false; // 🌟 새 일정이 나왔으니 리셋!
            renderAiTimeline(parsedData); aiScreen.classList.remove('active');
        } catch(e) {
            if (statusInterval) clearInterval(statusInterval);
            document.getElementById('ai-loading-overlay').classList.remove('active');
            showCustomAlert({ icon: 'error', title: '연결 지연', desc: '실패했어요.\n잠시 후 다시 버튼을 눌러주세요!' });
        }
    }

    let dailyPlans = {}; let currentSelectedDay = 1;
    const fallbackImages = { tour: ['1527631509225-7e23115584a3'], food: ['1504674900247-0877df9cc836'], cafe: ['1509042239860-f550ce710b93'], indoor: ['1582967788606-a171c1080cb0'] };
    let placesService = null; 

    function renderAiTimeline(aiResponse) {
        const dests = aiData.destinations.map(d => d.city).filter(c => c !== '');
        const mainDest = dests[0] || '여행지';
        document.getElementById('ai-result-title').innerText = dests.length > 1 ? `${mainDest} 외 ${dests.length - 1}곳` : `${mainDest} 일정`;
        
        let subText = `${fm(aiData.startDate)} ~ ${fm(aiData.endDate)} · `;
        if(aiData.themes.length > 0) subText += `${aiData.themes[0]} · `;
        if(aiMode === 'standard' && aiData.styles.length > 0) subText += `${aiData.styles[0]} 위주`;
        else if (aiMode === 'tension') subText += `우당탕탕 타협 플랜`;
        if(aiData.isOptimizeRoute) subText += ` (최적 동선)`;
        document.getElementById('ai-result-subtitle').innerText = subText;

        const totalDays = aiResponse.dailyPlans.length;
        let tabsHtml = '';
        for(let i=1; i<=totalDays; i++) {
            let tempDate = new Date(aiData.startDate); tempDate.setDate(tempDate.getDate() + (i - 1));
            tabsHtml += `<div class="day-tab ${i===1?'active':''}" data-day="${i}"><div class="d-day">Day ${i}</div><div class="d-date">${tempDate.getMonth()+1}.${tempDate.getDate()}</div></div>`;
        }
        document.getElementById('ai-result-tabs').innerHTML = tabsHtml;

        dailyPlans = {};
        aiResponse.dailyPlans.forEach((dayPlan, pIndex) => {
            let daySpots = [];
            dayPlan.spots.forEach((slot, sIndex) => {
                let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9';
                if(slot.type === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; }
                if(slot.type === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; }
                if(slot.type === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; }
                if(slot.type === 'indoor') { iconColor = '#10B981'; iconBg = 'rgba(16,185,129,0.1)'; }

                let survivalTip = slot.tip ? `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">lightbulb</span><span class="tip-text">${slot.tip}</span></div>` : '';
                let initialImg = `https://images.unsplash.com/photo-${fallbackImages[slot.type][0]}?q=80&w=400&auto=format&fit=crop`;
                let uniqueImgId = `spot-img-${dayPlan.day}-${sIndex}`;

                daySpots.push({ time: slot.time, type: slot.type, catName: slot.catName, mIcon: slot.mIcon, name: slot.name, lat: slot.lat, lng: slot.lng, desc: slot.desc, img: initialImg, imgId: uniqueImgId, color: iconColor, bg: iconBg, tip: survivalTip });
                
                setTimeout(() => {
                    if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
                    placesService.findPlaceFromQuery({ query: `${mainDest} ${slot.name}`, fields: ['photos', 'place_id'] }, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                            const targetSpot = dailyPlans[dayPlan.day].spots[sIndex];
                            targetSpot.place_id = results[0].place_id; 
                            if(results[0].photos) {
                                const realPhotoUrl = results[0].photos[0].getUrl({ maxWidth: 400 });
                                targetSpot.img = realPhotoUrl;
                                const imgEl = document.getElementById(uniqueImgId); if(imgEl) imgEl.style.backgroundImage = `url('${realPhotoUrl}')`;
                            }
                        }
                    });
                }, (pIndex * 5 + sIndex) * 300); 
            }); 
            
            const defaultWeather = { mIcon: 'calendar_month', temp: '-', text: '월 평균 날씨 기준' };
            dailyPlans[dayPlan.day] = { hp: dayPlan.hp, weather: dayPlan.weather || defaultWeather, spots: daySpots };
        });

        renderDayPlan(1, false);
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
                renderDayPlan(parseInt(tab.getAttribute('data-day')), false);
            });
        });

        initMapForResult(mainDest); document.getElementById('ai-result-screen').classList.add('active');
    }

    const renderDayPlan = (day, isPlanB) => {
        currentSelectedDay = day; const plan = dailyPlans[day]; if(!plan) return;
        
        // 🌟 날씨 아이콘 에러 완벽 방어 (AI가 없는 아이콘 이름을 뱉으면 안전한 아이콘으로 강제 변환)
        let safeIcon = plan.weather.mIcon || 'sunny';
        if (safeIcon.toLowerCase().includes('partly')) safeIcon = 'partly_cloudy_day';
        else if (safeIcon.toLowerCase().includes('rain')) safeIcon = 'rainy';
        
        let weatherColor = '#F59E0B'; 
        if(safeIcon === 'rainy' || safeIcon === 'water_drop') weatherColor = '#3B82F6';
        if(safeIcon === 'cloudy' || safeIcon === 'partly_cloudy_day') weatherColor = '#94A3B8';
        if(safeIcon === 'ac_unit' || safeIcon === 'snowing') weatherColor = '#06B6D4';

        let timelineHtml = `
            <div style="display:flex; align-items:center; gap:16px; background:var(--card-bg); padding:16px 20px; border-radius:16px; border:1px solid var(--card-border); margin-bottom:20px;">
                <div style="width:46px; height:46px; border-radius:50%; background:var(--icon-bg); display:flex; justify-content:center; align-items:center;">
                    <span class="material-symbols-rounded" style="font-size:26px; color:${weatherColor};">${safeIcon}</span>
                </div>
                <div style="flex:1;">
                    <div style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:2px;">${plan.weather.temp} · ${plan.weather.text}</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-sub);">날씨를 반영한 스마트 동선입니다.</div>
                </div>
            </div>
            <div class="hp-bar-container"><div class="hp-title"><span>오늘의 체력 소모</span><span>${plan.hp}%</span></div><div class="hp-track"><div class="hp-fill" style="width: ${plan.hp}%;"></div></div></div>
        `;

        plan.spots.forEach((spot, sIndex) => { // 👈 sIndex 추가
            let currentCat = spot.catName; if(isPlanB && spot.type === 'tour') currentCat = '실내 대체'; 
            let imgHtml = spot.img ? `<div class="tc-img" id="${spot.imgId}" style="background-image: url('${spot.img}');"></div>` : '';
            timelineHtml += `
            <div class="timeline-item">
                <div class="timeline-time">${spot.time}</div><div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <!-- 🌟 클릭 기능과 파동 효과 추가 -->
                <div class="timeline-card ripple-btn" data-day="${day}" data-index="${sIndex}" style="cursor:pointer;">
                    <div class="timeline-card-header"><h3 class="tc-title">${spot.name}</h3><span class="tc-category" style="color:${spot.color}; background:${spot.bg};"><span class="material-symbols-rounded" style="font-size:14px; margin-top:1px;">${spot.mIcon}</span>${currentCat}</span></div>
                    <p class="tc-desc">${spot.desc}</p>${imgHtml}${spot.tip}
                </div>
            </div>`;
        });
        document.getElementById('ai-timeline-container').innerHTML = timelineHtml;
        const timelineEl = document.getElementById('ai-timeline-container'); if(timelineEl) timelineEl.scrollTo({ top: 0, behavior: 'smooth' });
        if(isMapView && routeMap) { drawRoute(routeMap.getCenter().lat(), routeMap.getCenter().lng(), plan.spots); }
    };

    let routeMap = null; let pathPolyline = null; let routeMarkers = []; let movingMarker = null;
    let isMapView = false; let currentMarkerIndex = -1; let isPlayingRoute = false; let routeAnimationAbort = false; let isAnimationPaused = false; let playedDays = {}; 

    // 🌟 지하철역, 불필요한 마커를 꺼서 지도를 엄청 깔끔하게 만드는 스타일!
    const cleanMapStyle = [
        { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
    ];

    function initMapForResult(mainDest) {
        const resultMapEl = document.getElementById('ai-result-map');
        if(!routeMap && resultMapEl) {
            // 🌟 메인 지도에도 깔끔한 스타일 적용
            routeMap = new google.maps.Map(resultMapEl, { center: {lat: 37.5665, lng: 126.9780}, zoom: 13, disableDefaultUI: true, padding: { top: 80, bottom: 0, left: 0, right: 0 }, styles: cleanMapStyle });
        }
        if(mainDest !== '미지의 여행지' && routeMap) {
            const tempGeocoder = new google.maps.Geocoder();
            tempGeocoder.geocode({address: mainDest}, (results, status) => { if(status === 'OK' && routeMap) routeMap.setCenter(results[0].geometry.location); });
        }
        isMapView = false; currentMarkerIndex = -1;
        document.getElementById('ai-timeline-container').style.display = 'flex'; document.getElementById('ai-explore-container').style.display = 'none';
        document.getElementById('ai-result-map-wrapper').style.display = 'none'; document.getElementById('top-map-icon').innerText = 'map'; document.getElementById('map-info-card').classList.remove('active');
        document.querySelectorAll('.explore-chip').forEach(c => c?.classList.remove('active')); document.querySelector('.explore-chip[data-type="timeline"]')?.classList.add('active');
    }

    const animateMovementAsync = (startPos, endPos, duration, mIconStr) => {
        return new Promise(resolve => {
            if(movingMarker) movingMarker.setMap(null);
            movingMarker = new google.maps.Marker({ position: startPos, map: routeMap, label: { text: mIconStr, fontFamily: 'Material Symbols Rounded', color: 'white', fontSize: '14px' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#10B981', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 12 }, zIndex: 999 });
            let startTime = performance.now(); let elapsedTotal = 0; let lastTime = startTime;
            const animate = (time) => {
                if(routeAnimationAbort) { movingMarker.setMap(null); return resolve(); } 
                let deltaTime = time - lastTime; lastTime = time;
                if(!isAnimationPaused) elapsedTotal += deltaTime;
                const progress = Math.min(elapsedTotal / duration, 1); const ease = 1 - Math.pow(1 - progress, 3);
                const lat = startPos.lat + (endPos.lat - startPos.lat) * ease; const lng = startPos.lng + (endPos.lng - startPos.lng) * ease;
                movingMarker.setPosition({lat, lng});
                if(!isAnimationPaused) routeMap.setCenter({lat: lat - 0.003, lng: lng}); 
                if(progress < 1) requestAnimationFrame(animate); else { movingMarker.setMap(null); resolve(); }
            };
            requestAnimationFrame(animate);
        });
    };

    const waitWithPause = async (ms) => {
        let elapsed = 0; const interval = 50;
        while (elapsed < ms) { if (routeAnimationAbort) return; if (!isAnimationPaused) elapsed += interval; await new Promise(r => setTimeout(r, interval)); }
    };

    const showMarkerCard = (index, daySpots, pCoords) => {
        const spot = daySpots[index]; if(!spot) return;
        document.getElementById('map-info-title').innerText = spot.name; document.getElementById('map-info-desc').innerText = spot.desc; document.getElementById('map-info-badge').innerText = spot.catName; document.getElementById('map-info-img').style.backgroundImage = `url('${spot.img}')`;
        routeMap.panTo({lat: pCoords[index].lat - 0.003, lng: pCoords[index].lng}); document.getElementById('map-info-card').classList.add('active'); currentMarkerIndex = index;
    };

    const playRouteAnimation = async () => {
        if(isPlayingRoute) { routeAnimationAbort = true; return; } 
        isPlayingRoute = true; routeAnimationAbort = false; isAnimationPaused = false;
        
        const playBtn = document.getElementById('btn-play-route'); const blocker = document.getElementById('animation-blocker');
        if (playBtn) { playBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 28px;">stop</span>'; playBtn.style.background = '#DC2626'; }
        if (blocker) blocker.style.display = 'block'; document.getElementById('map-info-card').classList.remove('active');

        const daySpots = dailyPlans[currentSelectedDay]?.spots || []; const pCoords = daySpots.map(s => ({lat: parseFloat(s.lat), lng: parseFloat(s.lng)}));

        if (pCoords.length > 0) {
            routeMap.setZoom(16); routeMap.panTo(pCoords[0]); await waitWithPause(800);
            for(let i = 0; i < pCoords.length; i++) {
                if(routeAnimationAbort) break;
                if(i > 0) {
                    document.getElementById('map-info-card').classList.remove('active');
                    let calcDuration = 1500; let dist = 0;
                    if (window.google && google.maps.geometry) { dist = google.maps.geometry.spherical.computeDistanceBetween( new google.maps.LatLng(pCoords[i-1].lat, pCoords[i-1].lng), new google.maps.LatLng(pCoords[i].lat, pCoords[i].lng) ); calcDuration = Math.max(1200, Math.min((dist / 1000) * 1000, 3500)); }
                    let currentMIcon = 'directions_car';
                    if (aiData.transports.includes('도보') && dist < 1500) currentMIcon = 'directions_walk'; else if (aiData.transports.length === 1 && aiData.transports.includes('도보')) currentMIcon = 'directions_walk';
                    await animateMovementAsync(pCoords[i-1], pCoords[i], calcDuration, currentMIcon);
                }
                if(routeAnimationAbort) break; showMarkerCard(i, daySpots, pCoords); await waitWithPause(3000); 
            }
        }
        isPlayingRoute = false; routeAnimationAbort = false; isAnimationPaused = false;
        if (playBtn) { playBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 28px;">play_arrow</span>'; playBtn.style.background = '#2563EB'; }
        if (blocker) blocker.style.display = 'none'; document.getElementById('map-info-card').classList.remove('active');
        if (pCoords.length > 0) { const bounds = new google.maps.LatLngBounds(); pCoords.forEach(p => bounds.extend(p)); routeMap.fitBounds(bounds, 50); }
    };

    const drawRoute = (lat, lng, daySpots) => {
        if(pathPolyline) pathPolyline.setMap(null); routeMarkers.forEach(m => m.setMap(null)); routeMarkers = []; currentMarkerIndex = -1; document.getElementById('map-info-card').classList.remove('active');
        if(isPlayingRoute) routeAnimationAbort = true;
        if(!daySpots) daySpots = dailyPlans[currentSelectedDay]?.spots || [];
        const pathCoordinates = daySpots.map(s => ({ lat: parseFloat(s.lat), lng: parseFloat(s.lng) })).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
        pathPolyline = new google.maps.Polyline({ path: pathCoordinates, geodesic: true, strokeColor: '#8B5CF6', strokeOpacity: 1.0, strokeWeight: 4 }); pathPolyline.setMap(routeMap);
        const bounds = new google.maps.LatLngBounds();
        pathCoordinates.forEach((p, index) => {
            bounds.extend(p);
            const marker = new google.maps.Marker({ position: p, map: routeMap, label: { text: String(index + 1), color: 'white', fontWeight: 'bold' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#8B5CF6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 14 } });
            routeMarkers.push(marker);
            marker.addListener('click', () => { if(isPlayingRoute) return; showMarkerCard(index, daySpots, pathCoordinates); });
        });
        if(pathCoordinates.length > 0) { routeMap.fitBounds(bounds, 50); if(!playedDays[currentSelectedDay]) { playedDays[currentSelectedDay] = true; setTimeout(() => playRouteAnimation(), 600); } }
    };
    
    document.getElementById('btn-close-map-info')?.addEventListener('click', () => { document.getElementById('map-info-card').classList.remove('active'); });
    document.getElementById('btn-play-route')?.addEventListener('click', playRouteAnimation);

    document.getElementById('btn-toggle-map-top')?.addEventListener('click', () => {
        isMapView = !isMapView;
        const timelineContainer = document.getElementById('ai-timeline-container'); const exploreContainer = document.getElementById('ai-explore-container'); const resultMapWrapper = document.getElementById('ai-result-map-wrapper'); const mapIcon = document.getElementById('top-map-icon');
        if(isMapView) {
            if(timelineContainer) timelineContainer.style.display = 'none'; if(exploreContainer) exploreContainer.style.display = 'none';
            if(resultMapWrapper) { resultMapWrapper.style.display = 'flex'; resultMapWrapper.style.flexDirection = 'column'; }
            if(mapIcon) mapIcon.innerText = 'format_list_bulleted'; 
            if(routeMap) { setTimeout(() => { google.maps.event.trigger(routeMap, 'resize'); routeMap.panTo(routeMap.getCenter()); drawRoute(routeMap.getCenter().lat(), routeMap.getCenter().lng(), dailyPlans[currentSelectedDay]?.spots); }, 150); }
        } else {
            const activeTab = document.querySelector('.explore-chip.active')?.getAttribute('data-type') || 'timeline';
            if(activeTab === 'timeline' && timelineContainer) timelineContainer.style.display = 'flex'; else if(exploreContainer) exploreContainer.style.display = 'flex';
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; if(mapIcon) mapIcon.innerText = 'map'; document.getElementById('map-info-card').classList.remove('active');
        }
    });

    document.querySelector('.explore-chips-container').addEventListener('click', (e) => {
        const chip = e.target.closest('.explore-chip'); if(!chip) return;
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active');
        const type = chip.getAttribute('data-type');
        const timelineContainer = document.getElementById('ai-timeline-container'); const exploreContainer = document.getElementById('ai-explore-container'); const resultMapWrapper = document.getElementById('ai-result-map-wrapper');
        if(timelineContainer) timelineContainer.scrollTo({ top: 0, behavior: 'smooth' }); if(exploreContainer) exploreContainer.scrollTo({ top: 0, behavior: 'smooth' });
        if(isMapView) { isMapView = false; document.getElementById('top-map-icon').innerText = 'map'; document.getElementById('map-info-card').classList.remove('active'); }
        if(type === 'timeline') { timelineContainer.style.display = 'flex'; exploreContainer.style.display = 'none'; if(resultMapWrapper) resultMapWrapper.style.display = 'none'; 
        } else {
            timelineContainer.style.display = 'none'; if(resultMapWrapper) resultMapWrapper.style.display = 'none'; exploreContainer.style.display = 'flex';
            exploreContainer.innerHTML = `<div style="padding:40px; text-align:center;">불러오는 중...</div>`;
            const mainDest = aiData.destinations[0]?.city || '여행지'; let queryKeyword = '';
            if (type === 'food') queryKeyword = '맛집'; if (type === 'tour') queryKeyword = '유명 명소 랜드마크'; if (type === 'cafe') queryKeyword = '유명 카페';
            if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
            placesService.textSearch({ query: `${mainDest} ${queryKeyword}` }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    let html = '';
                    results.slice(0, 5).forEach((place) => {
                        const photoUrl = place.photos && place.photos.length > 0 ? place.photos[0].getUrl({ maxWidth: 400 }) : `https://images.unsplash.com/photo-${fallbackImages[type][0]}?q=80&w=200&auto=format&fit=crop`;
                        const safeName = place.name.replace(/'/g, "\\'").replace(/"/g, '\\"'); const safePhotoUrl = photoUrl.replace(/'/g, "\\'");
                        const lat = place.geometry.location.lat(); const lng = place.geometry.location.lng();
                        html += `
                        <div class="explore-card" onclick="window.openPlaceDetail('${place.place_id}')" style="cursor:pointer;">
                            <div class="explore-card-img" style="background-image: url('${photoUrl}');"></div>
                            <div class="explore-card-info">
                                <div class="explore-card-title">${place.name}</div>
                                <div class="explore-card-sub">별점 ${place.rating || '없음'} · 구글 맵 실시간 추천</div>
                                <button class="explore-add-btn ripple-btn" onclick="event.stopPropagation(); window.openCustomizeModal('${safeName}', '${type}', '${safePhotoUrl}', ${lat}, ${lng})">+ 내 일정에 교체하기</button>
                            </div>
                        </div>`;
                    });
                    exploreContainer.innerHTML = html;
                } else { exploreContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub);">불러오지 못했습니다.</div>'; }
            });
        }
    });

    // 🌟 똑똑해진 뒤로가기 로직 (저장했으면 바로 보내주고, 안 했으면 경고 띄우기)
    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { 
        if (isCurrentPlanSaved) {
            // 이미 저장했으니 쿨하게 보내줌
            document.getElementById('ai-result-screen').classList.remove('active');
            // '저장 완료' 버튼도 원래대로 완벽 리셋
            const saveBtn = document.querySelector('.floating-save-btn');
            if(saveBtn) { 
                saveBtn.innerHTML = '<span class="material-symbols-rounded">bookmark</span> 내 일정에 저장하기'; 
                saveBtn.style.background = ''; 
                saveBtn.style.pointerEvents = 'auto'; // 🌟 터치 마비 풀어주기
            }
        } else {
            // 저장 안 했으니 경고창 띄움
            showCustomAlert({ icon: 'warning', title: '저장하지 않고 나가기', desc: '작성된 일정이 모두 사라집니다. 정말로 돌아가시겠습니까?', showCancel: true, confirmText: '네, 나갈래요', isDanger: true, onConfirm: () => { document.getElementById('ai-result-screen').classList.remove('active'); } }); 
        }
    });

    const accomInput = document.getElementById('ai-input-accom');
    if (accomInput && window.google && window.google.maps && window.google.maps.places) {
        let isAccomVerified = false;
        const accomAutocomplete = new google.maps.places.Autocomplete(accomInput, { types: ['establishment', 'geocode'] });
        accomAutocomplete.addListener('place_changed', () => {
            const place = accomAutocomplete.getPlace();
            if (place && place.name) { accomInput.value = place.name; aiData.accom = place.name; aiData.isAccomVerified = true; validateAiStep(); }
        });
        accomInput.addEventListener('input', () => { aiData.isAccomVerified = false; aiData.accom = accomInput.value.trim(); validateAiStep(); });
    }

    window.openCustomizeModal = (placeName, placeType, photoUrl, lat, lng) => {
        const modal = document.getElementById('customize-modal'); const listContainer = document.getElementById('customize-spot-list'); const overlay = document.getElementById('calendar-overlay'); 
        if(!modal || !listContainer) return;
        const currentSpots = dailyPlans[currentSelectedDay]?.spots || []; if(currentSpots.length === 0) { alert('교체할 일정이 없습니다.'); return; }

        let html = '';
        currentSpots.forEach((spot, index) => {
            html += `
            <div class="customize-spot-item ripple-btn" onclick="replaceSpot(${index}, '${placeName}', '${placeType}', '${photoUrl}', ${lat}, ${lng})" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--card-border); border-radius: 12px; background: white; cursor: pointer;">
                <div style="width: 48px; height: 48px; border-radius: 8px; background: url('${spot.img}') center/cover;"></div>
                <div style="flex: 1;"><div style="font-size: 12px; color: var(--text-sub); font-weight: 600;">${spot.time} · ${spot.catName}</div><div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-top: 2px;">${spot.name}</div></div>
                <span class="material-symbols-rounded" style="color: #2563EB;">swap_horiz</span>
            </div>`;
        });
        listContainer.innerHTML = html; overlay.style.zIndex = '1000'; overlay.style.display = 'block'; setTimeout(() => modal.classList.add('active'), 10);
    };

    // 🌟 미니맵 그리기 (Before/After 처리 완벽 적용)
    let miniMap = null; let miniPolylines = []; let miniMarkers = []; let pendingReplaceData = null; 
    
    const drawMiniMap = (showAfter) => {
        miniPolylines.forEach(p => p.setMap(null)); miniPolylines = [];
        miniMarkers.forEach(m => m.setMap(null)); miniMarkers = [];

        const { index, newLat, newLng } = pendingReplaceData;
        const currentSpots = dailyPlans[currentSelectedDay].spots;

        const pathCoords = currentSpots.map((s, i) => {
            if (showAfter && i === index) return { lat: parseFloat(newLat), lng: parseFloat(newLng) };
            return { lat: parseFloat(s.lat), lng: parseFloat(s.lng) };
        });

        // 선 그리기 (변경된 부분은 빨강, 나머지는 연보라 또는 기본 보라색)
        for(let i=0; i<pathCoords.length - 1; i++) {
            let lineColor = showAfter ? '#C4B5FD' : '#8B5CF6'; 
            let lineZ = 1;
            if (showAfter && (i === index || i + 1 === index)) {
                lineColor = '#DC2626'; // 빨간색 강조!
                lineZ = 2;
            }
            const poly = new google.maps.Polyline({
                path: [pathCoords[i], pathCoords[i+1]], strokeColor: lineColor, strokeOpacity: 1.0, strokeWeight: showAfter && lineZ === 2 ? 4 : 3, zIndex: lineZ
            });
            poly.setMap(miniMap);
            miniPolylines.push(poly);
        }

        const bounds = new google.maps.LatLngBounds();
        pathCoords.forEach((p, i) => {
            bounds.extend(p);
            let markerColor = showAfter ? '#C4B5FD' : '#8B5CF6';
            let scale = 6; let zIdx = 1;
            if (showAfter && i === index) { markerColor = '#DC2626'; scale = 10; zIdx = 10; } // 새로운 장소 핀을 크고 강렬하게!
            
            const marker = new google.maps.Marker({ position: p, map: miniMap, zIndex: zIdx, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: markerColor, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: scale } });
            miniMarkers.push(marker);
        });
        miniMap.fitBounds(bounds, 30);
    };

    window.replaceSpot = (index, newName, newType, newPhotoUrl, newLat, newLng) => {
        pendingReplaceData = { index, newName, newType, newPhotoUrl, newLat, newLng };
        document.getElementById('customize-modal').classList.remove('active');
        
        // 버튼 색상 초기화 (디폴트를 '변경 동선'으로)
        document.getElementById('btn-show-after').style.background = '#2563EB'; document.getElementById('btn-show-after').style.color = 'white'; document.getElementById('btn-show-after').style.border = 'none';
        document.getElementById('btn-show-before').style.background = 'white'; document.getElementById('btn-show-before').style.color = 'var(--text-sub)'; document.getElementById('btn-show-before').style.border = '1px solid #CBD5E1';

        document.getElementById('confirm-replace-modal').classList.add('active');
        
        setTimeout(() => {
            if(!miniMap) { miniMap = new google.maps.Map(document.getElementById('mini-map-container'), { zoom: 13, disableDefaultUI: true, gestureHandling: 'none', styles: cleanMapStyle }); } // 미니맵도 지하철 숨김 적용
            drawMiniMap(true); 
        }, 300);
    };

    document.getElementById('btn-show-before')?.addEventListener('click', () => {
        document.getElementById('btn-show-before').style.background = '#2563EB'; document.getElementById('btn-show-before').style.color = 'white'; document.getElementById('btn-show-before').style.border = 'none';
        document.getElementById('btn-show-after').style.background = 'white'; document.getElementById('btn-show-after').style.color = 'var(--text-sub)'; document.getElementById('btn-show-after').style.border = '1px solid #CBD5E1';
        drawMiniMap(false);
    });
    
    document.getElementById('btn-show-after')?.addEventListener('click', () => {
        document.getElementById('btn-show-after').style.background = '#2563EB'; document.getElementById('btn-show-after').style.color = 'white'; document.getElementById('btn-show-after').style.border = 'none';
        document.getElementById('btn-show-before').style.background = 'white'; document.getElementById('btn-show-before').style.color = 'var(--text-sub)'; document.getElementById('btn-show-before').style.border = '1px solid #CBD5E1';
        drawMiniMap(true);
    });

    // 🌟 2. 진짜 교체 발동
    document.getElementById('btn-do-replace')?.addEventListener('click', () => {
        if(!pendingReplaceData) return;
        const { index, newName, newType, newPhotoUrl, newLat, newLng } = pendingReplaceData;
        const spot = dailyPlans[currentSelectedDay].spots[index];
        spot.name = newName; spot.img = newPhotoUrl; spot.lat = newLat; spot.lng = newLng;
        let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9'; let mIcon = 'location_on'; let catName = '추천 장소';
        if(newType === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; mIcon = 'restaurant'; catName = '식당'; }
        if(newType === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; mIcon = 'photo_camera'; catName = '명소'; }
        if(newType === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; mIcon = 'local_cafe'; catName = '카페'; }
        spot.type = newType; spot.color = iconColor; spot.bg = iconBg; spot.mIcon = mIcon; spot.catName = catName; spot.desc = '나의 취향에 맞춰 직접 커스터마이징한 특별한 일정입니다 ✨'; spot.tip = ''; 

        document.getElementById('confirm-replace-modal').classList.remove('active');
        renderDayPlan(currentSelectedDay, false); 
        setTimeout(() => { document.getElementById('replace-success-modal').classList.add('active'); }, 300);
    });

    // 🌟 3. 성공 모달 분기 (일정표 보기 / 계속 탐색)
    document.getElementById('btn-success-timeline')?.addEventListener('click', () => {
        document.getElementById('replace-success-modal').classList.remove('active'); document.getElementById('calendar-overlay').style.display = 'none';
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active')); document.querySelector('.explore-chip[data-type="timeline"]').classList.add('active');
        document.getElementById('ai-timeline-container').style.display = 'flex'; document.getElementById('ai-explore-container').style.display = 'none'; document.getElementById('ai-result-map-wrapper').style.display = 'none';
        document.getElementById('ai-timeline-container').scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('btn-success-stay')?.addEventListener('click', () => { document.getElementById('replace-success-modal').classList.remove('active'); document.getElementById('calendar-overlay').style.display = 'none'; });

    window.openPlaceDetail = (placeId) => {
        if(!placeId) { showCustomAlert({icon:'info', title:'안내', desc:'이 장소는 상세 리뷰가 제공되지 않습니다.'}); return; }
        isAnimationPaused = true; 
        document.getElementById('calendar-overlay').style.zIndex = '1000'; document.getElementById('calendar-overlay').style.display = 'block'; document.getElementById('place-detail-modal').classList.add('active');
        document.getElementById('detail-modal-content').innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-sub);">정보를 불러오는 중입니다...</div>';
        if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails({ placeId: placeId, fields: ['name', 'rating', 'reviews', 'url', 'photos'] }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let html = '';
                if(place.photos && place.photos.length > 0) {
                    html += `<div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:12px; margin-bottom:16px; scrollbar-width:none; -webkit-overflow-scrolling: touch;">`;
                    place.photos.slice(0, 5).forEach(p => { html += `<div style="width:140px; height:140px; flex-shrink:0; border-radius:12px; background:url('${p.getUrl({maxWidth:400})}') center/cover; box-shadow:0 2px 8px var(--shadow-color);"></div>`; });
                    html += `</div>`;
                }
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-size:20px; font-weight:800; color:var(--text-main); line-height:1.3;">${place.name}</h3>
                        <span style="background:#FEF08A; color:#D97706; padding:6px 10px; border-radius:8px; font-weight:800; font-size:14px; display:flex; align-items:center; gap:4px; flex-shrink:0;"><span class="material-symbols-rounded" style="font-size:16px;">star</span> ${place.rating || '없음'}</span>
                    </div>`;
                if(place.reviews && place.reviews.length > 0) { place.reviews.slice(0, 3).forEach(rev => { html += `<div style="background:var(--icon-bg); padding:16px; border-radius:16px; margin-bottom:12px;"><div style="font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text-sub); display:flex; align-items:center; gap:6px;"><span class="material-symbols-rounded" style="font-size:16px;">account_circle</span> ${rev.author_name}</div><div style="font-size:14px; color:var(--text-main); line-height:1.5;">"${rev.text}"</div></div>`; }); } 
                else { html += `<p style="font-size:14px; color:var(--text-sub); text-align:center; padding:20px;">등록된 한글 리뷰가 없습니다.</p>`; }
                html += `<button class="search-btn ripple-btn" style="margin-top:16px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.open('${place.url}', '_blank')"><span class="material-symbols-rounded">map</span>구글 맵에서 크게 보기</button>`;
                document.getElementById('detail-modal-content').innerHTML = html;
            } else { document.getElementById('detail-modal-content').innerHTML = '<div style="text-align:center; padding: 20px;">리뷰 정보를 불러오지 못했습니다.</div>'; }
        });
    };

    document.getElementById('map-info-texts-wrap')?.addEventListener('click', () => { const spot = dailyPlans[currentSelectedDay]?.spots[currentMarkerIndex]; if(spot) window.openPlaceDetail(spot.place_id); });

    // 🌟 일정표 카드 클릭 시 상세 리뷰창 띄우기
    document.getElementById('ai-timeline-container')?.addEventListener('click', (e) => {
        const card = e.target.closest('.timeline-card');
        if (!card) return;
        const day = card.getAttribute('data-day');
        const sIndex = card.getAttribute('data-index');
        const spot = dailyPlans[day]?.spots[sIndex];
        
        if (spot && spot.place_id) {
            window.openPlaceDetail(spot.place_id);
        } else {
            showCustomAlert({icon:'info', title:'안내', desc:'상세 정보를 불러오는 중이거나 구글 리뷰가 없는 장소입니다.'});
        }
    });

    // 🌟 모달 닫기 시 공통 처리 (검은화면 제거 & 애니메이션 재개)
    const closeBottomSheet = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
        document.getElementById('calendar-overlay').style.zIndex = '';
        document.getElementById('calendar-overlay').style.display = 'none';
        isAnimationPaused = false; 
    };
    document.getElementById('btn-close-place-detail')?.addEventListener('click', () => closeBottomSheet('place-detail-modal'));
    document.querySelector('#customize-modal .icon-btn')?.addEventListener('click', () => closeBottomSheet('customize-modal'));

   // ==========================================
    // 🌟 네이티브 앱 UX 1: 바텀시트 스와이프 (뒷배경 끌려감 완벽 방어)
    // ==========================================
    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
        let startY = 0; let currentY = 0;
        
        sheet.addEventListener('touchstart', (e) => { 
            const content = sheet.querySelector('.sheet-content'); 
            // 스크롤이 내려가 있을 땐 스와이프 동작 안 함
            if (content && content.scrollTop > 0) return; 
            startY = e.touches[0].clientY; 
        }, {passive: true});
        
        // 👇 passive: false 로 바꾸고 e.preventDefault() 를 넣어야 배경이 안 끌려갑니다!
        sheet.addEventListener('touchmove', (e) => { 
            if (startY === 0) return; 
            currentY = e.touches[0].clientY; 
            const diff = currentY - startY; 
            if (diff > 0) {
                e.preventDefault(); // 🌟 모바일 브라우저의 고무줄 스크롤 현상 차단!
                e.stopPropagation();
                sheet.style.transform = `translateY(${diff}px)`; 
            }
        }, {passive: false}); 
        
        sheet.addEventListener('touchend', (e) => {
            if (startY === 0) return; 
            const diff = currentY - startY;
            if (diff > 100) { 
                sheet.classList.remove('active'); 
                document.getElementById('calendar-overlay').style.zIndex = ''; 
                document.getElementById('calendar-overlay').style.display = 'none'; 
                isAnimationPaused = false; 
            }
            sheet.style.transform = ''; startY = 0; currentY = 0;
        });
    });

    let edgeStartX = 0; let edgeStartY = 0;
    document.addEventListener('touchstart', (e) => { edgeStartX = e.touches[0].clientX; edgeStartY = e.touches[0].clientY; }, {passive: true});
    document.addEventListener('touchend', (e) => {
        if (edgeStartX < 30) {
            const endX = e.changedTouches[0].clientX; const endY = e.changedTouches[0].clientY;
            if (endX - edgeStartX > 50 && Math.abs(endY - edgeStartY) < 50) {
                // 🌟 추가된 방어막: 바텀시트(팝업)가 하나라도 떠있으면 스와이프 무시!!
                if (document.querySelector('.bottom-sheet.active')) return;

                const resultScreen = document.getElementById('ai-result-screen'); 
                const savedPlansScreen = document.getElementById('saved-plans-screen'); // 🌟 추가
                const aiScreen = document.getElementById('ai-screen'); 
                const accountScreen = document.getElementById('account-screen');

                // 제일 위에 떠있는 화면부터 순서대로 체크해서 닫아줍니다!
                if (resultScreen && resultScreen.classList.contains('active')) document.getElementById('btn-back-ai-result')?.click();
                else if (savedPlansScreen && savedPlansScreen.classList.contains('active')) document.getElementById('btn-back-saved-plans')?.click(); // 🌟 추가
                else if (aiScreen && aiScreen.classList.contains('active')) document.getElementById('btn-back-ai')?.click();
                else if (accountScreen && accountScreen.classList.contains('active')) document.getElementById('btn-back-account')?.click();
            }
        }
    });

// ==========================================
    // 🌟 네이티브 앱 UX 2: 폰 상단 상태표시줄 색상 사파리 강제 동기화 (최종본)
    // ==========================================
    const updateThemeColor = () => {
        // 1. 까만 배경(Dim)이 덮여 있는지 확인 (우선순위 1위)
        const isDimmed = 
            document.getElementById('calendar-overlay')?.style.display === 'block' ||
            document.getElementById('custom-alert-overlay')?.classList.contains('active') ||
            document.getElementById('ai-loading-overlay')?.classList.contains('active');
            
        // 2. 하얀색 배경이어야 하는 서브 화면인지 확인
        const isSubScreen = 
            document.getElementById('ai-screen')?.classList.contains('active') ||
            document.getElementById('ai-result-screen')?.classList.contains('active') ||
            document.getElementById('account-screen')?.classList.contains('active') ||
            document.getElementById('saved-plans-screen')?.classList.contains('active');
            
        let lightColor = '#F8FAFC'; // 로비 기본 배경색
        let darkColor = '#0F172A';  // 다크모드 로비 배경색
        
        if (isDimmed) {
            // 팝업 떠서 어두워질 때 (배경 오버레이 톤과 맞춰서 일체감 형성)
            lightColor = '#7A818C'; 
            darkColor = '#05080F';
        } else if (isSubScreen) {
            // 질문 섹션 등 하얀 화면일 때 (완전 흰색)
            lightColor = '#FFFFFF';
            darkColor = '#1E293B';
        }
        
        // 🌟 고집불통 Safari 제어 꼼수!
        // 기존 meta 태그를 다 지우고, 현재 모드에 맞는 딱 1개의 태그만 강제로 쑤셔 넣습니다.
        document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
        
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const targetColor = isDarkMode ? darkColor : lightColor;
        
        const newMeta = document.createElement('meta');
        newMeta.name = 'theme-color';
        newMeta.content = targetColor;
        document.head.appendChild(newMeta);
    };

    // 화면 감시자
    const screenObserver = new MutationObserver(updateThemeColor);
    
    ['ai-screen', 'ai-result-screen', 'account-screen', 'saved-plans-screen', 'custom-alert-overlay', 'ai-loading-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if(el) screenObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
    
    const calOverlay = document.getElementById('calendar-overlay');
    if (calOverlay) screenObserver.observe(calOverlay, { attributes: true, attributeFilter: ['style'] });

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);
    }
    
    updateThemeColor();

    // ==========================================
    // 🌟 1단계 백엔드: AI 일정 Firebase DB에 완벽 저장하기
    // ==========================================
    const saveBtn = document.querySelector('.floating-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            // 1. 튕김 방지: 로그인이 안 되어 있다면?
            if (!auth.currentUser) {
                showCustomAlert({ 
                    icon: 'lock', 
                    title: '로그인 필요', 
                    desc: '일정을 저장하려면 로그인이 필요합니다.\n마이페이지에서 먼저 로그인해주세요.',
                    confirmText: '로그인하러 가기',
                    showCancel: true,
                    onConfirm: () => {
                        document.getElementById('account-screen').classList.add('active');
                    }
                });
                return;
            }

            // 2. 중복 저장 방지: 버튼 상태를 '저장 중'으로 변경하고 터치 막기
            const originalHtml = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span class="material-symbols-rounded" style="animation: rotateRing 1s linear infinite;">sync</span> 안전하게 저장 중...';
            saveBtn.style.pointerEvents = 'none';

            try {
                // 3. DB에 넣을 데이터 예쁘게 포장하기 (에러 날 수 있는 Date 객체는 타임스탬프 숫자로 안전하게 변환)
                const planData = {
                    uid: auth.currentUser.uid, // 누구의 일정인지 식별
                    title: document.getElementById('ai-result-title').innerText,
                    subtitle: document.getElementById('ai-result-subtitle').innerText,
                    startDate: aiData.startDate ? aiData.startDate.getTime() : null,
                    endDate: aiData.endDate ? aiData.endDate.getTime() : null,
                    totalTripDays: aiData.totalTripDays,
                    destinations: aiData.destinations,
                    themes: aiData.themes,
                    styles: aiMode === 'standard' ? aiData.styles : [...aiData.myStyles, ...aiData.ptStyles],
                    dailyPlans: dailyPlans, // AI가 짜준 핵심 일정표 전체
                    createdAt: serverTimestamp() // 저장한 시간 기록
                };

                // 4. Firestore 'triplans' 컬렉션에 밀어넣기!
                await addDoc(collection(db, "triplans"), planData);
                isCurrentPlanSaved = true; // 🌟 DB 저장 성공했으니 저장됨으로 도장 쾅!
                
                // 5. 성공 시 버튼 색상과 텍스트 기분 좋게 변경
                saveBtn.innerHTML = '<span class="material-symbols-rounded">bookmark_added</span> 저장 완료!';
                saveBtn.style.background = '#10B981'; // 성공의 상징 에메랄드 초록색

            } catch (error) {
                // 에러 발생 시 원래대로 복구
                console.error("저장 에러:", error);
                showCustomAlert({ icon: 'error', title: '저장 실패', desc: '서버와 연결이 끊겼습니다. 다시 시도해주세요.' });
                saveBtn.innerHTML = originalHtml; 
                saveBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // 🌟 불러온 데이터를 기억할 메모리 공간
    let loadedSavedPlans = [];

    // ==========================================
    // 🌟 2단계 백엔드: 저장된 플랜 목록 불러오기 (토스/에어비앤비 스타일 카드)
    // ==========================================
    document.getElementById('btn-my-saved-plans')?.addEventListener('click', async () => {
        if (!auth.currentUser) {
            showCustomAlert({ icon: 'lock', title: '로그인 필요', desc: '저장된 일정을 보려면 먼저 로그인해주세요.' });
            return;
        }
        
        const savedScreen = document.getElementById('saved-plans-screen');
        const listContainer = document.getElementById('saved-plans-list');
        listContainer.style.gap = '0'; // 스와이프 마진 충돌 방지
        
        savedScreen.classList.add('active');
        listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-sub);">일정을 불러오는 중입니다...</div>';
        
        try {
            const q = query(collection(db, "triplans"), where("uid", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                listContainer.innerHTML = `
                    <div style="text-align:center; padding:60px 20px; color:var(--text-sub);">
                        <span class="material-symbols-rounded" style="font-size:48px; color:#CBD5E1; margin-bottom:16px;">luggage</span>
                        <h3 style="font-size:16px; font-weight:800; color:var(--text-main); margin-bottom:8px;">저장된 여행이 없습니다</h3>
                        <p style="font-size:14px; font-weight:600;">AI와 함께 새로운 여행을 계획해 보세요!</p>
                    </div>`;
                return;
            }
            
            loadedSavedPlans = []; 
            let html = '';
            
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const docId = docSnap.id; // 🌟 DB 문서의 진짜 고유 ID
                const index = loadedSavedPlans.length;
                loadedSavedPlans.push({ ...data, docId: docId });
                
                // 🌟 스와이프 전용 HTML 뼈대 (바닥엔 휴지통, 위엔 카드)
                html += `
                <div class="swipe-wrapper" id="plan-wrapper-${docId}">
                    <div class="swipe-delete-bg ripple-btn btn-delete-plan" data-id="${docId}">
                        <span class="material-symbols-rounded" style="font-size:28px;">delete</span>
                    </div>
                    <div class="swipe-card-front ripple-btn" data-index="${index}" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                            <div>
                                <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin-bottom:4px;">${data.title}</h3>
                                <p style="font-size:13px; color:var(--text-sub); font-weight:600; line-height:1.4;">${data.subtitle}</p>
                            </div>
                            <span class="material-symbols-rounded" style="color:#CBD5E1;">chevron_right</span>
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                            <span style="display:inline-flex; align-items:center; justify-content:center; height:24px; font-size:11px; background:rgba(37,99,235,0.1); color:#2563EB; padding:0 8px; border-radius:6px; font-weight:800; line-height:1;">${data.themes[0] || '여행'}</span>
                            <span style="display:inline-flex; align-items:center; justify-content:center; height:24px; font-size:11px; background:rgba(139,92,246,0.1); color:#8B5CF6; padding:0 8px; border-radius:6px; font-weight:800; line-height:1;">${data.totalTripDays}일 일정</span>
                        </div>
                    </div>
                </div>`;
            });
            listContainer.innerHTML = html;
        } catch(e) {
            console.error("불러오기 에러:", e);
            if(e.message.includes("indexes")) {
                listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-sub); line-height:1.5;"><b>[개발자 안내]</b><br>데이터 정렬을 위해 Firebase Index 설정이 필요합니다. 콘솔창을 확인해주세요.</div>';
            } else {
                listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#EF4444;">데이터를 불러오지 못했습니다.</div>';
            }
        }
    });

    // ==========================================
    // 🌟 네이티브 앱 UX 3: 스와이프 삭제 & 터치 로직
    // ==========================================
    const listContainer = document.getElementById('saved-plans-list');
    let cardStartX = 0;
    let cardStartY = 0;
    let currentSwipedCard = null; // 현재 열려있는 카드 추적

    // 1. 손가락 닿을 때 (시작)
    listContainer?.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.swipe-card-front');
        if(!card) return;
        
        // 다른 카드가 열려있으면 닫아줌
        if(currentSwipedCard && currentSwipedCard !== card) {
            currentSwipedCard.style.transform = 'translateX(0px)';
            currentSwipedCard.classList.remove('swiped');
            currentSwipedCard = null;
        }
        
        card.style.transition = 'none'; // 드래그 중엔 부드러운 애니메이션 끄기
        cardStartX = e.touches[0].clientX;
        cardStartY = e.touches[0].clientY;
    }, {passive: true});

    // 2. 손가락 드래그 중 (이동)
    listContainer?.addEventListener('touchmove', (e) => {
        const card = e.target.closest('.swipe-card-front');
        if(!card || cardStartX === 0) return;
        
        const diffX = e.touches[0].clientX - cardStartX;
        const diffY = e.touches[0].clientY - cardStartY;
        
        // 상하 스크롤이 더 크면 스와이프 무시 (리스트 스크롤 허용)
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        
        // 왼쪽으로만 밀리게 처리 (오른쪽으로 밀면 0까지만)
        if (diffX < 0) {
            const moveX = Math.max(diffX, -100); // 최대 -100px 까지만 저항감 있게
            card.style.transform = `translateX(${moveX}px)`;
            if(e.cancelable) e.preventDefault(); // 스와이프 중 화면 꿀렁임 방어
        }
    }, {passive: false});

    // 3. 손가락 뗐을 때 (결정)
    listContainer?.addEventListener('touchend', (e) => {
        const card = e.target.closest('.swipe-card-front');
        if(!card || cardStartX === 0) return;
        
        const diffX = e.changedTouches[0].clientX - cardStartX;
        card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'; // 튕기는 애니메이션 온!
        
        if (diffX < -40) {
            // -40px 이상 밀었으면 휴지통 찰칵! 열림
            card.style.transform = 'translateX(-80px)';
            card.classList.add('swiped');
            currentSwipedCard = card;
        } else {
            // 찔끔 밀었으면 다시 스르륵 원상복구
            card.style.transform = 'translateX(0px)';
            card.classList.remove('swiped');
            if(currentSwipedCard === card) currentSwipedCard = null;
        }
        cardStartX = 0; cardStartY = 0;
    });

    // 4. 클릭 감지기 (카드 열기 vs 휴지통 삭제)
    listContainer?.addEventListener('click', async (e) => {
        // [삭제 버튼]을 눌렀을 때
        const deleteBtn = e.target.closest('.btn-delete-plan');
        if (deleteBtn) {
            const docId = deleteBtn.getAttribute('data-id');
            showCustomAlert({
                icon: 'delete', title: '일정 삭제', desc: '정말로 이 일정을 삭제하시겠습니까?\n삭제 후에는 복원할 수 없습니다.', 
                showCancel: true, confirmText: '삭제하기', isDanger: true,
                onConfirm: async () => {
                    try {
                        const wrapper = document.getElementById(`plan-wrapper-${docId}`);
                        wrapper.classList.add('deleting'); // 스르륵 사라지는 CSS 마법
                        await deleteDoc(doc(db, "triplans", docId)); // 🔥 DB에서 영구 삭제
                        setTimeout(() => wrapper.remove(), 300); // 0.3초 뒤 화면에서 삭제
                    } catch(err) {
                        console.error(err);
                        showCustomAlert({ icon:'error', title:'오류', desc:'삭제에 실패했습니다.' });
                    }
                }
            });
            return; // 휴지통 눌렀으면 여기서 종료
        }

        // [카드 뚜껑]을 눌렀을 때
        const card = e.target.closest('.swipe-card-front');
        if (!card) return;
        
        // 카드가 스와이프된 상태로 뚜껑을 누르면? -> 닫아주기만 하고 안으로 안 들어감! (iOS 국룰)
        if (card.classList.contains('swiped')) {
            card.style.transform = 'translateX(0px)';
            card.classList.remove('swiped');
            currentSwipedCard = null;
            return;
        }
        
        // 🌟 안 열려있을 때 누르면 정상적으로 일정표 복구!
        const index = card.getAttribute('data-index');
        const planData = loadedSavedPlans[index];
        if (!planData) return;

        aiData.startDate = planData.startDate ? new Date(planData.startDate) : null;
        aiData.endDate = planData.endDate ? new Date(planData.endDate) : null;
        aiData.totalTripDays = planData.totalTripDays;
        aiData.destinations = planData.destinations || [{city: '여행지'}];
        aiData.themes = planData.themes || [];
        dailyPlans = planData.dailyPlans;
        
        document.getElementById('ai-result-title').innerText = planData.title;
        document.getElementById('ai-result-subtitle').innerText = planData.subtitle;
        
        let tabsHtml = '';
        for(let i=1; i<=aiData.totalTripDays; i++) {
            let tempDate = aiData.startDate ? new Date(aiData.startDate) : new Date();
            tempDate.setDate(tempDate.getDate() + (i - 1));
            tabsHtml += `<div class="day-tab ${i===1?'active':''}" data-day="${i}"><div class="d-day">Day ${i}</div><div class="d-date">${tempDate.getMonth()+1}.${tempDate.getDate()}</div></div>`;
        }
        document.getElementById('ai-result-tabs').innerHTML = tabsHtml;

        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active')); 
                tab.classList.add('active');
                renderDayPlan(parseInt(tab.getAttribute('data-day')), false);
            });
        });

        renderDayPlan(1, false);
        const mainDest = aiData.destinations[0]?.city || '여행지';
        initMapForResult(mainDest); 

        isCurrentPlanSaved = true; 
        const saveBtn = document.querySelector('.floating-save-btn');
        if(saveBtn) { 
            saveBtn.innerHTML = '<span class="material-symbols-rounded">bookmark_added</span> 저장 완료!'; 
            saveBtn.style.background = '#10B981'; 
            saveBtn.style.pointerEvents = 'none'; 
        }

        document.getElementById('ai-result-screen').classList.add('active');
    });

    // 뒤로가기 버튼 로직
    document.getElementById('btn-back-saved-plans')?.addEventListener('click', () => {
        document.getElementById('saved-plans-screen').classList.remove('active');
    });
}); // 👈 파일의 맨 마지막 줄