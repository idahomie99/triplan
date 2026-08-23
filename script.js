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

        // 👇 도시 검색 구글 자동완성 (Autocomplete) 붙이기 및 강제 선택 방어막
        document.querySelectorAll('.city-input').forEach((inputEl, index) => {
            const dest = aiData.destinations[index];
            
            dest.isVerified = dest.isVerified !== undefined ? dest.isVerified : (dest.city ? true : false);

            if (window.google && window.google.maps && window.google.maps.places) {
                const isoCode = countryIsoMap[dest.country];
                
                const autocomplete = new google.maps.places.Autocomplete(inputEl, {
                    types: ['(cities)'], 
                    componentRestrictions: isoCode ? { country: isoCode } : undefined 
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (place && place.name) {
                        aiData.destinations[index].city = place.name;
                        aiData.destinations[index].isVerified = true; 
                        validateAiStep(); 
                    }
                });
            }

            // 🛡️ 자동완성 강제 방어막
            inputEl.addEventListener('blur', () => {
                setTimeout(() => {
                    if (inputEl.value.trim() !== '' && !aiData.destinations[index].isVerified) {
                        showCustomAlert({
                            icon: 'warning', 
                            title: '도시 선택 확인', 
                            desc: '정확한 위치 인식을 위해 반드시 아래에 뜨는 자동완성 목록에서 도시를 선택해주세요!'
                        });
                        inputEl.value = '';
                        aiData.destinations[index].city = '';
                        validateAiStep();
                    }
                }, 200);
            });

            // 타이핑을 다시 시작하면 검증 해제
            inputEl.addEventListener('input', () => {
                aiData.destinations[index].isVerified = false;
                aiData.destinations[index].city = inputEl.value.trim();
                validateAiStep();
            });
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
        
        // 🛰️ 선택한 국가/도시로 이동 (GPS 무작정 묻기 방지!)
        if (currentMapTarget.type === 'city' && currentMapTarget.country) {
            geocoder.geocode({ address: currentMapTarget.country }, (results, status) => {
                if (status === 'OK' && results[0]) { map.setCenter(results[0].geometry.location); map.setZoom(5); }
            });
        } else if (currentMapTarget.type === 'accom' && aiData.destinations[0]?.city) {
            // 숙소를 찾을 땐 사용자가 고른 '도시'를 중심으로 열어줌!
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
    
    document.querySelectorAll('.ai-option-card').forEach(card => { 
        card.addEventListener('click', () => { 
            document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); 
            card.classList.add('selected'); 
            aiData.companion = card.getAttribute('data-val'); 

            // 🎯 혼자서 vs 일행 분기 로직
            if(aiData.companion === '혼자서') {
                aiData.people = 1;
                document.getElementById('people-count').innerText = '1명';
                
                // 연령대 1개만 남기고 초기화
                if(aiData.ages.length > 1) {
                    aiData.ages = [aiData.ages[0]];
                    document.querySelectorAll('.age-chip').forEach(c => {
                        if(c.getAttribute('data-val') !== aiData.ages[0]) c.classList.remove('selected');
                    });
                }
                
                // 특정 테마 숨기기 및 선택 해제
                const hideThemes = ['우정여행', '커플여행', '신혼여행', '가족여행', '효도여행'];
                document.querySelectorAll('.theme-chip').forEach(c => {
                    const val = c.getAttribute('data-val');
                    if(hideThemes.includes(val)) {
                        c.style.display = 'none';
                        if(c.classList.contains('selected')) {
                            c.classList.remove('selected');
                            aiData.themes = aiData.themes.filter(t => t !== val);
                        }
                    }
                });
            } else {
                // 혼자가 아니면 무조건 최소 2명!
                if(aiData.people < 2) { 
                    aiData.people = 2; 
                    document.getElementById('people-count').innerText = '2명'; 
                }
                // 숨겼던 테마 다시 보이기
                document.querySelectorAll('.theme-chip').forEach(c => c.style.display = 'inline-flex');
            }

            validateAiStep(); 
        }); 
    });

    document.getElementById('btn-minus-people')?.addEventListener('click', () => { 
        // 🎯 최소 인원 계산 로직 (혼자가 아니면 최소 2명)
        const minLimit = (aiMode === 'tension' || aiData.companion !== '혼자서') ? 2 : 1;
        if(aiData.people > minLimit) { 
            aiData.people--; 
            document.getElementById('people-count').innerText = `${aiData.people}명`; 
        }
    }); 
    document.getElementById('btn-plus-people')?.addEventListener('click', () => { 
        // 🎯 '혼자서' 모드일 때는 최대 인원을 1명으로 쾅 못 박기!
        if (aiData.companion === '혼자서') {
            showCustomAlert({icon:'info', title:'알림', desc:'혼자 여행할 때는 인원을 추가할 수 없어요!'});
            return;
        }
        
        if(aiData.people < 20) { 
            aiData.people++; 
            document.getElementById('people-count').innerText = `${aiData.people}명`; 
        }
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
                if(chip.classList.contains('selected')) { 
                    chip.classList.remove('selected'); aiData.ages = aiData.ages.filter(a => a !== val); 
                } else { 
                    // 🎯 혼자일 땐 연령대 1개만 선택 가능!
                    if(aiData.companion === '혼자서' && aiData.ages.length >= 1) {
                        showCustomAlert({icon:'info', title:'알림', desc:'혼자 여행할 때는 연령대를 1개만 선택할 수 있어요!'}); return;
                    }
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

            let loadingMessages = [];
            if (aiData.transports.includes('비행기')) {
                loadingMessages.push(`<span class="material-symbols-rounded" style="vertical-align: text-bottom; font-size: 18px; margin-right: 4px;">flight_takeoff</span> 항공편 시간 및 공항 이동 동선 계산 중...`);
            }
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
                    setTimeout(() => {
                        statusText.innerHTML = loadingMessages[msgIdx];
                        statusText.classList.remove('fade');
                    }, 300);
                }, 2500);
            }

            // 🌤️ [날씨 로직] 5일 이내인지 확인하고 OpenWeatherMap API 호출하기
            let weatherContextStr = '';
            const today = new Date();
            today.setHours(0,0,0,0);
            const startD = new Date(aiData.startDate);
            startD.setHours(0,0,0,0);
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
                            if(item.dt_txt.includes('12:00:00') || item.dt_txt.includes('15:00:00')) {
                                forecasts[date] = { temp: Math.round(item.main.temp), desc: item.weather[0].description };
                            }
                        });
                        
                        weatherContextStr = '[날씨 데이터]\n다음은 OpenWeatherMap의 실제 일기예보입니다. 이 날씨에 맞춰 동선을 배분하세요:\n';
                        for(let i=0; i<aiData.totalTripDays; i++) {
                            let d = new Date(startD);
                            d.setDate(d.getDate() + i);
                            const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                            if(forecasts[dStr]) {
                                weatherContextStr += `- Day ${i+1}: ${forecasts[dStr].desc}, ${forecasts[dStr].temp}°C (실제 날씨)\n`;
                            } else {
                                weatherContextStr += `- Day ${i+1}: 예보 없음. ${startD.getMonth()+1}월 평균 날씨 반영 바람\n`;
                            }
                        }
                    }
                } catch(e) {
                    console.log('날씨 API 연동 실패, 평균 날씨로 대체');
                    weatherContextStr = `[날씨 데이터]\n해당 도시의 ${startD.getMonth()+1}월 평균 날씨를 반영하여 일정을 짜주세요.`;
                }
            } else {
                weatherContextStr = `[날씨 데이터]\n여행일이 6일 이후입니다. 해당 도시의 ${startD.getMonth()+1}월 평균 기온과 날씨(건기/우기)를 반영하여 일정을 짜주세요.`;
            }

            aiData.mustDo = document.getElementById('ai-input-must-do')?.value.trim();
            const destText = aiData.destinations.map(d => `${d.country} ${d.city} (${d.stayDays}일, 옵션: ${d.pin})`).join(', ');
            const themeText = aiData.themes.join(', ');
            const styleText = aiMode === 'standard' ? aiData.styles.join(', ') : `내 스타일(${aiData.myStyles.join(',')}), 동행(${aiData.ptStyles.join(',')})`;

            const prompt = `
            너는 세계 최고의 맞춤형 여행 플래너 AI야. 사용자의 입력 데이터를 바탕으로 실존하는 장소로 구성된 완벽한 여행 일정을 JSON 형식으로 짜줘.
            
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
            {
              "dailyPlans": [
                {
                  "day": 1,
                  "city": "도시 이름",
                  "hp": 80,
                  "weather": {
                    "mIcon": "sunny", 
                    "temp": "28°C",
                    "text": "맑음 (실제 날씨)" 
                  },
                  "spots": [
                    {
                      "time": "10:00",
                      "type": "tour",
                      "catName": "관광",
                      "mIcon": "photo_camera",
                      "name": "실존 장소 이름",
                      "lat": 35.6895, 
                      "lng": 139.6917, 
                      "desc": "장소 설명 및 이동 수단",
                      "tip": "꿀팁"
                    }
                  ]
                }
              ]
            }
            
            조건:
            1. 반드시 JSON 형식으로만 응답.
            2. [특별 요청] 반영 최우선.
            3. 각 장소 실제 위도(lat), 경도(lng) 필수.
            4. 날씨 데이터(weather) 항목 필수: mIcon은 날씨에 맞는 Material Symbol(sunny, rainy, cloudy, ac_unit 등) 영문명 작성. text 항목에 실제 날씨인지 평균 날씨인지 표기할 것.
            5. 비가 오거나 우기인 경우 실내 스팟(쇼핑몰, 미술관 등)을 적극 배치할 것.
            `;

            let data = null;
            let maxRetries = 2; 
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
                        if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
                            attempt++;
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            continue;
                        }
                        throw new Error(err.error?.message || "API 연결 실패");
                    }
                    
                    data = await response.json();
                    break; 

                } catch (err) {
                    if (attempt < maxRetries) {
                        attempt++;
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        continue;
                    }
                    throw err; 
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
            showCustomAlert({ icon: 'error', title: '일시적인 연결 지연', desc: '현재 이용자가 많아 AI가 일정을 짜는데 실패했어요.\n잠시 후 다시 버튼을 눌러주세요!', confirmText: '확인' });
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

    let placesService = null; 

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
                
                let initialImg = `https://images.unsplash.com/photo-${fallbackImages[slot.type] ? fallbackImages[slot.type][Math.floor(Math.random() * fallbackImages[slot.type].length)] : fallbackImages.tour[0]}?q=80&w=400&auto=format&fit=crop`;
                let uniqueImgId = `spot-img-${dayPlan.day}-${sIndex}`;

                daySpots.push({ 
                    time: slot.time, type: slot.type, catName: slot.catName, mIcon: slot.mIcon, 
                    name: slot.name, lat: slot.lat, lng: slot.lng,
                    desc: slot.desc, img: initialImg, imgId: uniqueImgId, color: iconColor, bg: iconBg, tip: survivalTip 
                });
                
                setTimeout(() => {
                    if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
                    const request = { query: `${mainDest} ${slot.name}`, fields: ['photos', 'place_id'] };
                    
                    placesService.findPlaceFromQuery(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                            const targetSpot = dailyPlans[dayPlan.day].spots[sIndex];
                            
                            // 🌟 리뷰 연동을 위한 Place ID 필수 저장!
                            targetSpot.place_id = results[0].place_id; 
                            
                            if(results[0].photos) {
                                const realPhotoUrl = results[0].photos[0].getUrl({ maxWidth: 400 });
                                targetSpot.img = realPhotoUrl;
                                const imgEl = document.getElementById(uniqueImgId);
                                if(imgEl) imgEl.style.backgroundImage = `url('${realPhotoUrl}')`;
                            }
                        }
                    });
                }, (pIndex * 5 + sIndex) * 300); 

            }); 
            
            // 🌟 날씨 데이터를 일별 계획에 저장!
            const defaultWeather = { mIcon: 'sunny', temp: '알 수 없음', text: '기본 날씨 (평균)' };
            dailyPlans[dayPlan.day] = { hp: dayPlan.hp, weather: dayPlan.weather || defaultWeather, spots: daySpots };
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
        
        // 🌟 날씨 아이콘에 따라 예쁜 색상 매칭
        let weatherColor = '#F59E0B'; // 기본 맑음(노란색)
        if(plan.weather.mIcon === 'rainy' || plan.weather.mIcon === 'water_drop') weatherColor = '#3B82F6';
        if(plan.weather.mIcon === 'cloudy' || plan.weather.mIcon === 'partly_cloudy') weatherColor = '#94A3B8';
        if(plan.weather.mIcon === 'ac_unit' || plan.weather.mIcon === 'snowing') weatherColor = '#06B6D4';

        let timelineHtml = `
            <div style="display:flex; align-items:center; gap:16px; background:var(--card-bg); padding:16px 20px; border-radius:16px; border:1px solid var(--card-border); margin-bottom:20px; box-shadow:0 4px 12px var(--shadow-color);">
                <div style="width:46px; height:46px; border-radius:50%; background:var(--icon-bg); display:flex; justify-content:center; align-items:center;">
                    <span class="material-symbols-rounded" style="font-size:26px; color:${weatherColor};">${plan.weather.mIcon}</span>
                </div>
                <div style="flex:1;">
                    <div style="font-size:15px; font-weight:800; color:var(--text-main); margin-bottom:2px;">${plan.weather.temp} · ${plan.weather.text}</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-sub);">날씨를 완벽하게 반영한 스마트 동선입니다.</div>
                </div>
            </div>

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

        const timelineEl = document.getElementById('ai-timeline-container');
        if(timelineEl) timelineEl.scrollTo({ top: 0, behavior: 'smooth' });
        
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
    
    // 👇 자동 재생 애니메이션 전역 변수들
    let isPlayingRoute = false; 
    let routeAnimationAbort = false;
    let playedDays = {}; // 날짜별 자동 재생 여부 기록

    function initMapForResult(mainDest) {
        const resultMapEl = document.getElementById('ai-result-map');
        if(!routeMap && resultMapEl) {
            routeMap = new google.maps.Map(resultMapEl, {
                center: {lat: 37.5665, lng: 126.9780},
                zoom: 13,
                disableDefaultUI: true,
                // 🎯 잊어버리지 마세요! 패딩 400을 넣어야 시각적 중앙이 위로 확 올라갑니다.
                padding: { top: 80, bottom: 0, left: 0, right: 0 } 
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
        const resultMapWrapper = document.getElementById('ai-result-map-wrapper'); 

        if (timelineEl) timelineEl.style.display = 'flex';
        if (exploreEl) exploreEl.style.display = 'none';
        
        if (resultMapWrapper) resultMapWrapper.style.display = 'none'; 
        if (resultMapEl) resultMapEl.style.display = 'block'; 
        
        if (topIconEl) topIconEl.innerText = 'map';
        if (mapCardEl) mapCardEl.classList.remove('active');
        
        document.querySelectorAll('.explore-chip').forEach(c => c?.classList.remove('active'));
        document.querySelector('.explore-chip[data-type="timeline"]')?.classList.add('active');
    }

    const animateMovementAsync = (startPos, endPos, duration, mIconStr) => {
        return new Promise(resolve => {
            if(movingMarker) movingMarker.setMap(null);
            
            movingMarker = new google.maps.Marker({
                position: startPos, map: routeMap,
                label: { text: mIconStr, fontFamily: 'Material Symbols Rounded', color: 'white', fontSize: '14px' },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#10B981', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2, scale: 12 },
                zIndex: 999
            });
            
            const startTime = performance.now();
           const animate = (time) => {
                if(routeAnimationAbort) { movingMarker.setMap(null); return resolve(); } 
                
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                
                const lat = startPos.lat + (endPos.lat - startPos.lat) * ease;
                const lng = startPos.lng + (endPos.lng - startPos.lng) * ease;
                
                movingMarker.setPosition({lat, lng});
                
                // 🎯 [해결 & 위치 조정] 핀이 중앙보다 살짝 위에 뜨도록 -0.003 적용!
                routeMap.setCenter({lat: lat - 0.003, lng: lng}); 
                
                if(progress < 1) requestAnimationFrame(animate);
                else { movingMarker.setMap(null); resolve(); }
            };
            requestAnimationFrame(animate);
        });
    };

    const showMarkerCard = (index, daySpots, pCoords) => {
        const infoCard = document.getElementById('map-info-card');
        const spot = daySpots[index];
        if(!spot) return;
        
        const titleEl = document.getElementById('map-info-title');
        const descEl = document.getElementById('map-info-desc');
        const badgeEl = document.getElementById('map-info-badge');
        const imgEl = document.getElementById('map-info-img');

        if(titleEl) titleEl.innerText = spot.name;
        if(descEl) descEl.innerText = spot.desc;
        if(badgeEl) badgeEl.innerText = spot.catName;
        if(imgEl) imgEl.style.backgroundImage = `url('${spot.img}')`;
        
        routeMap.panTo({lat: pCoords[index].lat - 0.003, lng: pCoords[index].lng});
        
        if (infoCard) infoCard.classList.add('active');
        currentMarkerIndex = index;
    };

    const playRouteAnimation = async () => {
        if(isPlayingRoute) { routeAnimationAbort = true; return; } 
        
        isPlayingRoute = true; routeAnimationAbort = false;
        const playBtn = document.getElementById('btn-play-route');
        const topBackBtn = document.getElementById('btn-toggle-map-top');
        const exploreChips = document.querySelector('.explore-chips-container');
        
        if (playBtn) { playBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 28px;">stop</span>'; playBtn.style.background = '#DC2626'; }
        if (topBackBtn) { topBackBtn.style.pointerEvents = 'none'; topBackBtn.style.opacity = '0.3'; }
        if (exploreChips) { exploreChips.style.pointerEvents = 'none'; exploreChips.style.opacity = '0.3'; }
        
        const infoCard = document.getElementById('map-info-card');
        if (infoCard) infoCard.classList.remove('active');

        const daySpots = dailyPlans[currentSelectedDay]?.spots || [];
        const pCoords = daySpots.map(s => ({lat: parseFloat(s.lat), lng: parseFloat(s.lng)}));
        
        const isWalk = aiData.transports.includes('도보') && aiData.transports.length === 1;
        const mIconStr = isWalk ? 'directions_walk' : 'directions_car'; 

        if (pCoords.length > 0) {
            routeMap.setZoom(16);
            routeMap.panTo(pCoords[0]);
            await new Promise(r => setTimeout(r, 800));

            for(let i = 0; i < pCoords.length; i++) {
                if(routeAnimationAbort) break;
                
                if(i > 0) {
                    if (infoCard) infoCard.classList.remove('active');
                    let calcDuration = 1500; 
                    if (window.google && google.maps.geometry) {
                        const dist = google.maps.geometry.spherical.computeDistanceBetween(
                            new google.maps.LatLng(pCoords[i-1].lat, pCoords[i-1].lng),
                            new google.maps.LatLng(pCoords[i].lat, pCoords[i].lng)
                        );
                        calcDuration = (dist / 1000) * 1000; 
                        calcDuration = Math.max(1200, Math.min(calcDuration, 3500)); 
                    }
                    await animateMovementAsync(pCoords[i-1], pCoords[i], calcDuration, mIconStr);
                }
                if(routeAnimationAbort) break;

                showMarkerCard(i, daySpots, pCoords);
                await new Promise(r => setTimeout(r, 3000)); 
            }
        }

        isPlayingRoute = false; routeAnimationAbort = false;
        if (playBtn) { playBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 28px;">play_arrow</span>'; playBtn.style.background = '#2563EB'; }
        if (topBackBtn) { topBackBtn.style.pointerEvents = 'auto'; topBackBtn.style.opacity = '1'; }
        if (exploreChips) { exploreChips.style.pointerEvents = 'auto'; exploreChips.style.opacity = '1'; }
        
        // 🎯 애니메이션 종료 시 팝업 닫고 지도 축소 (전체 루트 보이게!)
        if (infoCard) infoCard.classList.remove('active');
        // [✨ 수정 후]
        if (pCoords.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            pCoords.forEach(p => bounds.extend(p));
            // 👇 맵 자체 패딩이 있으니 여기선 살짝 여백(50)만 줍니다! (우주 줌아웃 방지)
            routeMap.fitBounds(bounds, 50);
        }
    };

    const drawRoute = (lat, lng, daySpots) => {
        if(pathPolyline) pathPolyline.setMap(null);
        routeMarkers.forEach(m => m.setMap(null)); routeMarkers = [];
        currentMarkerIndex = -1;
        const infoCard = document.getElementById('map-info-card');
        if(infoCard) infoCard.classList.remove('active');
        
        if(isPlayingRoute) { routeAnimationAbort = true; }

        if(!daySpots) daySpots = dailyPlans[currentSelectedDay]?.spots || [];
        const pathCoordinates = daySpots.map(s => ({ lat: parseFloat(s.lat), lng: parseFloat(s.lng) })).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
        
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
                if(isPlayingRoute) return; 
                showMarkerCard(index, daySpots, pathCoordinates);
            });
        });
        
        // [✨ 수정 후]
        if(pathCoordinates.length > 0) {
            // 👇 여기도 마찬가지로 50만 줍니다!
            routeMap.fitBounds(bounds, 50);
            if(!playedDays[currentSelectedDay]) {
                playedDays[currentSelectedDay] = true;
                setTimeout(() => playRouteAnimation(), 600);
            }
        }
    };
    
    document.getElementById('btn-play-route')?.addEventListener('click', playRouteAnimation);

    // 🎯 드디어 X 버튼 활성화!
    document.getElementById('btn-close-map-info')?.addEventListener('click', () => {
        document.getElementById('map-info-card').classList.remove('active');
    });
    
    // 플레이 버튼에 이벤트 달아주기!
    document.getElementById('btn-play-route')?.addEventListener('click', playRouteAnimation);

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
        
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active')); 
        chip.classList.add('active');
        
        const type = chip.getAttribute('data-type');
        
        // 🌟 여기서 딱 한 번만 선언합니다! (중복 에러 해결)
        const timelineContainer = document.getElementById('ai-timeline-container');
        const exploreContainer = document.getElementById('ai-explore-container');
        const resultMapWrapper = document.getElementById('ai-result-map-wrapper');
        
        // 🎯 탭(카테고리) 변경 시 화면 스크롤 맨 위로 부드럽게 쫙! 올려주기
        if(timelineContainer) timelineContainer.scrollTo({ top: 0, behavior: 'smooth' });
        if(exploreContainer) exploreContainer.scrollTo({ top: 0, behavior: 'smooth' });

        if(isMapView) { 
            isMapView = false; 
            document.getElementById('top-map-icon').innerText = 'map'; 
            document.getElementById('map-info-card').classList.remove('active'); 
        }

        if(type === 'timeline') {
            timelineContainer.style.display = 'flex'; exploreContainer.style.display = 'none'; 
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; 
        } else {
            timelineContainer.style.display = 'none'; 
            if(resultMapWrapper) resultMapWrapper.style.display = 'none'; 
            exploreContainer.style.display = 'flex';
            
            // 👇 토스/에어비앤비 스타일의 세련된 스켈레톤(뼈대) 로딩 애니메이션
            exploreContainer.innerHTML = `
                <style>@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }</style>
                <div style="display:flex; flex-direction:column; gap:16px; width:100%; padding: 0 4px;">
                    ${Array(4).fill(0).map(() => `
                        <div style="background: white; border-radius: 16px; padding: 12px; display:flex; gap:16px; border: 1px solid var(--card-border);">
                            <div style="width: 80px; height: 80px; border-radius: 12px; background: #E2E8F0; animation: pulse 1.5s infinite;"></div>
                            <div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:12px;">
                                <div style="width: 70%; height: 16px; background: #E2E8F0; border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                                <div style="width: 40%; height: 12px; background: #E2E8F0; border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;

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
    });

    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { 
        showCustomAlert({ icon: 'warning', title: '저장하지 않고 나가기', desc: '작성된 일정이 모두 사라집니다. 정말로 돌아가시겠습니까?', showCancel: true, confirmText: '네, 나갈래요', isDanger: true, onConfirm: () => { document.getElementById('ai-result-screen').classList.remove('active'); } });
    });

// 🛡️ 숙소 입력란 자동완성 강제 선택 방어막
    const accomInput = document.getElementById('ai-input-accom');
    if (accomInput && window.google && window.google.maps && window.google.maps.places) {
        let isAccomVerified = false;

        const accomAutocomplete = new google.maps.places.Autocomplete(accomInput, {
            types: ['establishment', 'geocode']
        });

        accomAutocomplete.addListener('place_changed', () => {
            const place = accomAutocomplete.getPlace();
            if (place && place.name) {
                accomInput.value = place.name;
                aiData.accom = place.name;
                isAccomVerified = true;
                validateAiStep();
            }
        });

        accomInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (accomInput.value.trim() !== '' && !isAccomVerified) {
                    showCustomAlert({
                        icon: 'warning', 
                        title: '숙소 선택 확인', 
                        desc: '정확한 동선 계산을 위해 자동완성 목록에서 숙소를 선택하거나 [지도에서 찾기]를 이용해주세요!'
                    });
                    accomInput.value = '';
                    aiData.accom = '';
                }
            }, 200);
        });

        accomInput.addEventListener('input', () => {
            isAccomVerified = false;
            aiData.accom = accomInput.value.trim();
        });
    }

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

    // 🌟 지도 팝업 텍스트 클릭 시 구글 장소 상세(리뷰) 불러오기
    document.getElementById('map-info-texts-wrap')?.addEventListener('click', () => {
        const spot = dailyPlans[currentSelectedDay]?.spots[currentMarkerIndex];
        if(!spot) return;

        if(!spot.place_id) {
            showCustomAlert({icon:'info', title:'안내', desc:'이 장소는 상세 리뷰가 제공되지 않습니다.'});
            return;
        }

        document.getElementById('calendar-overlay').style.display = 'block';
        document.getElementById('calendar-overlay').style.zIndex = 999;
        document.getElementById('place-detail-modal').classList.add('active');
        document.getElementById('detail-modal-content').innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-sub);">리뷰를 불러오는 중입니다...</div>';

        if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
        
        // 리뷰, 평점, 구글맵 링크 가져오기
        placesService.getDetails({ placeId: spot.place_id, fields: ['name', 'rating', 'reviews', 'url'] }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let html = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-size:20px; font-weight:800; color:var(--text-main);">${place.name}</h3>
                        <span style="background:#FEF08A; color:#D97706; padding:6px 10px; border-radius:8px; font-weight:800; font-size:14px;">⭐ ${place.rating || '평점없음'}</span>
                    </div>`;
                    
                if(place.reviews && place.reviews.length > 0) {
                    place.reviews.slice(0, 3).forEach(rev => { // 상위 3개 리뷰만
                        html += `
                        <div style="background:var(--icon-bg); padding:16px; border-radius:16px; margin-bottom:12px;">
                            <div style="font-size:13px; font-weight:700; margin-bottom:8px; color:var(--text-sub); display:flex; align-items:center; gap:6px;">
                                <span class="material-symbols-rounded" style="font-size:16px;">account_circle</span> ${rev.author_name}
                            </div>
                            <div style="font-size:14px; color:var(--text-main); line-height:1.5;">"${rev.text}"</div>
                        </div>`;
                    });
                } else {
                    html += `<p style="font-size:14px; color:var(--text-sub); text-align:center; padding:20px;">등록된 한글 리뷰가 없습니다.</p>`;
                }
                
                html += `<button class="search-btn ripple-btn" style="margin-top:16px; display:flex; align-items:center; justify-content:center; gap:8px;" onclick="window.open('${place.url}', '_blank')"><span class="material-symbols-rounded">map</span>구글 맵에서 크게 보기</button>`;
                
                document.getElementById('detail-modal-content').innerHTML = html;
            } else {
                document.getElementById('detail-modal-content').innerHTML = '<div style="text-align:center; padding: 20px;">리뷰 정보를 불러오지 못했습니다.</div>';
            }
        });
    });

}); // 