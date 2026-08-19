import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. 스플래시 화면 제어
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => {
            splashScreen.classList.add('hide');
            setTimeout(() => splashScreen.remove(), 500); 
        }, 1500); 
    }

    // 1. 공통 로직 (월 세팅, 스크롤, 리플 이펙트)
    const currentMonth = new Date().getMonth() + 1;
    const monthTitle = document.getElementById('month-title');
    if (monthTitle) monthTitle.innerText = `${currentMonth}월에 떠나기 좋은 곳`;

    const mainContent = document.getElementById('main-content');
    const topHeader = document.getElementById('top-header');
    mainContent.addEventListener('scroll', () => {
        topHeader.classList.toggle('scrolled', mainContent.scrollTop > 10);
    });

    const bindRipple = () => {
        const rippleBtns = document.querySelectorAll('.ripple-btn, .small-ripple-btn');
        rippleBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x - size / 2}px`; ripple.style.top = `${y - size / 2}px`;
                ripple.style.animation = this.classList.contains('small-ripple-btn') ? 'ripple-anim-small 0.4s ease-out forwards' : 'ripple-anim-large 0.6s ease-out forwards';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    };
    bindRipple();

    // 2. 구글 로그인 및 마이 버튼 연동
    const btnAccount = document.getElementById('nav-account');
    const profilePic = document.querySelector('.profile-pic');
    const greeting = document.querySelector('.greeting');
    const defaultProfileSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394A3B8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            greeting.innerText = `${user.displayName}님,\n어디로 떠나시나요?`;
            profilePic.style.backgroundImage = `url('${user.photoURL}')`;
        } else {
            greeting.innerText = `어디로 떠나시나요?`;
            profilePic.style.backgroundImage = defaultProfileSvg;
        }
    });

    const handleLoginClick = () => {
        if (auth.currentUser) {
            if(confirm("로그아웃 하시겠습니까?")) signOut(auth);
        } else {
            signInWithPopup(auth, provider).catch(err => alert("로그인 에러 발생"));
        }
    };
    if(profilePic) profilePic.addEventListener('click', handleLoginClick);
    if(btnAccount) btnAccount.addEventListener('click', handleLoginClick);

    // 3. 항공권 화면 UI 토글 및 날짜 데이터 구조
    const btnFlight = document.getElementById('btn-flight');
    const flightScreen = document.getElementById('flight-screen');
    const btnBackFlight = document.getElementById('btn-back-flight');
    if (btnFlight) btnFlight.addEventListener('click', () => flightScreen.classList.add('active'));
    if (btnBackFlight) btnBackFlight.addEventListener('click', () => flightScreen.classList.remove('active'));

    const radioRound = document.getElementById('round-trip');
    const radioOneWay = document.getElementById('one-way');
    const tripTypeLabel = document.getElementById('trip-type-label');
    
    // 달력 데이터를 저장할 독립적인 변수들 (항공권 vs AI)
    let flightIsRoundTrip = true;
    let flightStartDate = null;
    let flightEndDate = null;
    let aiStartDate = null;
    let aiEndDate = null;
    
    let calendarTarget = 'flight'; 
    let tempStartDate = null;
    let tempEndDate = null;

    if (radioRound) radioRound.addEventListener('change', () => { flightIsRoundTrip = true; tripTypeLabel.innerText='왕복'; flightEndDate=null; updateDateTexts(); });
    if (radioOneWay) radioOneWay.addEventListener('change', () => { flightIsRoundTrip = false; tripTypeLabel.innerText='편도'; flightEndDate=null; updateDateTexts(); });

    const fm = (d) => `${d.getMonth()+1}.${d.getDate()}`;
    const updateDateTexts = () => {
        const flightText = document.getElementById('flight-date-text');
        const aiText = document.getElementById('ai-date-text');
        
        if(flightText) {
            if(!flightStartDate) flightText.innerText = '날짜를 선택해주세요';
            else if(flightIsRoundTrip) flightText.innerText = flightEndDate ? `${fm(flightStartDate)} ~ ${fm(flightEndDate)}` : `${fm(flightStartDate)} ~ 선택 중`;
            else flightText.innerText = fm(flightStartDate);
        }
        
        if(aiText) {
            if(!aiStartDate) aiText.innerText = '날짜를 선택해주세요';
            else aiText.innerText = aiEndDate ? `${fm(aiStartDate)} ~ ${fm(aiEndDate)}` : `${fm(aiStartDate)} ~ 선택 중`;
        }
        
        if(typeof validateAiStep === 'function') validateAiStep();
    };

    // 4. 공용 달력 모달 로직
    const calendarModal = document.getElementById('calendar-modal');
    const btnCloseCalendar = document.getElementById('btn-close-calendar');
    const calendarOverlay = document.getElementById('calendar-overlay');
    const calendarContainer = document.getElementById('calendar-grid-container');
    const btnConfirmDate = document.getElementById('btn-confirm-date');

    const openCalendar = (target) => {
        calendarTarget = target;
        if(target === 'flight') { tempStartDate = flightStartDate; tempEndDate = flightEndDate; } 
        else { tempStartDate = aiStartDate; tempEndDate = aiEndDate; }
        
        calendarOverlay.style.display = 'block';
        setTimeout(() => calendarModal.classList.add('active'), 10);
        renderCalendar();
    };

    document.getElementById('btn-open-calendar-flight')?.addEventListener('click', () => openCalendar('flight'));
    document.getElementById('btn-open-calendar-ai')?.addEventListener('click', () => openCalendar('ai'));
    
    const closeCalendar = () => {
        calendarModal.classList.remove('active');
        setTimeout(() => calendarOverlay.style.display = 'none', 300);
    };

    if (btnCloseCalendar) btnCloseCalendar.addEventListener('click', closeCalendar);
    if (calendarOverlay) calendarOverlay.addEventListener('click', closeCalendar);
    
    if (btnConfirmDate) btnConfirmDate.addEventListener('click', () => {
        const isRound = calendarTarget === 'flight' ? flightIsRoundTrip : true;
        if (isRound && (!tempStartDate || !tempEndDate)) { alert('가는 날과 오는 날을 모두 선택해주세요.'); return; }
        if (!isRound && !tempStartDate) { alert('가는 날을 선택해주세요.'); return; }
        
        if(calendarTarget === 'flight') { flightStartDate = tempStartDate; flightEndDate = tempEndDate; } 
        else { aiStartDate = tempStartDate; aiEndDate = tempEndDate; }
        
        updateDateTexts();
        closeCalendar();
    });

    const renderCalendar = () => {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '';
        const today = new Date(); today.setHours(0,0,0,0);
        const isRound = calendarTarget === 'flight' ? flightIsRoundTrip : true;
        
        for (let i = 0; i < 3; i++) {
            const year = today.getFullYear(); const month = today.getMonth() + i;
            const drawDate = new Date(year, month, 1);
            const monthTitle = document.createElement('div');
            monthTitle.className = 'month-title'; monthTitle.innerText = `${drawDate.getFullYear()}년 ${drawDate.getMonth() + 1}월`;
            calendarContainer.appendChild(monthTitle);
            
            const grid = document.createElement('div'); grid.className = 'calendar-grid';
            for(let j = 0; j < drawDate.getDay(); j++) { grid.innerHTML += `<div></div>`; }
            
            const lastDate = new Date(year, month + 1, 0).getDate();
            for(let d = 1; d <= lastDate; d++) {
                const currentDate = new Date(year, month, d);
                const cell = document.createElement('div'); cell.className = 'cal-day'; cell.innerText = d;
                
                if (currentDate < today) {
                    cell.classList.add('disabled');
                } else {
                    const timeCur = currentDate.getTime();
                    const timeStart = tempStartDate ? tempStartDate.getTime() : null;
                    const timeEnd = tempEndDate ? tempEndDate.getTime() : null;
                    
                    if (timeStart === timeCur) cell.classList.add('selected');
                    if (timeEnd === timeCur) cell.classList.add('selected');
                    if (isRound && timeStart && timeEnd) {
                        if (timeCur > timeStart && timeCur < timeEnd) cell.classList.add('in-range');
                        if (timeCur === timeStart && timeStart !== timeEnd) cell.classList.add('range-start');
                        if (timeCur === timeEnd && timeStart !== timeEnd) cell.classList.add('range-end');
                    }
                    cell.addEventListener('click', () => {
                        if (!isRound) {
                            tempStartDate = currentDate;
                        } else {
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

    // 5. 한글/영어 공항 자동완성 로직 (생략 없이 원상복구!)
    const popularAirports = [
        { cityKo: '서울', cityAlias: '', cityEn: 'Seoul', code: 'ICN', airportKo: '인천국제공항', airportEn: 'Incheon Intl' },
        { cityKo: '서울', cityAlias: '', cityEn: 'Seoul', code: 'GMP', airportKo: '김포국제공항', airportEn: 'Gimpo Intl' },
        { cityKo: '오사카', cityAlias: '', cityEn: 'Osaka', code: 'KIX', airportKo: '간사이국제공항', airportEn: 'Kansai Intl' },
        { cityKo: '도쿄', cityAlias: '동경', cityEn: 'Tokyo', code: 'NRT', airportKo: '나리타국제공항', airportEn: 'Narita Intl' },
        { cityKo: '도쿄', cityAlias: '동경', cityEn: 'Tokyo', code: 'HND', airportKo: '하네다국제공항', airportEn: 'Haneda Intl' },
        { cityKo: '상하이', cityAlias: '상해', cityEn: 'Shanghai', code: 'PVG', airportKo: '푸둥국제공항', airportEn: 'Pudong Intl' },
        { cityKo: '방콕', cityAlias: '', cityEn: 'Bangkok', code: 'BKK', airportKo: '수완나품국제공항', airportEn: 'Suvarnabhumi' },
        { cityKo: '뉴욕', cityAlias: '', cityEn: 'New York', code: 'JFK', airportKo: '존 F. 케네디 국제공항', airportEn: 'John F. Kennedy' },
        { cityKo: '파리', cityAlias: '', cityEn: 'Paris', code: 'CDG', airportKo: '샤를드골국제공항', airportEn: 'Charles de Gaulle' }
    ];
    let combinedAirports = [...popularAirports];
    fetch('https://raw.githubusercontent.com/jbrooksuk/JSON-Airports/master/airports.json')
        .then(response => response.json())
        .then(data => {
            const popularCodes = popularAirports.map(a => a.code);
            const globalAirports = data.filter(item => item.iata && item.iata !== "" && !popularCodes.includes(item.iata)).map(item => {
                const cityName = item.city || item.name || "알 수 없는 도시";
                const airportName = item.name || "알 수 없는 공항";
                return { cityKo: cityName, cityAlias: '', cityEn: cityName, code: item.iata, airportKo: airportName, airportEn: airportName };
            });
            combinedAirports = [...popularAirports, ...globalAirports];
        }).catch(err => console.log('전 세계 공항 다운로드 실패', err));

    const depInput = document.getElementById('departure-input');
    const destInput = document.getElementById('destination-input');
    const depAuto = document.getElementById('dep-autocomplete');
    const destAuto = document.getElementById('dest-autocomplete');
    const btnSwap = document.getElementById('btn-swap-location');
    const cleanStr = (str) => str ? str.replace(/\s+/g, '').toLowerCase() : '';

    const setupAutocomplete = (inputEl, dropdownEl) => {
        if(!inputEl || !dropdownEl) return;
        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim(); const cleanVal = cleanStr(val);
            dropdownEl.innerHTML = ''; 
            if (!cleanVal) { dropdownEl.classList.remove('active'); return; }
            const isMatch = (str) => str && cleanStr(str).includes(cleanVal);
            const filtered = combinedAirports.filter(item => 
                isMatch(item.cityKo) || isMatch(item.cityEn) || isMatch(item.cityAlias) ||
                isMatch(item.airportKo) || isMatch(item.airportEn) || isMatch(item.code)
            ).slice(0, 10); 
            if (filtered.length > 0) {
                filtered.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    const displayCity = item.cityKo || item.cityEn;
                    const displayAirport = item.airportKo || item.airportEn;
                    div.innerHTML = `<span class="material-symbols-rounded auto-icon">flight</span>
                        <div class="auto-text"><span class="auto-city">${displayCity} <span style="color:#2563EB; margin-left:4px;">${item.code}</span></span><span class="auto-airport">${displayAirport}</span></div>`;
                    div.addEventListener('click', () => {
                        inputEl.value = `${displayCity} (${item.code})`;
                        dropdownEl.classList.remove('active');
                    });
                    dropdownEl.appendChild(div);
                });
                dropdownEl.classList.add('active'); 
            } else { dropdownEl.classList.remove('active'); }
        });
        inputEl.addEventListener('blur', () => { setTimeout(() => dropdownEl.classList.remove('active'), 200); });
    };
    setupAutocomplete(depInput, depAuto); setupAutocomplete(destInput, destAuto);
    if(btnSwap) btnSwap.addEventListener('click', () => { const temp = depInput.value; depInput.value = destInput.value; destInput.value = temp; });

    // 6. 항공권 검색 버튼 및 가짜 결과 화면 로직 (생략 없이 원상복구!)
    const btnSearchFlight = document.getElementById('btn-search-flight');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultScreen = document.getElementById('result-screen');
    const btnBackResult = document.getElementById('btn-back-result');
    const resultRouteText = document.getElementById('result-route-text');
    const resultDateText = document.getElementById('result-date-text');
    const flightListContainer = document.getElementById('flight-list-container');
    const dateTabsContainer = document.getElementById('date-tabs-container');

    const generateMockFlights = () => {
        const airlines = [
            { name: '대한항공', color: '#0064DE', code: 'KE' }, { name: '아시아나', color: '#C60C30', code: 'OZ' },
            { name: '제주항공', color: '#FF5000', code: '7C' }, { name: '진에어', color: '#00B050', code: 'LJ' }
        ];
        let html = '';
        for(let i=0; i<4; i++) {
            const outAirline = airlines[Math.floor(Math.random() * airlines.length)];
            const inAirline = flightIsRoundTrip ? airlines[Math.floor(Math.random() * airlines.length)] : null;
            const price = Math.floor(Math.random() * 30 + 15) * 10000;
            html += `
            <div class="ticket-card">
                <div class="ticket-leg">
                    <div class="airline-info"><div class="airline-logo" style="background:${outAirline.color}">${outAirline.code}</div><span class="airline-name">${outAirline.name}</span></div>
                    <div class="flight-times">
                        <div class="time-block"><span class="time">09:30</span><span class="code">ICN</span></div>
                        <div class="flight-duration"><span class="duration-text">2시간 15분</span><div class="duration-line"></div><span class="duration-type">직항</span></div>
                        <div class="time-block"><span class="time">11:45</span><span class="code">KIX</span></div>
                    </div>
                </div>
                ${flightIsRoundTrip ? `
                <div class="ticket-divider"></div>
                <div class="ticket-leg">
                    <div class="airline-info"><div class="airline-logo" style="background:${inAirline.color}">${inAirline.code}</div><span class="airline-name">${inAirline.name}</span></div>
                    <div class="flight-times">
                        <div class="time-block"><span class="time">15:00</span><span class="code">KIX</span></div>
                        <div class="flight-duration"><span class="duration-text">2시간 30분</span><div class="duration-line"></div><span class="duration-type">직항</span></div>
                        <div class="time-block"><span class="time">17:30</span><span class="code">ICN</span></div>
                    </div>
                </div>` : ''}
                <div class="ticket-footer">
                    <span class="ticket-price">${price.toLocaleString()}원</span>
                    <button class="select-btn ripple-btn">선택하기</button>
                </div>
            </div>`;
        }
        flightListContainer.innerHTML = html; bindRipple(); 
    };

    const generateDateTabs = () => {
        let tabsHtml = ''; const days = ['일', '월', '화', '수', '목', '금', '토'];
        for(let i=-2; i<=2; i++) {
            let d = new Date(flightStartDate); d.setDate(d.getDate() + i);
            const isSelected = i === 0 ? 'active' : '';
            const priceStr = (Math.floor(Math.random() * 20) + 15) + '만';
            tabsHtml += `<div class="date-tab ${isSelected}"><span class="d-date">${d.getMonth()+1}.${d.getDate()} (${days[d.getDay()]})</span><span class="d-price">${priceStr}</span></div>`;
        }
        dateTabsContainer.innerHTML = tabsHtml;
    };

    if(btnSearchFlight) {
        btnSearchFlight.addEventListener('click', () => {
            const dep = depInput.value.split('(')[0].trim(); const dest = destInput.value.split('(')[0].trim();
            if(!dep || !dest) { alert('출발지와 도착지를 입력해주세요.'); return; }
            if(!flightStartDate) { alert('날짜를 선택해주세요.'); return; }

            resultRouteText.innerText = `${dep} ➔ ${dest}`;
            resultDateText.innerText = flightIsRoundTrip && flightEndDate ? `${fm(flightStartDate)} ~ ${fm(flightEndDate)} · 성인 1명` : `${fm(flightStartDate)} · 성인 1명`;
            
            generateDateTabs(); generateMockFlights();
            loadingOverlay.classList.add('active');
            setTimeout(() => { loadingOverlay.classList.remove('active'); resultScreen.classList.add('active'); }, 1500);
        });
    }
    if(btnBackResult) btnBackResult.addEventListener('click', () => resultScreen.classList.remove('active'));


    // 🚀 7. AI 일정 생성기 (7단계 로직 추가됨)
    const btnItineraryQuick = document.getElementById('btn-itinerary');
    const aiScreen = document.getElementById('ai-screen');
    const btnBackAi = document.getElementById('btn-back-ai');
    
    if(btnItineraryQuick) btnItineraryQuick.addEventListener('click', () => { aiScreen.classList.add('active'); resetAiFlow(); });
    if(btnBackAi) btnBackAi.addEventListener('click', () => aiScreen.classList.remove('active'));

    let currentAiStep = 1;
    const totalAiSteps = 7;
    const aiProgressBar = document.getElementById('ai-progress-bar');
    const btnAiNext = document.getElementById('btn-ai-next');
    
    let aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [] };

    const resetAiFlow = () => {
        currentAiStep = 1;
        aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`;
        btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true;
        for(let i=1; i<=totalAiSteps; i++) document.getElementById(`ai-step-${i}`).className = i===1 ? 'ai-step active' : 'ai-step';
        
        aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, ages: [], styles: [] };
        aiStartDate = null; aiEndDate = null; updateDateTexts();
        document.getElementById('ai-input-dest').value = '';
        document.getElementById('ai-input-arr-time').value = '';
        document.getElementById('ai-input-dep-time').value = '';
        document.getElementById('ai-input-accom').value = '';
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
            card.classList.add('selected');
            aiData.companion = card.getAttribute('data-val');
            validateAiStep();
        });
    });

    const btnMinus = document.getElementById('btn-minus-people');
    const btnPlus = document.getElementById('btn-plus-people');
    const peopleCount = document.getElementById('people-count');
    if(btnMinus) btnMinus.addEventListener('click', () => { if(aiData.people > 1) { aiData.people--; peopleCount.innerText = `${aiData.people}명`; }});
    if(btnPlus) btnPlus.addEventListener('click', () => { if(aiData.people < 20) { aiData.people++; peopleCount.innerText = `${aiData.people}명`; }});

    document.querySelectorAll('.ai-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.getAttribute('data-val');
            const isAge = chip.classList.contains('age-chip');
            const targetArr = isAge ? aiData.ages : aiData.styles;
            const limit = isAge ? 6 : 3;
            
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
                if(isAge) aiData.ages = aiData.ages.filter(s => s !== val);
                else aiData.styles = aiData.styles.filter(s => s !== val);
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
                
                currentAiStep++;
                aiProgressBar.style.width = `${(currentAiStep/totalAiSteps)*100}%`;
                if(currentAiStep === totalAiSteps) btnAiNext.innerText = 'AI 일정 생성하기';
                validateAiStep();
            } 
            else if (currentAiStep === totalAiSteps) {
                aiData.startDate = fm(aiStartDate); aiData.endDate = fm(aiEndDate);
                console.log("✈️ Gemini에게 보낼 프롬프트 데이터:", aiData);
                
                document.getElementById('ai-loading-overlay').classList.add('active');
                setTimeout(() => {
                    document.getElementById('ai-loading-overlay').classList.remove('active');
                    alert(`[데이터 수집 완료!]\n목적지: ${aiData.dest}\n일정: ${aiData.startDate} ~ ${aiData.endDate}\n동행: ${aiData.companion} (${aiData.people}명, ${aiData.ages.join('/')})\n스타일: ${aiData.styles.join(', ')}`);
                    aiScreen.classList.remove('active');
                }, 3000);
            }
        });
    }

    // 8. 하단 네비 및 기타 버튼 처리 (마이 버튼 제외)
    const btnHotel = document.getElementById('btn-hotel');
    const navHome = document.getElementById('nav-home');
    const recMonth = document.getElementById('rec-month');
    const recSns = document.getElementById('rec-sns');

    if(btnHotel) btnHotel.addEventListener('click', () => setTimeout(() => alert('🏨 숙소 검색 화면 (개발 예정)'), 200));
    if(recMonth) recMonth.addEventListener('click', () => setTimeout(() => alert(`🌴 ${currentMonth}월 추천 화면 (개발 예정)`), 200));
    if(recSns) recSns.addEventListener('click', () => setTimeout(() => alert('📸 핫플레이스 화면 (개발 예정)'), 200));

    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
});