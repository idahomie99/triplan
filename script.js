import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

// 🚀 Gemini AI API 키
const GEMINI_API_KEY = 'AQ.Ab8RN6Kz9AQPUJVDnJBwEtopgto_BHGbahhbYIsG7U4qPssg9w';

document.addEventListener('DOMContentLoaded', () => {
    
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => { splashScreen.classList.add('hide'); setTimeout(() => splashScreen.remove(), 500); }, 1500);
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
    document.getElementById('btn-close-calendar')?.addEventListener('click', closeCalendar); calendarOverlay.addEventListener('click', closeCalendar);
    
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
            
            // 👇 국가 선택 여부에 따라 입력창 활성/비활성화 처리
            const isCityDisabled = !dest.country;
            const cityPlaceholder = isCityDisabled ? '국가를 먼저 선택해주세요' : '도시 이름 검색 (자동완성)';
            const cityStyle = isCityDisabled ? 'opacity: 0.5; cursor: not-allowed; background: var(--card-border);' : '';

            const html = `
                <div class="dest-item" data-index="${index}" style="animation: fadeIn 0.3s ease-out;">
                    <div class="dest-num" style="${isMulti ? 'display:flex;' : 'display:none;'}">${index + 1}</div>
                    <div class="dest-inputs">
                        <button class="country-select-btn ripple-btn"><span style="color:${countryColor};">${countryStr}</span><span class="material-symbols-rounded">expand_more</span></button>
                        
                        <!-- 🎯 숙소와 똑같이 트렌디한 둥근 사각형 map 아이콘으로 변경! -->
                        <div style="position: relative; display: flex; align-items: center; width: 100%;">
                            <input type="text" class="city-input" placeholder="${cityPlaceholder}" value="${dest.city}" ${isCityDisabled ? 'disabled' : ''} style="${cityStyle} width: 100%; padding-right: 48px;">
                            <button class="open-city-map-btn ripple-btn" style="position: absolute; right: 6px; border: none; background: transparent; color: ${isCityDisabled ? 'var(--card-border)' : '#3B82F6'}; cursor: ${isCityDisabled ? 'not-allowed' : 'pointer'}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" ${isCityDisabled ? 'disabled' : ''}>
                                <span class="material-symbols-rounded" style="font-size: 18px;">map</span>
                            </button>
                        </div>
                        
                        <button class="stay-date-btn ripple-btn" style="${isMulti && aiData.totalTripDays > 0 && !aiData.isOptimizeRoute ? 'display:flex;' : 'display:none;'}"><span class="material-symbols-rounded" style="font-size:16px;">calendar_month</span><span class="stay-date-val">${dateStr}</span></button>
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

        // 👇 도시 검색 구글 자동완성 (Autocomplete) 붙이기
        document.querySelectorAll('.city-input').forEach((inputEl, index) => {
            const dest = aiData.destinations[index];
            if (dest.country && window.google) {
                const isoCode = countryIsoMap[dest.country];
                
                const autocomplete = new google.maps.places.Autocomplete(inputEl, {
                    types: ['(cities)'], 
                    componentRestrictions: isoCode ? { country: isoCode } : undefined 
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place && place.name) {
                        aiData.destinations[index].city = place.name;
                        validateAiStep(); 
                    }
                });
            }
        });
    };

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
            calendarOverlay.style.display = 'block'; setTimeout(() => calendarModal.classList.add('active'), 10); renderCalendar();
        }
        else if(e.target.closest('.open-city-map-btn')) {
            const btn = e.target.closest('.open-city-map-btn');
            if(btn.disabled) return;
            
            currentMapTarget = { type: 'city', index: index };

            // 💡 상황에 맞게 텍스트 갈아끼우기
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
        countryListContainer.innerHTML = html; calendarOverlay.style.display = 'block'; setTimeout(() => countryModal.classList.add('active'), 10);
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
    document.getElementById('btn-ai-tension')?.addEventListener('click', () => { aiMode = 'tension'; aiScreen.classList.add('active'); resetAiFlow(); });
    
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
        
        // 💡 상황에 맞게 텍스트 갈아끼우기
        const titleEl = document.getElementById('map-modal-title');
        if(titleEl) titleEl.innerText = '지도에서 숙소 찾기';
        const searchInput = document.getElementById('map-search-input');
        if(searchInput) searchInput.placeholder = '호텔이나 랜드마크 이름 검색';

        calendarOverlay.style.display = 'block'; 
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
            });
            
            map.addListener('click', (e) => { 
                if(marker) marker.setMap(null); 
                marker = new google.maps.Marker({ position: e.latLng, map: map }); 
                
                geocoder.geocode({ location: e.latLng }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        tempSelectedPlace = results[0].formatted_address;
                        document.getElementById('map-selected-address').innerText = tempSelectedPlace; 
                    }
                }); 
            }); 
        }

        tempSelectedPlace = '';
        document.getElementById('map-search-input').value = '';
        document.getElementById('map-selected-address').innerText = '지도를 탭하거나 검색하세요';
        
        // 🛰️ GPS 내 위치 가져오기
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                () => { map.setCenter({lat: 37.5665, lng: 126.9780}); } 
            );
        } else {
            map.setCenter({lat: 37.5665, lng: 126.9780});
        }
        
        setTimeout(() => google.maps.event.trigger(map, 'resize'), 100);
    };

    const closeMap = () => { document.getElementById('map-modal').classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); }; 
    document.getElementById('btn-close-map')?.addEventListener('click', closeMap); 
    
    document.getElementById('btn-confirm-map').onclick = () => {
        if (tempSelectedPlace) {
            if (currentMapTarget.type === 'accom') {
                document.getElementById('ai-input-accom').value = tempSelectedPlace;
                aiData.accom = tempSelectedPlace;
            } else if (currentMapTarget.type === 'city') {
                aiData.destinations[currentMapTarget.index].city = tempSelectedPlace;
                renderDestinations(); 
                validateAiStep();
            }
        }
        closeMap();
    };

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
        else if(currentAiStep === 2) btnAiNext.disabled = !aiData.destinations.every(d => d.city.trim() !== '');
        else if(currentAiStep === 3) btnAiNext.disabled = aiData.transports.length === 0;
        else if(currentAiStep === 4 || currentAiStep === 5) btnAiNext.disabled = false; 
        else if(currentAiStep === 6) btnAiNext.disabled = aiData.companion === ''; 
        else if(currentAiStep === 7) btnAiNext.disabled = aiData.ages.length === 0;
        else if(currentAiStep === 8) { if(aiMode === 'standard') btnAiNext.disabled = aiData.styles.length === 0; else btnAiNext.disabled = (aiData.myStyles.length === 0 || aiData.ptStyles.length === 0); }
        else if(currentAiStep === 9) btnAiNext.disabled = aiData.themes.length === 0;
        else if(currentAiStep === 10) btnAiNext.disabled = false;
        else if(currentAiStep === 11) btnAiNext.disabled = false;
    };
    
    document.querySelectorAll('.ai-option-card').forEach(card => { card.addEventListener('click', () => { document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); card.classList.add('selected'); aiData.companion = card.getAttribute('data-val'); validateAiStep(); }); });
    document.getElementById('btn-minus-people')?.addEventListener('click', () => { if(aiData.people > 1) { aiData.people--; document.getElementById('people-count').innerText = `${aiData.people}명`; }}); 
    document.getElementById('btn-plus-people')?.addEventListener('click', () => { if(aiData.people < 20) { aiData.people++; document.getElementById('people-count').innerText = `${aiData.people}명`; }});

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
                else { chip.classList.add('selected'); aiData.ages.push(val); }
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
                } else {
                    submitAiFlow();
                }
            } 
            else if (currentAiStep === totalAiSteps) {
                submitAiFlow();
            }
        });
    }

    async function submitAiFlow() {
        let statusInterval = null;
        try {
            const loadingOverlay = document.getElementById('ai-loading-overlay');
            const statusText = document.getElementById('ai-loading-status');
            loadingOverlay.classList.add('active');

            // 💬 비행기 선택 유무에 따라 똑똑하게 바뀌는 상태 메시지
            let loadingMessages = [];
            if (aiData.transports.includes('비행기')) {
                loadingMessages.push(`<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">flight_takeoff</span> 항공편 시간 및 공항 이동 동선 계산 중...`);
            }
            loadingMessages.push(
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">location_on</span> 선택하신 테마에 맞는 핫플레이스 수집 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">directions_walk</span> 체력 소모도를 분석해 무리 없는 루트 구성 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">restaurant</span> 실패 없는 현지 로컬 맛집 매칭 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">map</span> 지도 위 최적의 이동 동선 정렬 중...`,
                `<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">auto_awesome</span> 완벽한 여행 일정을 정리하고 있어요!`
            );

            let msgIdx = 0;
            if (statusText) {
                statusText.innerHTML = loadingMessages[0];
                statusInterval = setInterval(() => {
                    msgIdx = (msgIdx + 1) % loadingMessages.length;
                    statusText.classList.add('fade');
                    setTimeout(() => {
                        statusText.innerHTML = loadingMessages[msgIdx];
                        statusText.classList.remove('fade');
                    }, 300);
                }, 2500);
            }

            // 새로 추가한 특별 요청 데이터 가져오기
            aiData.mustDo = document.getElementById('ai-input-must-do')?.value.trim();

            const destText = aiData.destinations.map(d => `${d.country} ${d.city} (${d.stayDays}일, 옵션: ${d.pin})`).join(', ');
            const themeText = aiData.themes.join(', ');
            const styleText = aiMode === 'standard' ? aiData.styles.join(', ') : `내 스타일(${aiData.myStyles.join(',')}), 동행(${aiData.ptStyles.join(',')})`;

            const prompt = `
            너는 세계 최고의 맞춤형 여행 플래너 AI야. 사용자의 입력 데이터를 바탕으로 실존하는 장소, 식당, 카페로 구성된 완벽한 여행 일정을 JSON 형식으로 짜줘.
            
            [사용자 정보]
            - 여행지: ${destText}
            - 전체 여행: ${aiData.totalTripDays}일 (${fm(aiData.startDate)} ~ ${fm(aiData.endDate)})
            - 항공편: 도착시간 ${aiData.arrTime || '미정'}, 출발시간 ${aiData.depTime || '미정'}
            - 숙소: ${aiData.accom || '미정'}
            - 교통수단: ${aiData.transports.join(', ') || '대중교통, 도보'}
            - 동행: ${aiData.companion} (${aiData.people}명, 연령대: ${aiData.ages.join(', ')})
            - 테마: ${themeText}
            - 스타일: ${styleText}
            - 체력(1~5): ${aiData.stamina} (체력에 맞춰 하루 일정 개수 조절)
            - 특별 요청(필수 반영): ${aiData.mustDo || '없음'}
            
            [응답 JSON 구조 - 반드시 이 구조를 지킬 것]
            {
              "dailyPlans": [
                {
                  "day": 1,
                  "city": "도시 이름",
                  "hp": 80,
                  "spots": [
                    {
                      "time": "10:00",
                      "type": "tour",
                      "catName": "관광",
                      "mIcon": "photo_camera",
                      "name": "진짜 존재하는 명소/식당 이름",
                      "lat": 35.6895, 
                      "lng": 139.6917, 
                      "desc": "장소 설명 및 이동 수단 구체적 서술",
                      "tip": "웨이팅, 포토존 등 꿀팁"
                    }
                  ]
                }
              ]
            }
            
            조건 (절대 엄수):
            1. 반드시 JSON 형식으로만 응답해라.
            2. 무조건 구글 맵에 검색되는 실존하는 진짜 장소로 구성해라. (해당 지역의 상징적인 랜드마크를 적극적으로 포함할 것)
            3. [특별 요청]에 적힌 내용이 있다면 최우선으로 해당 장소나 액티비티를 일정에 무조건 배치해라.
            4. [항공편] 시간이 주어졌다면 반드시 지켜라! 첫날 일정은 공항 도착 시간 + 수속 시간 이후부터 시작하고, 마지막 날 일정은 공항 출발 시간 3시간 전까지만 짜라.
            5. [숙소]가 정해져 있다면 아침 출발 및 저녁 복귀 동선을 숙소 기준으로 최적화해라.
            6. 각 장소의 실제 위도(lat)와 경도(lng)를 정확한 숫자로 기입해라.
            7. desc 항목에 '도보 10분', '지하철 40분' 등 명소 간 이동 수단과 소요 시간을 디테일하게 서술해라.
            `;

            // 🚀 끈질긴 자동 재시도(Retry) 로직 도입
            let data = null;
            let maxRetries = 2; // 본 요청 1번 + 재시도 2번 = 총 3번 기회
            let attempt = 0;

            while (attempt <= maxRetries) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
                        })
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        // 503(서버 과부하) 또는 429(요청 너무 많음) 에러일 경우 몰래 재시도
                        if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
                            console.warn(`🚨 API 지연 감지 (${response.status}). 3초 뒤 조용히 재시도합니다... (${attempt + 1}/${maxRetries})`);
                            attempt++;
                            await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기 후 다시 루프
                            continue;
                        }
                        throw new Error(err.error?.message || "API 연결 실패");
                    }
                    
                    data = await response.json();
                    break; // 완벽하게 성공하면 루프 탈출!

                } catch (err) {
                    if (attempt < maxRetries) {
                        console.warn(`🚨 네트워크 연결 불안정. 3초 뒤 조용히 재시도합니다... (${attempt + 1}/${maxRetries})`);
                        attempt++;
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        continue;
                    }
                    throw err; // 끝끝내 3번 다 실패하면 에러 밖으로 던지기
                }
            }

            let aiResponseText = data.candidates[0].content.parts[0].text;
            aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(aiResponseText);

            if (statusInterval) clearInterval(statusInterval);
            loadingOverlay.classList.remove('active');
            renderAiTimeline(parsedData); 
            aiScreen.classList.remove('active');

        } catch(e) {
            if (statusInterval) clearInterval(statusInterval);
            console.error("AI 생성 중 에러:", e);
            document.getElementById('ai-loading-overlay').classList.remove('active');
            
            showCustomAlert({
                icon: 'warning', title: 'API 연결 오류', 
                desc: '서버 트래픽이 너무 많아 일정을 불러오지 못했습니다.\n임시 데이터로 화면을 띄워드립니다.',
                onConfirm: () => {
                    generateMockTimeline(); 
                    aiScreen.classList.remove('active');
                }
            });
        }
    }

    let dailyPlans = {}; 
    let currentSelectedDay = 1;

    const fallbackImages = {
        tour: ['1527631509225-7e23115584a3', '1552733407-5d5c46c3bb3b', '1506012787146-f92b2d7d6d96'],
        food: ['1504674900247-0877df9cc836', '1550966871-3ed3cdb5ed0c', '1569718212165-3a8278d5f624'],
        cafe: ['1509042239860-f550ce710b93', '1554118811-1e0d58224f24', '1551024601-bec78aea704b'],
        indoor: ['1582967788606-a171c1080cb0', '1519567241046-7f570eee3ce6', '1499856871958-5b9627545d1a']
    };

    let placesService = null; // 구글 장소 사진 가져올 서비스 변수

    function renderAiTimeline(aiResponse) {
        const dests = aiData.destinations.map(d => d.city).filter(c => c !== '');
        const mainDest = dests[0] || '여행지';
        const titleText = dests.length > 1 ? `${mainDest} 외 ${dests.length - 1}곳 일정` : `${mainDest} 일정`;
        document.getElementById('ai-result-title').innerText = titleText;
        
        let subText = `${fm(aiData.startDate)} ~ ${fm(aiData.endDate)} · `;
        if(aiData.themes.length > 0) subText += `${aiData.themes[0]} · `;
        if(aiMode === 'standard' && aiData.styles.length > 0) subText += `${aiData.styles[0]} 위주`;
        else if (aiMode === 'tension') subText += `우당탕탕 타협 플랜`;
        
        if(aiData.isOptimizeRoute) subText += ` (AI 최적 동선 ✨)`;
        document.getElementById('ai-result-subtitle').innerText = subText;

        const totalDays = aiResponse.dailyPlans.length;
        let tabsHtml = '';
        for(let i=1; i<=totalDays; i++) {
            const activeCls = i === 1 ? 'active' : '';
            let tempDate = new Date(aiData.startDate);
            tempDate.setDate(tempDate.getDate() + (i - 1));
            tabsHtml += `<div class="day-tab ${activeCls}" data-day="${i}"><div class="d-day">Day ${i}</div><div class="d-date">${tempDate.getMonth()+1}.${tempDate.getDate()}</div></div>`;
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
                
                // 1. 초기엔 Unsplash 임시 사진을 깔아둠
                let initialImg = `https://images.unsplash.com/photo-${fallbackImages[slot.type] ? fallbackImages[slot.type][Math.floor(Math.random() * fallbackImages[slot.type].length)] : fallbackImages.tour[0]}?q=80&w=400&auto=format&fit=crop`;
                let uniqueImgId = `spot-img-${dayPlan.day}-${sIndex}`; // 고유 ID 부여

                daySpots.push({ 
                    time: slot.time, type: slot.type, catName: slot.catName, mIcon: slot.mIcon, 
                    name: slot.name, lat: slot.lat, lng: slot.lng,
                    desc: slot.desc, img: initialImg, imgId: uniqueImgId, color: iconColor, bg: iconBg, tip: survivalTip 
                });
                
                // 🚀 2. 구글 Places API로 진짜 사진 백그라운드 탐색! (서버 과부하 방지를 위해 시간차 호출)
                setTimeout(() => {
                    if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
                    const request = { query: `${mainDest} ${slot.name}`, fields: ['photos'] };
                    
                    placesService.findPlaceFromQuery(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results[0] && results[0].photos) {
                            const realPhotoUrl = results[0].photos[0].getUrl({ maxWidth: 400 });
                            
                            // 3. 사진을 성공적으로 찾으면 데이터를 업데이트하고 화면 요소도 즉시 교체
                            const targetSpot = dailyPlans[dayPlan.day].spots[sIndex];
                            if(targetSpot) targetSpot.img = realPhotoUrl;
                            
                            const imgEl = document.getElementById(uniqueImgId);
                            if(imgEl) imgEl.style.backgroundImage = `url('${realPhotoUrl}')`;
                        }
                    });
                }, (pIndex * 5 + sIndex) * 300); // 일정 하나당 0.3초 텀을 두고 순차적으로 불러옴

            }); 
            dailyPlans[dayPlan.day] = { hp: dayPlan.hp, spots: daySpots };
        });

        renderDayPlan(1, false);
        
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const dayNum = parseInt(tab.getAttribute('data-day'));
                renderDayPlan(dayNum, false);
            });
        });

        initMapForResult(mainDest);
        document.getElementById('ai-result-screen').classList.add('active');
    }

    const renderDayPlan = (day, isPlanB) => {
        currentSelectedDay = day;
        const plan = dailyPlans[day];
        if(!plan) return;
        
        let timelineHtml = `
            <div class="plan-b-toggle">
                <div class="plan-b-btn ${!isPlanB ? 'active' : ''}" id="btn-plan-a"><span class="material-symbols-rounded">wb_sunny</span>기본 일정</div>
                <div class="plan-b-btn ${isPlanB ? 'active' : ''}" id="btn-plan-b"><span class="material-symbols-rounded">umbrella</span>우천 시 (플랜 B)</div>
                <div class="plan-b-bg" style="transform: translateX(${isPlanB ? '100%' : '0'});"></div>
            </div>
            <div class="hp-bar-container"><div class="hp-title"><span>오늘의 예상 체력 소모</span><span>${plan.hp}%</span></div><div class="hp-track"><div class="hp-fill" style="width: ${plan.hp}%;"></div></div><p style="font-size:11px; color:var(--text-sub); margin-top:8px; font-weight:600;">${plan.hp > 80 ? '⚠️ 체력 소모가 매우 큽니다. 편한 신발을 신고 휴식을 챙기세요!' : '✨ 컨디션 안배에 딱 좋은 완벽한 플랜입니다.'}</p></div>
        `;

        plan.spots.forEach(spot => {
            let currentCat = spot.catName;
            if(isPlanB && spot.type === 'tour') currentCat = '실내 대체'; 
            
            // 👇 고유 ID(imgId)를 적용해서 구글 사진이 도착하면 쇽! 하고 바뀌게 설정
            let imgHtml = spot.img ? `<div class="tc-img" id="${spot.imgId}" style="background-image: url('${spot.img}');"></div>` : '';

            timelineHtml += `
            <div class="timeline-item">
                <div class="timeline-time">${spot.time}</div>
                <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <div class="timeline-card">
                    <div class="timeline-card-header"><h3 class="tc-title">${spot.name}</h3><span class="tc-category" style="color:${spot.color}; background:${spot.bg};"><span class="material-symbols-rounded" style="font-size:14px; margin-top:1px;">${spot.mIcon}</span>${currentCat}</span></div>
                    <p class="tc-desc">${spot.desc}</p>
                    ${imgHtml}
                    ${spot.tip}
                </div>
            </div>`;
        });
        document.getElementById('ai-timeline-container').innerHTML = timelineHtml;

        const resultScreen = document.getElementById('ai-result-screen');
        if(resultScreen) resultScreen.scrollTo({ top: 0, behavior: 'smooth' });
        
        document.getElementById('btn-plan-a')?.addEventListener('click', () => { if(isPlanB) renderDayPlan(day, false); });
        document.getElementById('btn-plan-b')?.addEventListener('click', () => { 
            if(!isPlanB) { 
                showCustomAlert({icon:'umbrella', title:'우천 시 동선 변경', desc:'비가 오네요! 미술관과 쇼핑몰 등 실내 일정 위주로 동선을 안전하게 재구성했습니다.', onConfirm: () => {
                    renderDayPlan(day, true); 
                }});
            }
        });
        
        if(isMapView && routeMap) { drawRoute(routeMap.getCenter().lat(), routeMap.getCenter().lng(), plan.spots); }
    };

    // 🚀 구글 맵 (Google Maps) 라우팅 변수
    let routeMap = null; let pathPolyline = null; let routeMarkers = []; let movingMarker = null;
