import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. 스플래시 화면 제어
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) { setTimeout(() => { splashScreen.classList.add('hide'); setTimeout(() => splashScreen.remove(), 500); }, 1500); }

    // 1. 공통 로직
    const currentMonth = new Date().getMonth() + 1;
    const monthTitle = document.getElementById('month-title');
    if (monthTitle) monthTitle.innerText = `${currentMonth}월에 떠나기 좋은 곳`;

    const mainContent = document.getElementById('main-content');
    const topHeader = document.getElementById('top-header');
    mainContent.addEventListener('scroll', () => { topHeader.classList.toggle('scrolled', mainContent.scrollTop > 10); });

    const bindRipple = () => {
        const rippleBtns = document.querySelectorAll('.ripple-btn, .small-ripple-btn');
        rippleBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                const ripple = document.createElement('span'); ripple.classList.add('ripple');
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`; ripple.style.left = `${x - size / 2}px`; ripple.style.top = `${y - size / 2}px`;
                ripple.style.animation = this.classList.contains('small-ripple-btn') ? 'ripple-anim-small 0.4s ease-out forwards' : 'ripple-anim-large 0.6s ease-out forwards';
                this.appendChild(ripple); setTimeout(() => ripple.remove(), 600);
            });
        });
    };
    bindRipple();

    // 🚀 2. 구글 로그인 및 마이페이지 연동 로직
    const btnAccount = document.getElementById('nav-account');
    const btnTopProfile = document.getElementById('btn-top-profile'); // 우측 상단 프로필
    const profilePic = document.querySelector('.profile-pic');
    const greeting = document.querySelector('.greeting');
    
    // 마이페이지 요소들
    const accountScreen = document.getElementById('account-screen');
    const btnBackAccount = document.getElementById('btn-back-account');
    const accountName = document.getElementById('account-name');
    const accountEmail = document.getElementById('account-email');
    const accountProfilePic = document.getElementById('account-profile-pic');
    const btnLogout = document.getElementById('btn-logout');

    const defaultProfileSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394A3B8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`;

    // 실시간 로그인 상태 감지
    onAuthStateChanged(auth, (user) => {
        if (user) { 
            greeting.innerText = `${user.displayName}님,\n어디로 떠나시나요?`; 
            profilePic.style.backgroundImage = `url('${user.photoURL}')`; 
            
            // 마이페이지 정보 업데이트
            accountName.innerText = user.displayName;
            accountEmail.innerText = user.email;
            accountProfilePic.style.backgroundImage = `url('${user.photoURL}')`;
        } else { 
            greeting.innerText = `어디로 떠나시나요?`; 
            profilePic.style.backgroundImage = defaultProfileSvg; 
            
            // 마이페이지 정보 초기화
            accountName.innerText = '로그인이 필요합니다';
            accountEmail.innerText = '이메일 정보 없음';
            accountProfilePic.style.backgroundImage = defaultProfileSvg;
            
            // 로그아웃 상태면 화면 닫기
            accountScreen.classList.remove('active');
        }
    });

    // 로그인 안 되어 있으면 구글 팝업 띄우고, 되어 있으면 마이페이지 엶
    const handleLoginOrMyPage = () => {
        if (auth.currentUser) { 
            accountScreen.classList.add('active'); // 마이페이지 열기
        } else { 
            signInWithPopup(auth, provider).catch(err => alert("로그인 에러 발생")); 
        }
    };
    
    if(btnTopProfile) btnTopProfile.addEventListener('click', handleLoginOrMyPage);
    if(btnAccount) btnAccount.addEventListener('click', handleLoginOrMyPage);
    if(btnBackAccount) btnBackAccount.addEventListener('click', () => accountScreen.classList.remove('active'));

    // 로그아웃 버튼 (마이페이지 안)
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("정말 로그아웃 하시겠습니까?")) {
                signOut(auth).then(() => {
                    alert("성공적으로 로그아웃 되었습니다.");
                });
            }
        });
    }

    // 3. 서브 화면 토글 (항공권, 숙소)
    const btnFlight = document.getElementById('btn-flight');
    const flightScreen = document.getElementById('flight-screen');
    const btnBackFlight = document.getElementById('btn-back-flight');
    if (btnFlight) btnFlight.addEventListener('click', () => flightScreen.classList.add('active'));
    if (btnBackFlight) btnBackFlight.addEventListener('click', () => flightScreen.classList.remove('active'));

    const btnHotel = document.getElementById('btn-hotel');
    const hotelScreen = document.getElementById('hotel-screen');
    const btnBackHotel = document.getElementById('btn-back-hotel');
    if (btnHotel) btnHotel.addEventListener('click', () => hotelScreen.classList.add('active'));
    if (btnBackHotel) btnBackHotel.addEventListener('click', () => hotelScreen.classList.remove('active'));

    // 4. 달력 공용 로직
    const radioRound = document.getElementById('round-trip');
    const radioOneWay = document.getElementById('one-way');
    const tripTypeLabel = document.getElementById('trip-type-label');
    
    let flightIsRoundTrip = true; let flightStartDate = null; let flightEndDate = null;
    let hotelStartDate = null; let hotelEndDate = null;
    let aiStartDate = null; let aiEndDate = null;
    let calendarTarget = 'flight'; let tempStartDate = null; let tempEndDate = null;

    if (radioRound) radioRound.addEventListener('change', () => { flightIsRoundTrip = true; tripTypeLabel.innerText='왕복'; flightEndDate=null; updateDateTexts(); });
    if (radioOneWay) radioOneWay.addEventListener('change', () => { flightIsRoundTrip = false; tripTypeLabel.innerText='편도'; flightEndDate=null; updateDateTexts(); });

    const fm = (d) => `${d.getMonth()+1}.${d.getDate()}`;
    const updateDateTexts = () => {
        const flightText = document.getElementById('flight-date-text');
        const hotelText = document.getElementById('hotel-date-text');
        const aiText = document.getElementById('ai-date-text');
        
        if(flightText) {
            if(!flightStartDate) flightText.innerText = '날짜를 선택해주세요';
            else if(flightIsRoundTrip) flightText.innerText = flightEndDate ? `${fm(flightStartDate)} ~ ${fm(flightEndDate)}` : `${fm(flightStartDate)} ~ 선택 중`;
            else flightText.innerText = fm(flightStartDate);
        }
        if(hotelText) {
            if(!hotelStartDate) hotelText.innerText = '날짜를 선택해주세요';
            else hotelText.innerText = hotelEndDate ? `${fm(hotelStartDate)} ~ ${fm(hotelEndDate)}` : `${fm(hotelStartDate)} ~ 선택 중`;
        }
        if(aiText) {
            if(!aiStartDate) aiText.innerText = '날짜를 선택해주세요';
            else aiText.innerText = aiEndDate ? `${fm(aiStartDate)} ~ ${fm(aiEndDate)}` : `${fm(aiStartDate)} ~ 선택 중`;
        }
        
        const labelArrDate = document.getElementById('label-arr-date');
        const labelDepDate = document.getElementById('label-dep-date');
        if(labelArrDate) { labelArrDate.innerText = aiStartDate ? `(${aiStartDate.getMonth()+1}/${aiStartDate.getDate()})` : ''; }
        if(labelDepDate) { labelDepDate.innerText = aiEndDate ? `(${aiEndDate.getMonth()+1}/${aiEndDate.getDate()})` : ''; }

        if(typeof validateAiStep === 'function') validateAiStep();
    };

    const calendarModal = document.getElementById('calendar-modal');
    const btnCloseCalendar = document.getElementById('btn-close-calendar');
    const calendarOverlay = document.getElementById('calendar-overlay');
    const calendarContainer = document.getElementById('calendar-grid-container');
    const btnConfirmDate = document.getElementById('btn-confirm-date');

    const openCalendar = (target) => {
        calendarTarget = target;
        if(target === 'flight') { tempStartDate = flightStartDate; tempEndDate = flightEndDate; } 
        else if(target === 'hotel') { tempStartDate = hotelStartDate; tempEndDate = hotelEndDate; }
        else { tempStartDate = aiStartDate; tempEndDate = aiEndDate; }
        
        calendarOverlay.style.display = 'block'; setTimeout(() => calendarModal.classList.add('active'), 10);
        renderCalendar();
    };

    document.getElementById('btn-open-calendar-flight')?.addEventListener('click', () => openCalendar('flight'));
    document.getElementById('btn-open-calendar-hotel')?.addEventListener('click', () => openCalendar('hotel'));
    document.getElementById('btn-open-calendar-ai')?.addEventListener('click', () => openCalendar('ai'));
    
    const closeCalendar = () => { calendarModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    if (btnCloseCalendar) btnCloseCalendar.addEventListener('click', closeCalendar);
    if (calendarOverlay) calendarOverlay.addEventListener('click', closeCalendar);
    
    if (btnConfirmDate) btnConfirmDate.addEventListener('click', () => {
        const isRound = calendarTarget === 'flight' ? flightIsRoundTrip : true; 
        if (isRound && (!tempStartDate || !tempEndDate)) { alert('시작일과 종료일을 모두 선택해주세요.'); return; }
        if (!isRound && !tempStartDate) { alert('날짜를 선택해주세요.'); return; }
        
        if(calendarTarget === 'flight') { flightStartDate = tempStartDate; flightEndDate = tempEndDate; } 
        else if(calendarTarget === 'hotel') { hotelStartDate = tempStartDate; hotelEndDate = tempEndDate; }
        else { aiStartDate = tempStartDate; aiEndDate = tempEndDate; }
        updateDateTexts(); closeCalendar();
    });

    const renderCalendar = () => {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '';
        const today = new Date(); today.setHours(0,0,0,0);
        const isRound = calendarTarget === 'flight' ? flightIsRoundTrip : true;
        
        for (let i = 0; i < 3; i++) {
            const year = today.getFullYear(); const month = today.getMonth() + i;
            const drawDate = new Date(year, month, 1);
            const monthTitle = document.createElement('div'); monthTitle.className = 'month-title'; monthTitle.innerText = `${drawDate.getFullYear()}년 ${drawDate.getMonth() + 1}월`;
            calendarContainer.appendChild(monthTitle);
            
            const grid = document.createElement('div'); grid.className = 'calendar-grid';
            for(let j = 0; j < drawDate.getDay(); j++) { grid.innerHTML += `<div></div>`; }
            
            const lastDate = new Date(year, month + 1, 0).getDate();
            for(let d = 1; d <= lastDate; d++) {
                const currentDate = new Date(year, month, d);
                const cell = document.createElement('div'); cell.className = 'cal-day'; cell.innerText = d;
                
                if (currentDate < today) { cell.classList.add('disabled'); } 
                else {
                    const timeCur = currentDate.getTime();
                    const timeStart = tempStartDate ? tempStartDate.getTime() : null;
                    const timeEnd = tempEndDate ? tempEndDate.getTime() : null;
                    
                    if (timeStart === timeCur || timeEnd === timeCur) cell.classList.add('selected');
                    if (isRound && timeStart && timeEnd) {
                        if (timeCur > timeStart && timeCur < timeEnd) cell.classList.add('in-range');
                        if (timeCur === timeStart && timeStart !== timeEnd) cell.classList.add('range-start');
                        if (timeCur === timeEnd && timeStart !== timeEnd) cell.classList.add('range-end');
                    }
                    cell.addEventListener('click', () => {
                        if (!isRound) { tempStartDate = currentDate; } 
                        else {
                            if (!tempStartDate || (tempStartDate && tempEndDate)) { tempStartDate = currentDate; tempEndDate = null; }
                            else if (tempStartDate && !tempEndDate) {
                                if (currentDate >= tempStartDate) tempEndDate = currentDate; else tempStartDate = currentDate;
                            }
                        }
                        renderCalendar(); updateDateTexts();
                    });
                }
                grid.appendChild(cell);
            }
            calendarContainer.appendChild(grid);
        }
    };

    // 5. 공항 및 숙소 자동완성 (무료 데이터)
    const popularAirports = [
        { cityKo: '서울', cityAlias: '', cityEn: 'Seoul', code: 'ICN', airportKo: '인천국제공항', airportEn: 'Incheon Intl' },
        { cityKo: '서울', cityAlias: '', cityEn: 'Seoul', code: 'GMP', airportKo: '김포국제공항', airportEn: 'Gimpo Intl' },
        { cityKo: '오사카', cityAlias: '', cityEn: 'Osaka', code: 'KIX', airportKo: '간사이국제공항', airportEn: 'Kansai Intl' },
        { cityKo: '도쿄', cityAlias: '동경', cityEn: 'Tokyo', code: 'NRT', airportKo: '나리타국제공항', airportEn: 'Narita Intl' },
        { cityKo: '도쿄', cityAlias: '동경', cityEn: 'Tokyo', code: 'HND', airportKo: '하네다국제공항', airportEn: 'Haneda Intl' },
        { cityKo: '상하이', cityAlias: '상해', cityEn: 'Shanghai', code: 'PVG', airportKo: '푸둥국제공항', airportEn: 'Pudong Intl' },
        { cityKo: '방콕', cityAlias: '', cityEn: 'Bangkok', code: 'BKK', airportKo: '수완나품국제공항', airportEn: 'Suvarnabhumi' },
        { cityKo: '파리', cityAlias: '', cityEn: 'Paris', code: 'CDG', airportKo: '샤를드골국제공항', airportEn: 'Charles de Gaulle' }
    ];
    let combinedAirports = [...popularAirports];
    fetch('https://raw.githubusercontent.com/jbrooksuk/JSON-Airports/master/airports.json')
        .then(response => response.json())
        .then(data => {
            const popCodes = popularAirports.map(a => a.code);
            const globalAirports = data.filter(item => item.iata && item.iata !== "" && !popCodes.includes(item.iata)).map(item => {
                return { cityKo: item.city||item.name, cityAlias: '', cityEn: item.city||item.name, code: item.iata, airportKo: item.name, airportEn: item.name };
            });
            combinedAirports = [...popularAirports, ...globalAirports];
        }).catch(err => console.log('공항 데이터 실패', err));

    const depInput = document.getElementById('departure-input'); const destInput = document.getElementById('destination-input');
    const depAuto = document.getElementById('dep-autocomplete'); const destAuto = document.getElementById('dest-autocomplete');
    const btnSwap = document.getElementById('btn-swap-location');
    const cleanStr = (str) => str ? str.replace(/\s+/g, '').toLowerCase() : '';

    const setupAutocomplete = (inputEl, dropdownEl) => {
        if(!inputEl || !dropdownEl) return;
        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim(); const cleanVal = cleanStr(val); dropdownEl.innerHTML = ''; 
            if (!cleanVal) { dropdownEl.classList.remove('active'); return; }
            const isMatch = (str) => str && cleanStr(str).includes(cleanVal);
            const filtered = combinedAirports.filter(item => isMatch(item.cityKo) || isMatch(item.cityEn) || isMatch(item.cityAlias) || isMatch(item.airportKo) || isMatch(item.code)).slice(0, 10); 
            if (filtered.length > 0) {
                filtered.forEach(item => {
                    const div = document.createElement('div'); div.className = 'autocomplete-item';
                    const displayCity = item.cityKo || item.cityEn; const displayAirport = item.airportKo || item.airportEn;
                    div.innerHTML = `<span class="material-symbols-rounded auto-icon">flight</span><div class="auto-text"><span class="auto-city">${displayCity} <span style="color:#2563EB; margin-left:4px;">${item.code}</span></span><span class="auto-airport">${displayAirport}</span></div>`;
                    div.addEventListener('click', () => { inputEl.value = `${displayCity} (${item.code})`; dropdownEl.classList.remove('active'); });
                    dropdownEl.appendChild(div);
                }); dropdownEl.classList.add('active'); 
            } else { dropdownEl.classList.remove('active'); }
        });
        inputEl.addEventListener('blur', () => { setTimeout(() => dropdownEl.classList.remove('active'), 200); });
    };
    setupAutocomplete(depInput, depAuto); setupAutocomplete(destInput, destAuto);
    if(btnSwap) btnSwap.addEventListener('click', () => { const temp = depInput.value; depInput.value = destInput.value; destInput.value = temp; });

    // 숙소 자동완성
    const mockHotelDB = [
        { type: '도시', name: '도쿄', sub: '일본', icon: 'location_on' }, { type: '도시', name: '오사카', sub: '일본', icon: 'location_on' },
        { type: '도시', name: '파리', sub: '프랑스', icon: 'location_on' }, { type: '도시', name: '방콕', sub: '태국', icon: 'location_on' },
        { type: '호텔', name: '신주쿠 워싱턴 호텔', sub: '도쿄, 일본', icon: 'bed' }, { type: '호텔', name: '호텔 그레이서리 신주쿠', sub: '도쿄, 일본', icon: 'bed' },
        { type: '호텔', name: '게이오 플라자 호텔', sub: '도쿄, 일본', icon: 'bed' }, { type: '랜드마크', name: '에펠탑', sub: '파리, 프랑스', icon: 'attractions' },
        { type: '랜드마크', name: '도톤보리', sub: '오사카, 일본', icon: 'attractions' }
    ];
    const hotelInput = document.getElementById('hotel-dest-input'); const hotelAuto = document.getElementById('hotel-autocomplete');
    if(hotelInput && hotelAuto) {
        hotelInput.addEventListener('input', () => {
            const val = hotelInput.value.trim().toLowerCase(); hotelAuto.innerHTML = '';
            if (!val) { hotelAuto.classList.remove('active'); return; }
            const filtered = mockHotelDB.filter(item => item.name.toLowerCase().includes(val) || item.sub.toLowerCase().includes(val)).slice(0, 8);
            if (filtered.length > 0) {
                filtered.forEach(item => {
                    const div = document.createElement('div'); div.className = 'autocomplete-item';
                    let iconColor = item.type === '호텔' ? '#DC2626' : (item.type === '랜드마크' ? '#F59E0B' : '#2563EB');
                    div.innerHTML = `<span class="material-symbols-rounded auto-icon" style="color: ${iconColor}">${item.icon}</span><div class="auto-text"><span class="auto-city">${item.name} <span style="font-size:11px; font-weight:700; color:#8B5CF6; background:rgba(139,92,246,0.1); padding:2px 6px; border-radius:4px; margin-left:4px;">${item.type}</span></span><span class="auto-airport">${item.sub}</span></div>`;
                    div.addEventListener('click', () => { hotelInput.value = item.name; hotelAuto.classList.remove('active'); });
                    hotelAuto.appendChild(div);
                }); hotelAuto.classList.add('active'); 
            } else { hotelAuto.classList.remove('active'); }
        });
        hotelInput.addEventListener('blur', () => { setTimeout(() => hotelAuto.classList.remove('active'), 200); });
    }

    // 6. 숙소 인원/객실 모달
    let guestData = { adult: 2, child: 0, room: 1 };
    const btnOpenGuest = document.getElementById('btn-open-guest'); const guestModal = document.getElementById('guest-modal');
    const btnCloseGuest = document.getElementById('btn-close-guest'); const btnConfirmGuest = document.getElementById('btn-confirm-guest');
    
    const updateGuestText = () => {
        let txt = `성인 ${guestData.adult}명`; if(guestData.child > 0) txt += `, 어린이 ${guestData.child}명`; txt += ` · 객실 ${guestData.room}개`;
        document.getElementById('hotel-guest-text').innerText = txt;
        document.getElementById('adult-count').innerText = guestData.adult;
        document.getElementById('child-count').innerText = guestData.child;
        document.getElementById('room-count').innerText = guestData.room;
    };
    if(btnOpenGuest) btnOpenGuest.addEventListener('click', () => { calendarOverlay.style.display = 'block'; setTimeout(() => guestModal.classList.add('active'), 10); });
    const closeGuestModal = () => { guestModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    if(btnCloseGuest) btnCloseGuest.addEventListener('click', closeGuestModal); if(btnConfirmGuest) btnConfirmGuest.addEventListener('click', closeGuestModal);

    const setupCounter = (type, min, max) => {
        document.getElementById(`btn-minus-${type}`).addEventListener('click', () => { if(guestData[type] > min) { guestData[type]--; updateGuestText(); }});
        document.getElementById(`btn-plus-${type}`).addEventListener('click', () => { if(guestData[type] < max) { guestData[type]++; updateGuestText(); }});
    };
    setupCounter('adult', 1, 10); setupCounter('child', 0, 10); setupCounter('room', 1, 5);

    // 7. 검색 결과 화면
    const loadingOverlay = document.getElementById('loading-overlay'); const resultScreen = document.getElementById('result-screen');
    const btnBackResult = document.getElementById('btn-back-result'); const resultListContainer = document.getElementById('result-list-container');
    const dateTabsContainer = document.getElementById('date-tabs-container');
    if(btnBackResult) btnBackResult.addEventListener('click', () => resultScreen.classList.remove('active'));

    const showLoadingThenResult = (searchType) => {
        document.getElementById('loading-icon').innerText = searchType === 'flight' ? 'flight' : 'bed';
        document.getElementById('loading-text').innerText = searchType === 'flight' ? '최저가 항공권을 찾고 있어요' : '인기 숙소를 찾고 있어요';
        loadingOverlay.classList.add('active'); setTimeout(() => { loadingOverlay.classList.remove('active'); resultScreen.classList.add('active'); }, 1500);
    };

    document.getElementById('btn-search-flight')?.addEventListener('click', () => {
        const dep = depInput.value.split('(')[0].trim(); const dest = destInput.value.split('(')[0].trim();
        if(!dep || !dest) { alert('출발지와 도착지를 입력해주세요.'); return; }
        if(!flightStartDate) { alert('날짜를 선택해주세요.'); return; }
        document.getElementById('result-route-text').innerText = `${dep} ➔ ${dest}`;
        document.getElementById('result-date-text').innerText = flightIsRoundTrip && flightEndDate ? `${fm(flightStartDate)} ~ ${fm(flightEndDate)} · 성인 1명` : `${fm(flightStartDate)} · 성인 1명`;
        
        let html = '';
        for(let i=0; i<4; i++) {
            const price = Math.floor(Math.random() * 30 + 15) * 10000;
            html += `<div class="ticket-card"><div class="ticket-leg"><div class="airline-info"><div class="airline-logo" style="background:#0064DE">KE</div><span class="airline-name">대한항공</span></div><div class="flight-times"><div class="time-block"><span class="time">09:30</span><span class="code">ICN</span></div><div class="flight-duration"><span class="duration-text">2시간 15분</span><div class="duration-line"></div><span class="duration-type">직항</span></div><div class="time-block"><span class="time">11:45</span><span class="code">KIX</span></div></div></div><div class="ticket-footer"><span class="ticket-price">${price.toLocaleString()}원</span><button class="select-btn ripple-btn">선택하기</button></div></div>`;
        }
        dateTabsContainer.style.display = 'flex'; resultListContainer.innerHTML = html; bindRipple(); showLoadingThenResult('flight');
    });

    document.getElementById('btn-search-hotel')?.addEventListener('click', () => {
        const dest = document.getElementById('hotel-dest-input').value.trim();
        if(!dest) { alert('여행지나 숙소명을 입력해주세요.'); return; }
        if(!hotelStartDate || !hotelEndDate) { alert('체크인과 체크아웃 날짜를 선택해주세요.'); return; }
        document.getElementById('result-route-text').innerText = `${dest} 숙소 검색결과`; document.getElementById('result-date-text').innerText = `${fm(hotelStartDate)} ~ ${fm(hotelEndDate)} · 성인 ${guestData.adult}명`;
        
        let html = '';
        for(let i=0; i<3; i++) {
            const price = Math.floor(Math.random() * 15 + 10) * 10000;
            html += `<div class="hotel-card"><div class="hotel-img" style="background-image: url('https://images.unsplash.com/photo-1551882547-ff40c0d1398c?q=80&w=400&auto=format&fit=crop'); background-size: cover; background-position: center;"><div class="hotel-rating"><span class="material-symbols-rounded" style="font-size:14px; color:#FBBF24;">star</span> 8.8</div></div><div class="hotel-info"><h3 class="hotel-name">호텔 그레이서리 신주쿠</h3><div class="hotel-loc"><span class="material-symbols-rounded" style="font-size:16px;">location_on</span> 도심에서 0.5km · 리뷰 1204개</div><div class="hotel-price-row"><span class="h-price-label">1박 기준, 세금 포함</span><span class="h-price-val">${price.toLocaleString()}원</span></div></div></div>`;
        }
        dateTabsContainer.style.display = 'none'; resultListContainer.innerHTML = html; showLoadingThenResult('hotel');
    });

    // 8. AI 일정 생성기 
    const btnItineraryQuick = document.getElementById('btn-itinerary'); const aiScreen = document.getElementById('ai-screen'); const btnBackAi = document.getElementById('btn-back-ai');
    if(btnItineraryQuick) btnItineraryQuick.addEventListener('click', () => { aiScreen.classList.add('active'); resetAiFlow(); });
    if(btnBackAi) btnBackAi.addEventListener('click', () => aiScreen.classList.remove('active'));

    let currentAiStep = 1; const totalAiSteps = 7;
    const aiProgressBar = document.getElementById('ai-progress-bar'); const btnAiNext = document.getElementById('btn-ai-next');
    let aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [] };

    // 무료 지도 연동
    let map = null; let marker = null;
    const btnOpenMap = document.getElementById('btn-open-map');
    const mapModal = document.getElementById('map-modal');
    const btnCloseMap = document.getElementById('btn-close-map');
    const btnConfirmMap = document.getElementById('btn-confirm-map');
    
    const tryGeolocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => { map.setView([position.coords.latitude, position.coords.longitude], 13); },
                () => { console.log("GPS 허용 거부됨 - 기본 좌표 유지"); }
            );
        }
    };

    const initMap = () => {
        if(!map) {
            map = L.map('map-container').setView([37.5665, 126.9780], 13); 
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { attribution: 'Map data © Google' }).addTo(map);

            map.on('click', function(e) {
                if(marker) map.removeLayer(marker);
                marker = L.marker(e.latlng).addTo(map);
                
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                    .then(res => res.json())
                    .then(data => {
                        const placeName = data.name || data.address.suburb || data.address.city || data.display_name.split(',')[0];
                        document.getElementById('map-selected-address').innerText = placeName;
                        document.getElementById('ai-input-accom').value = placeName; 
                    }).catch(() => { document.getElementById('map-selected-address').innerText = "선택된 위치"; });
            });
        }
        
        setTimeout(() => {
            map.invalidateSize(); 
            const destCity = document.getElementById('ai-input-dest').value.trim();
            if (destCity) {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destCity)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) map.setView([data[0].lat, data[0].lon], 12);
                        else tryGeolocation(); 
                    }).catch(() => tryGeolocation());
            } else {
                tryGeolocation(); 
            }
        }, 100);
    };

    if(btnOpenMap) {
        btnOpenMap.addEventListener('click', () => { calendarOverlay.style.display = 'block'; mapModal.classList.add('active'); setTimeout(() => initMap(), 300); });
    }

    const closeMap = () => { mapModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    if(btnCloseMap) btnCloseMap.addEventListener('click', closeMap);
    if(btnConfirmMap) btnConfirmMap.addEventListener('click', closeMap);

    const resetAiFlow = () => {
        currentAiStep = 1; aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`;
        btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true;
        for(let i=1; i<=totalAiSteps; i++) document.getElementById(`ai-step-${i}`).className = i===1 ? 'ai-step active' : 'ai-step';
        
        aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [] };
        aiStartDate = null; aiEndDate = null; updateDateTexts();
        document.getElementById('ai-input-dest').value = ''; document.getElementById('ai-input-arr-time').value = '';
        document.getElementById('ai-input-dep-time').value = ''; document.getElementById('ai-input-accom').value = '';
        document.getElementById('people-count').innerText = '1명';
        document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('selected'));
    };

    const validateAiStep = () => {
        if(!btnAiNext) return;
        if(currentAiStep === 1) btnAiNext.disabled = document.getElementById('ai-input-dest').value.trim() === '';
        else if(currentAiStep === 2) btnAiNext.disabled = !(aiStartDate && aiEndDate);
        else if(currentAiStep === 3 || currentAiStep === 4) btnAiNext.disabled = false; 
        else if(currentAiStep === 5) btnAiNext.disabled = aiData.companion === '';
        else if(currentAiStep === 6) btnAiNext.disabled = aiData.ages.length === 0;
        else if(currentAiStep === 7) btnAiNext.disabled = aiData.styles.length === 0;
    };

    document.getElementById('ai-input-dest')?.addEventListener('input', validateAiStep);
    
    document.querySelectorAll('.ai-option-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected'); aiData.companion = card.getAttribute('data-val'); validateAiStep();
        });
    });

    const btnMinus = document.getElementById('btn-minus-people');
    const btnPlus = document.getElementById('btn-plus-people');
    const peopleCount = document.getElementById('people-count');
    if(btnMinus) btnMinus.addEventListener('click', () => { if(aiData.people > 1) { aiData.people--; peopleCount.innerText = `${aiData.people}명`; }});
    if(btnPlus) btnPlus.addEventListener('click', () => { if(aiData.people < 20) { aiData.people++; peopleCount.innerText = `${aiData.people}명`; }});

    document.querySelectorAll('.ai-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.getAttribute('data-val'); const isAge = chip.classList.contains('age-chip');
            const targetArr = isAge ? aiData.ages : aiData.styles; const limit = isAge ? 6 : 3;
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
                if(isAge) aiData.ages = aiData.ages.filter(s => s !== val); else aiData.styles = aiData.styles.filter(s => s !== val);
            } else {
                if (!isAge && targetArr.length >= limit) { alert(`최대 ${limit}개까지만 선택할 수 있어요!`); return; }
                chip.classList.add('selected'); targetArr.push(val);
            }
            validateAiStep();
        });
    });

    if(btnAiNext) {
        btnAiNext.addEventListener('click', () => {
            if (currentAiStep < totalAiSteps) {
                if(currentAiStep === 1) aiData.dest = document.getElementById('ai-input-dest').value.trim();
                if(currentAiStep === 3) { aiData.arrTime = document.getElementById('ai-input-arr-time').value; aiData.depTime = document.getElementById('ai-input-dep-time').value; }
                if(currentAiStep === 4) aiData.accom = document.getElementById('ai-input-accom').value.trim();

                const curEl = document.getElementById(`ai-step-${currentAiStep}`);
                const nextEl = document.getElementById(`ai-step-${currentAiStep + 1}`);
                curEl.classList.remove('active'); curEl.classList.add('exit');
                setTimeout(() => nextEl.classList.add('active'), 100);
                
                currentAiStep++; aiProgressBar.style.width = `${(currentAiStep/totalAiSteps)*100}%`;
                if(currentAiStep === totalAiSteps) btnAiNext.innerText = 'AI 일정 생성하기';
                validateAiStep();
            } 
            else if (currentAiStep === totalAiSteps) {
                aiData.startDate = fm(aiStartDate); aiData.endDate = fm(aiEndDate);
                document.getElementById('ai-loading-overlay').classList.add('active');
                setTimeout(() => {
                    document.getElementById('ai-loading-overlay').classList.remove('active');
                    alert(`[데이터 수집 완료!]\n목적지: ${aiData.dest}\n일정: ${aiData.startDate} ~ ${aiData.endDate}\n동행: ${aiData.companion} (${aiData.people}명, ${aiData.ages.join('/')})\n숙소: ${aiData.accom}\n스타일: ${aiData.styles.join(', ')}`);
                    aiScreen.classList.remove('active');
                }, 3000);
            }
        });
    }

    // 9. 하단 네비 로직 
    const navHome = document.getElementById('nav-home');
    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
});