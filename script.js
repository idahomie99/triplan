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
    const totalAiSteps = 10; const aiProgressBar = document.getElementById('ai-progress-bar'); 
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
            
            const html = `
                <div class="dest-item" data-index="${index}" style="animation: fadeIn 0.3s ease-out;">
                    <div class="dest-num" style="${isMulti ? 'display:flex;' : 'display:none;'}">${index + 1}</div>
                    <div class="dest-inputs">
                        <button class="country-select-btn ripple-btn"><span style="color:${countryColor};">${countryStr}</span><span class="material-symbols-rounded">expand_more</span></button>
                        <input type="text" class="city-input" placeholder="도시 / 랜드마크 자유 입력" value="${dest.city}">
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

    const initMap = () => {
        if(!map) { 
            // Leaflet 대신 구글 맵 객체 생성
            map = new google.maps.Map(document.getElementById('map-container'), {
                center: {lat: 37.5665, lng: 126.9780},
                zoom: 13,
                disableDefaultUI: true // 모바일 친화적인 깔끔한 UI
            });
            geocoder = new google.maps.Geocoder();
            
            map.addListener('click', (e) => { 
                if(marker) marker.setMap(null); 
                marker = new google.maps.Marker({ position: e.latLng, map: map }); 
                
                // 구글 Geocoding API를 이용해 주소 변환
                geocoder.geocode({ location: e.latLng }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const placeName = results[0].formatted_address;
                        document.getElementById('map-selected-address').innerText = placeName; 
                        document.getElementById('ai-input-accom').value = placeName;
                    }
                }); 
            }); 
        }
        // 구글 맵 모달에서 띄울 때 사이즈 깨짐 방지
        setTimeout(() => google.maps.event.trigger(map, 'resize'), 100);
    };

    document.getElementById('btn-open-map')?.addEventListener('click', () => { calendarOverlay.style.display = 'block'; document.getElementById('map-modal').classList.add('active'); setTimeout(() => initMap(), 300); });
    const closeMap = () => { document.getElementById('map-modal').classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); }; 
    document.getElementById('btn-close-map')?.addEventListener('click', closeMap); document.getElementById('btn-confirm-map')?.addEventListener('click', closeMap);

    const resetAiFlow = () => { 
        currentAiStep = 1; aiStepHistory = [1]; aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`; btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true; btnPrevAiStep.style.display = 'none';
        for(let i=1; i<=totalAiSteps; i++) { const stepEl = document.getElementById(`ai-step-${i}`); if(stepEl) { stepEl.classList.remove('exit'); stepEl.className = i===1 ? 'ai-step active' : 'ai-step'; } }
        aiData = { startDate: null, endDate: null, totalTripDays: 0, destinations: [{ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }], isOptimizeRoute: false, transports: [], arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [], myStyles: [], ptStyles: [], themes: [], stamina: 3 }; 
        tempStartDate = null; tempEndDate = null; updateDateTexts(); renderDestinations(); 
        document.getElementById('ai-input-arr-time').value = ''; document.getElementById('ai-input-dep-time').value = ''; document.getElementById('ai-input-accom').value = ''; document.getElementById('people-count').innerText = '1명'; 
        document.getElementById('ai-input-stamina').value = 3; document.getElementById('stamina-emoji').innerHTML = '<span class="material-symbols-rounded" style="font-size: 48px; color: #10B981; transition: color 0.3s ease;">battery_5_bar</span>';
        document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('selected')); 
        if(aiMode === 'standard') { document.getElementById('step-7-standard').style.display = 'block'; document.getElementById('step-7-tension').style.display = 'none'; } else { document.getElementById('step-7-standard').style.display = 'none'; document.getElementById('step-7-tension').style.display = 'block'; }
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
        try {
            document.getElementById('ai-loading-overlay').classList.add('active');

            const destText = aiData.destinations.map(d => `${d.country} ${d.city} (${d.stayDays}일, 옵션: ${d.pin})`).join(', ');
            const themeText = aiData.themes.join(', ');
            const styleText = aiMode === 'standard' ? aiData.styles.join(', ') : `내 스타일(${aiData.myStyles.join(',')}), 동행(${aiData.ptStyles.join(',')})`;

            const prompt = `
            너는 세계 최고의 맞춤형 여행 플래너 AI야. 사용자의 입력 데이터를 바탕으로 실존하는 장소, 식당, 카페로 구성된 완벽한 여행 일정을 JSON 형식으로 짜줘.
            
            [사용자 정보]
            - 여행지: ${destText}
            - 전체 여행: ${aiData.totalTripDays}일 (${fm(aiData.startDate)} ~ ${fm(aiData.endDate)})
            - 교통수단: ${aiData.transports.join(', ') || '대중교통, 도보'}
            - 동행: ${aiData.companion} (${aiData.people}명, 연령대: ${aiData.ages.join(', ')})
            - 테마: ${themeText}
            - 스타일: ${styleText}
            - 체력(1~5): ${aiData.stamina} (체력에 맞춰 하루 일정 개수 조절)
            
            [응답 JSON 구조 - 반드시 이 구조를 지킬 것]
            {
              "dailyPlans": [
                {
                  "day": 1,
                  "city": "도시 이름",
                  "hp": 80, // 예상 체력 소모량
                  "spots": [
                    {
                      "time": "10:00",
                      "type": "tour", // food, tour, cafe, indoor 중 택 1
                      "catName": "관광", // 식사, 관광, 휴식, 실내 중 택 1
                      "mIcon": "photo_camera", // restaurant, photo_camera, local_cafe, storefront
                      "name": "진짜 존재하는 명소/식당 이름",
                      "desc": "장소에 대한 설명과 연령대/테마에 맞춘 추천 이유 (1~2문장)",
                      "tip": "웨이팅, 포토존 등 진짜 꿀팁"
                    }
                  ]
                }
              ]
            }
            
            조건:
            1. 반드시 JSON 형식으로만 응답해라.
            2. 무조건 구글 맵에 검색되는 실존하는 진짜 장소로 구성해라.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "API 연결 실패");
            }

            const data = await response.json();
            let aiResponseText = data.candidates[0].content.parts[0].text;
            
            aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(aiResponseText);

            document.getElementById('ai-loading-overlay').classList.remove('active');
            renderAiTimeline(parsedData); 
            aiScreen.classList.remove('active');

        } catch(e) {
            console.error("AI 생성 중 에러:", e);
            document.getElementById('ai-loading-overlay').classList.remove('active');
            
            showCustomAlert({
                icon: 'warning', title: 'API 연결 오류', 
                desc: '구글 클라우드에서 API 키가 아직 활성화되지 않았습니다!\n임시 데이터로 화면을 띄워드립니다.',
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
        aiResponse.dailyPlans.forEach(dayPlan => {
            let daySpots = [];
            dayPlan.spots.forEach(slot => {
                let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9';
                if(slot.type === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; }
                if(slot.type === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; }
                if(slot.type === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; }
                if(slot.type === 'indoor') { iconColor = '#10B981'; iconBg = 'rgba(16,185,129,0.1)'; }

                let survivalTip = slot.tip ? `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">lightbulb</span><span class="tip-text">${slot.tip}</span></div>` : '';
                const randomImg = `https://images.unsplash.com/photo-${fallbackImages[slot.type] ? fallbackImages[slot.type][Math.floor(Math.random() * fallbackImages[slot.type].length)] : fallbackImages.tour[0]}`;

                daySpots.push({ time: slot.time, type: slot.type, catName: slot.catName, mIcon: slot.mIcon, name: slot.name, desc: slot.desc, img: randomImg, color: iconColor, bg: iconBg, tip: survivalTip });
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

    function generateMockTimeline() {
        const dests = aiData.destinations.map(d => d.city).filter(c => c !== '');
        const mainDest = dests[0] || '미지의 여행지';
        const totalDays = aiData.totalTripDays > 0 ? aiData.totalTripDays : 1; 
        
        let dummyResponse = { dailyPlans: [] };
        for(let d=1; d<=totalDays; d++) {
            dummyResponse.dailyPlans.push({
                day: d, city: mainDest, hp: 65,
                spots: [
                    { time: '10:00', type: 'tour', catName: '관광', mIcon: 'photo_camera', name: `${mainDest} 최고의 명소`, desc: '현지인도 추천하는 완벽한 장소입니다.', tip: '아침 일찍 가야 사진 찍기 좋습니다.' },
                    { time: '13:00', type: 'food', catName: '식사', mIcon: 'restaurant', name: `줄 서서 먹는 로컬 식당`, desc: '맛있고 든든한 한 끼를 즐기세요.', tip: '' },
                    { time: '15:30', type: 'cafe', catName: '휴식', mIcon: 'local_cafe', name: `분위기 좋은 감성 카페`, desc: '잠시 다리를 쉬어가며 힐링하세요.', tip: '' }
                ]
            });
        }
        renderAiTimeline(dummyResponse);
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
            let imgHtml = spot.img ? `<div class="tc-img" style="background-image: url('${spot.img}?q=80&w=400&auto=format&fit=crop');"></div>` : '';

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
        
        document.getElementById('btn-plan-a')?.addEventListener('click', () => { if(isPlanB) renderDayPlan(day, false); });
        document.getElementById('btn-plan-b')?.addEventListener('click', () => { 
            if(!isPlanB) { 
                showCustomAlert({icon:'umbrella', title:'우천 시 동선 변경', desc:'비가 오네요! 미술관과 쇼핑몰 등 실내 일정 위주로 동선을 안전하게 재구성했습니다.', onConfirm: () => {
                    renderDayPlan(day, true); 
                }});
            }
        });
        
        if(isMapView && routeMap) { drawRoute(routeMap.getCenter().lat, routeMap.getCenter().lng, plan.spots); }
    };

    // 🚀 구글 맵 (Google Maps) 라우팅 변수
    let routeMap = null; let pathPolyline = null; let routeMarkers = []; let movingMarker = null;

    function initMapForResult(mainDest) {
        if(!routeMap) {
            routeMap = new google.maps.Map(document.getElementById('ai-result-map'), {
                center: {lat: 37.5665, lng: 126.9780},
                zoom: 13,
                disableDefaultUI: true
            });
        }

        if(mainDest !== '미지의 여행지') {
            const tempGeocoder = new google.maps.Geocoder();
            tempGeocoder.geocode({address: mainDest}, (results, status) => {
                if(status === 'OK') {
                    routeMap.setCenter(results[0].geometry.location);
                }
            });
        }

        isMapView = false; currentMarkerIndex = -1;
        document.getElementById('ai-timeline-container').style.display = 'flex';
        document.getElementById('ai-explore-container').style.display = 'none';
        document.getElementById('ai-result-map').style.display = 'none';
        document.getElementById('top-map-icon').innerText = 'map';
        document.getElementById('map-info-card').classList.remove('active');
        
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active'));
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

        // 임시 좌표 오프셋 (Gemini가 진짜 위경도 좌표를 안 주므로 현재 맵 센터 기준 흩뿌림)
        const pointOffsets = [ [0.005, -0.005], [0.015, 0.002], [-0.002, 0.015], [-0.010, -0.008], [-0.015, 0.005], [0.01, -0.015] ];
        
        let centerLatLng = routeMap.getCenter();
        let clat = centerLatLng.lat(); let clng = centerLatLng.lng();
        
        const pathCoordinates = daySpots.map((_, i) => ({
            lat: clat + pointOffsets[i%6][0], lng: clng + pointOffsets[i%6][1]
        }));
        
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
        const resultMap = document.getElementById('ai-result-map');
        const mapIcon = document.getElementById('top-map-icon');

        if(isMapView) {
            timelineContainer.style.display = 'none'; exploreContainer.style.display = 'none';
            resultMap.style.display = 'block'; mapIcon.innerText = 'format_list_bulleted'; 
            if(routeMap) {
                setTimeout(() => google.maps.event.trigger(routeMap, 'resize'), 100);
                drawRoute(routeMap.getCenter().lat(), routeMap.getCenter().lng(), dailyPlans[currentSelectedDay].spots);
            }
        } else {
            const activeTab = document.querySelector('.explore-chip.active')?.getAttribute('data-type') || 'timeline';
            if(activeTab === 'timeline') timelineContainer.style.display = 'flex'; else exploreContainer.style.display = 'flex';
            resultMap.style.display = 'none'; mapIcon.innerText = 'map'; 
            document.getElementById('map-info-card').classList.remove('active');
        }
    });

    document.querySelector('.explore-chips-container').addEventListener('click', (e) => {
        const chip = e.target.closest('.explore-chip');
        if(!chip) return;
        
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active');
        
        const type = chip.getAttribute('data-type');
        const timelineContainer = document.getElementById('ai-timeline-container');
        const exploreContainer = document.getElementById('ai-explore-container');
        const resultMap = document.getElementById('ai-result-map');
        
        if(isMapView) { isMapView = false; document.getElementById('top-map-icon').innerText = 'map'; document.getElementById('map-info-card').classList.remove('active'); }

        if(type === 'timeline') {
            timelineContainer.style.display = 'flex'; exploreContainer.style.display = 'none'; resultMap.style.display = 'none';
        } else {
            timelineContainer.style.display = 'none'; resultMap.style.display = 'none'; exploreContainer.style.display = 'flex';
            
            let html = '';
            for(let i=0; i<5; i++) {
                const randomImg = `https://images.unsplash.com/photo-${fallbackImages[type][Math.floor(Math.random() * fallbackImages[type].length)]}`;
                html += `
                <div class="explore-card">
                    <div class="explore-card-img" style="background-image: url('${randomImg}?q=80&w=200&auto=format&fit=crop');"></div>
                    <div class="explore-card-info">
                        <div class="explore-card-title">AI 현지 추천 장소 ${i+1}</div>
                        <div class="explore-card-sub">별점 4.${8-i} · 리뷰 기반 추천</div>
                        <button class="explore-add-btn ripple-btn" onclick="document.getElementById('custom-alert-overlay').classList.add('active'); document.getElementById('custom-alert-modal').classList.add('active'); document.getElementById('alert-icon').innerHTML='<span class=\\'material-symbols-rounded\\' style=\\'color:#10B981;\\'>check_circle</span>'; document.getElementById('alert-title').innerText='추가 완료'; document.getElementById('alert-desc').innerText='내 일정에 성공적으로 추가되었습니다! 😆'; document.getElementById('btn-alert-cancel').style.display='none'; document.getElementById('btn-alert-confirm').innerText='확인했어요'; document.getElementById('btn-alert-confirm').classList.remove('danger');">+ 내 일정에 추가/교체</button>
                    </div>
                </div>`;
            }
            exploreContainer.innerHTML = html;
        }
    });

    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { 
        showCustomAlert({ icon: 'warning', title: '저장하지 않고 나가기', desc: '작성된 일정이 모두 사라집니다. 정말로 돌아가시겠습니까?', showCancel: true, confirmText: '네, 나갈래요', isDanger: true, onConfirm: () => { document.getElementById('ai-result-screen').classList.remove('active'); } });
    });

    const navHome = document.getElementById('nav-home'); 
    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
});