let isMapView = false; let currentMarkerIndex = -1;

    function initMapForResult(mainDest) {
        const resultMapEl = document.getElementById('ai-result-map');
        if(!routeMap && resultMapEl) {
            routeMap = new google.maps.Map(resultMapEl, {
                center: {lat: 37.5665, lng: 126.9780},
                zoom: 13,
                disableDefaultUI: true
            });
        }

        if(mainDest !== '미지의 여행지' && routeMap) {
            const tempGeocoder = new google.maps.Geocoder();
            tempGeocoder.geocode({address: mainDest}, (results, status) => {
                if(status === 'OK' && routeMap) {
                    routeMap.setCenter(results[0].geometry.location);
                }
            });
        }

        isMapView = false; currentMarkerIndex = -1;
        const timelineEl = document.getElementById('ai-timeline-container');
        const exploreEl = document.getElementById('ai-explore-container');
        const topIconEl = document.getElementById('top-map-icon');
        const mapCardEl = document.getElementById('map-info-card');
        const resultMapWrapper = document.getElementById('ai-result-map-wrapper'); // 👈 추가

        if (timelineEl) timelineEl.style.display = 'flex';
        if (exploreEl) exploreEl.style.display = 'none';
        
        // 🎯 핵심! wrapper만 숨기고 도화지 자체는 숨기지 않아야 회색 에러가 안 나!
        if (resultMapWrapper) resultMapWrapper.style.display = 'none'; 
        if (resultMapEl) resultMapEl.style.display = 'block'; 
        
        if (topIconEl) topIconEl.innerText = 'map';
        if (mapCardEl) mapCardEl.classList.remove('active');
        
        document.querySelectorAll('.explore-chip').forEach(c => c?.classList.remove('active'));
        document.querySelector('.explore-chip[data-type="timeline"]')?.classList.add('active');
    }

    const animateMovement = (startPos, endPos, duration, callback) => {
        if(movingMarker) movingMarker.setMap(null);
        
        movingMarker = new google.maps.Marker({
            position: startPos,
            map: routeMap,
            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#10B981', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 10 }
        });
        
        const startTime = performance.now();
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            
            const lat = startPos.lat + (endPos.lat - startPos.lat) * ease;
            const lng = startPos.lng + (endPos.lng - startPos.lng) * ease;
            movingMarker.setPosition({lat, lng});
            
            if(progress < 1) { requestAnimationFrame(animate); } 
            else { movingMarker.setMap(null); movingMarker = null; if(callback) callback(); }
        };
        requestAnimationFrame(animate);
    };

    const drawRoute = (lat, lng, daySpots) => {
        if(pathPolyline) pathPolyline.setMap(null);
        routeMarkers.forEach(m => m.setMap(null)); routeMarkers = [];
        currentMarkerIndex = -1;
        document.getElementById('map-info-card').classList.remove('active');

        if(!daySpots) {
            if(dailyPlans && dailyPlans[currentSelectedDay]) daySpots = dailyPlans[currentSelectedDay].spots; else daySpots = [];
        }

        const pathCoordinates = daySpots.map(spot => ({
            lat: parseFloat(spot.lat),
            lng: parseFloat(spot.lng)
        })).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));
        
        pathPolyline = new google.maps.Polyline({
            path: pathCoordinates, geodesic: true, strokeColor: '#8B5CF6', strokeOpacity: 1.0, strokeWeight: 4
        });
        pathPolyline.setMap(routeMap);
        
        const bounds = new google.maps.LatLngBounds();
        
        pathCoordinates.forEach((p, index) => {
            bounds.extend(p);
            const marker = new google.maps.Marker({
                position: p, map: routeMap,
                label: { text: String(index + 1), color: 'white', fontWeight: 'bold' },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#8B5CF6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 14 }
            });
            
            routeMarkers.push(marker);

            marker.addListener('click', () => {
                const infoCard = document.getElementById('map-info-card');
                infoCard.classList.remove('active');

                const showCard = () => {
                    const spot = daySpots[index];
                    document.getElementById('map-info-title').innerText = spot.name;
                    document.getElementById('map-info-desc').innerText = spot.desc;
                    document.getElementById('map-info-badge').innerText = spot.catName;
                    document.getElementById('map-info-img').style.backgroundImage = `url('${spot.img}?q=80&w=200&auto=format&fit=crop')`;
                    
                    routeMap.panTo({lat: p.lat - 0.005, lng: p.lng});
                    setTimeout(() => infoCard.classList.add('active'), 300);
                };

                if (index > 0 && currentMarkerIndex < index) {
                    animateMovement(pathCoordinates[index-1], p, 1200, showCard);
                } else { showCard(); }
                currentMarkerIndex = index;
            });
        });
        
        if(pathCoordinates.length > 0) routeMap.fitBounds(bounds);
    };

    document.getElementById('btn-toggle-map-top')?.addEventListener('click', () => {
        isMapView = !isMapView;
        const timelineContainer = document.getElementById('ai-timeline-container');
        const exploreContainer = document.getElementById('ai-explore-container');
        const resultMapWrapper = document.getElementById('ai-result-map-wrapper'); 
        const mapIcon = document.getElementById('top-map-icon');

        if(isMapView) {
            if(timelineContainer) timelineContainer.style.display = 'none'; 
            if(exploreContainer) exploreContainer.style.display = 'none';
            
            // 👇 block 대신 flex를 써서 영역을 꽉 채우게 수정!
            if(resultMapWrapper) {
                resultMapWrapper.style.display = 'flex';
                resultMapWrapper.style.flexDirection = 'column';
            }
            if(mapIcon) mapIcon.innerText = 'format_list_bulleted'; 
            
            if(routeMap) {
                // 👇 150ms 뒤에 사이즈를 재계산하고 강제로 센터를 맞춰서 회색 지도 방지!
                setTimeout(() => {
                    google.maps.event.trigger(routeMap, 'resize');
                    routeMap.panTo(routeMap.getCenter()); 
                    drawRoute(routeMap.getCenter().lat(), routeMap.getCenter().lng(), dailyPlans[currentSelectedDay]?.spots);
                }, 150);
            }
        } else {
            const activeTab = document.querySelector('.explore-chip.active')?.getAttribute('data-type') || 'timeline';
            if(activeTab === 'timeline' && timelineContainer) timelineContainer.style.display = 'flex'; 
            else if(exploreContainer) exploreContainer.style.display = 'flex';
            
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; 
            if(mapIcon) mapIcon.innerText = 'map'; 
            const mapCardEl = document.getElementById('map-info-card');
            if(mapCardEl) mapCardEl.classList.remove('active');
        }
    });

    document.querySelector('.explore-chips-container').addEventListener('click', (e) => {
        const chip = e.target.closest('.explore-chip');
        if(!chip) return;
        
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active');
        
        const type = chip.getAttribute('data-type');
        const timelineContainer = document.getElementById('ai-timeline-container');
        const exploreContainer = document.getElementById('ai-explore-container');
        const resultMapWrapper = document.getElementById('ai-result-map-wrapper'); // 👈 wrapper로 변경!
        
        if(isMapView) { isMapView = false; document.getElementById('top-map-icon').innerText = 'map'; document.getElementById('map-info-card').classList.remove('active'); }

        if(type === 'timeline') {
            timelineContainer.style.display = 'flex'; exploreContainer.style.display = 'none'; 
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; // 👈 wrapper 끄기
        } else {
            timelineContainer.style.display = 'none'; 
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; 
            exploreContainer.style.display = 'flex';
            
            // 👇 구글 API에서 진짜 데이터를 불러오는 동안 보여줄 로딩 뷰
            exploreContainer.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--text-sub); width: 100%;"><div class="magic-spinner-ring" style="width: 30px; height: 30px; border-width: 3px; margin: 0 auto 16px;"></div>현지 실시간 추천 장소를 찾고 있습니다...</div>';

            const mainDest = aiData.destinations[0]?.city || '여행지';
            let queryKeyword = '';
            if (type === 'food') queryKeyword = '맛집';
            if (type === 'tour') queryKeyword = '유명 명소 랜드마크';
            if (type === 'cafe') queryKeyword = '유명 카페';

            if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
            
            // 🚀 구글 Places API 텍스트 검색 발동!
            placesService.textSearch({ query: `${mainDest} ${queryKeyword}` }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    let html = '';
                    const topResults = results.slice(0, 5); // 상위 5개만 깔끔하게 노출
                    
                    topResults.forEach((place) => {
                        const photoUrl = place.photos && place.photos.length > 0 
                            ? place.photos[0].getUrl({ maxWidth: 400 }) 
                            : `https://images.unsplash.com/photo-${fallbackImages[type][Math.floor(Math.random() * fallbackImages[type].length)]}?q=80&w=200&auto=format&fit=crop`;
                        const rating = place.rating || (4 + Math.random()).toFixed(1);
                        
                        // 이름과 사진 URL에 들어간 따옴표 에러 방지
                        const safeName = place.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                        const safePhotoUrl = photoUrl.replace(/'/g, "\\'");

                        html += `
                        <div class="explore-card">
                            <div class="explore-card-img" style="background-image: url('${photoUrl}');"></div>
                            <div class="explore-card-info">
                                <div class="explore-card-title">${place.name}</div>
                                <div class="explore-card-sub">별점 ${rating} · 구글 맵 실시간 추천</div>
                                <button class="explore-add-btn ripple-btn" onclick="openCustomizeModal('${safeName}', '${type}', '${safePhotoUrl}')">+ 내 일정에 교체하기</button>
                            </div>
                        </div>`;
                    });
                    exploreContainer.innerHTML = html;
                } else {
                    exploreContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-sub); width: 100%;">정보를 불러오지 못했습니다.</div>';
                }
            });
        }

    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { 
        showCustomAlert({ icon: 'warning', title: '저장하지 않고 나가기', desc: '작성된 일정이 모두 사라집니다. 정말로 돌아가시겠습니까?', showCancel: true, confirmText: '네, 나갈래요', isDanger: true, onConfirm: () => { document.getElementById('ai-result-screen').classList.remove('active'); } });
    });

    const navHome = document.getElementById('nav-home'); 
    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
// 🚀 [커스터마이징] 탐색에서 선택한 장소를 모달에 띄우기
    window.openCustomizeModal = (placeName, placeType, photoUrl) => {
        const modal = document.getElementById('customize-modal');
        const listContainer = document.getElementById('customize-spot-list');
        const overlay = document.getElementById('calendar-overlay'); 
        
        if(!modal || !listContainer) return;
        
        const currentSpots = dailyPlans[currentSelectedDay]?.spots || [];
        if(currentSpots.length === 0) { alert('현재 날짜에 교체할 일정이 없습니다.'); return; }

        let html = '';
        currentSpots.forEach((spot, index) => {
            html += `
            <div class="customize-spot-item ripple-btn" onclick="replaceSpot(${index}, '${placeName}', '${placeType}', '${photoUrl}')" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--card-border); border-radius: 12px; background: white; cursor: pointer;">
                <div style="width: 48px; height: 48px; border-radius: 8px; background: url('${spot.img}') center/cover;"></div>
                <div style="flex: 1;">
                    <div style="font-size: 12px; color: var(--text-sub); font-weight: 600;">${spot.time} · ${spot.catName}</div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-top: 2px;">${spot.name}</div>
                </div>
                <span class="material-symbols-rounded" style="color: #2563EB;">swap_horiz</span>
            </div>`;
        });
        
        listContainer.innerHTML = html;
        overlay.style.zIndex = 999; // 모달 배경 뎁스 조정
        overlay.style.display = 'block';
        setTimeout(() => modal.classList.add('active'), 10);
    };

    // 🚀 [커스터마이징] 선택한 일정으로 쇽! 교체하기
    window.replaceSpot = (index, newName, newType, newPhotoUrl) => {
        const spot = dailyPlans[currentSelectedDay].spots[index];
        spot.name = newName; spot.img = newPhotoUrl;
        
        // 카테고리에 맞춰 아이콘과 컬러 실시간 변경
        let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9'; let mIcon = 'location_on'; let catName = '추천 장소';
        if(newType === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; mIcon = 'restaurant'; catName = '식당'; }
        if(newType === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; mIcon = 'photo_camera'; catName = '명소'; }
        if(newType === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; mIcon = 'local_cafe'; catName = '카페'; }
        
        spot.type = newType; spot.color = iconColor; spot.bg = iconBg; spot.mIcon = mIcon; spot.catName = catName;
        spot.desc = '나의 취향에 맞춰 직접 커스터마이징한 특별한 일정입니다 ✨'; spot.tip = ''; 

        // 1. 모달 닫기
        document.getElementById('customize-modal').classList.remove('active');
        document.getElementById('calendar-overlay').style.display = 'none';
        
        // 2. 일정표 새로고침 및 화면 전환
        renderDayPlan(currentSelectedDay, false); 
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.explore-chip[data-type="timeline"]').classList.add('active');
        document.getElementById('ai-timeline-container').style.display = 'flex'; 
        document.getElementById('ai-explore-container').style.display = 'none';

        // 3. 기분 좋은 성공 알림!
        showCustomAlert({icon: 'check_circle', title: '일정 교체 완료', desc: `[${newName}] 장소로 완벽하게 교체되었습니다! 😆`});
    };
});