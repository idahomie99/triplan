// 🚀 맨 윗줄: firebase-config.js에서 인증 기능 가져오기
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 🚀 0. 스플래시 화면 제어 (1.5초 후 페이드아웃)
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => {
            splashScreen.classList.add('hide');
            // 애니메이션이 끝난 후 완전히 HTML에서 제거해서 앱이 가벼워지게 함
            setTimeout(() => splashScreen.remove(), 500); 
        }, 1500); 
    }
    
    // 1. 동적 월 세팅
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

    // 🚀 [추가됨] 8. 구글 로그인 및 세션 관리 로직
    const btnAccount = document.getElementById('nav-account');
    const profilePic = document.querySelector('.profile-pic');
    const greeting = document.querySelector('.greeting');
    const defaultProfileSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394A3B8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`;

    // 유저의 로그인 상태를 실시간으로 감지합니다.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 로그인 상태일 때: 이름과 구글 프로필 사진 적용
            greeting.innerText = `${user.displayName}님,\n어디로 떠나시나요?`;
            profilePic.style.backgroundImage = `url('${user.photoURL}')`;
            profilePic.style.backgroundSize = 'cover';
        } else {
            // 로그아웃 상태일 때: 기본 UI로 복구
            greeting.innerText = `어디로 떠나시나요?`;
            profilePic.style.backgroundImage = defaultProfileSvg;
            profilePic.style.backgroundSize = '24px';
        }
    });

    const handleLoginClick = () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // 이미 로그인 되어있으면 로그아웃 물어보기
            if(confirm("로그아웃 하시겠습니까?")) {
                signOut(auth).catch(err => console.error("로그아웃 에러", err));
            }
        } else {
            // 로그인이 안되어있으면 구글 로그인 팝업 띄우기
            signInWithPopup(auth, provider)
                .then((result) => {
                    console.log("로그인 성공:", result.user.displayName);
                })
                .catch((error) => {
                    console.error("로그인 에러:", error);
                    alert("로그인 중 문제가 발생했습니다.");
                });
        }
    };

    // 우측 상단 프로필 사진이나 하단 마이 버튼 클릭 시 로그인 실행
    if(profilePic) profilePic.addEventListener('click', handleLoginClick);
    if(btnAccount) btnAccount.addEventListener('click', handleLoginClick);


    // 항공권 서브 화면 조작
    const btnFlight = document.getElementById('btn-flight');
    const flightScreen = document.getElementById('flight-screen');
    const btnBackFlight = document.getElementById('btn-back-flight');
    if (btnFlight) btnFlight.addEventListener('click', () => flightScreen.classList.add('active'));
    if (btnBackFlight) btnBackFlight.addEventListener('click', () => flightScreen.classList.remove('active'));

    const radioRound = document.getElementById('round-trip');
    const radioOneWay = document.getElementById('one-way');
    const tripTypeLabel = document.getElementById('trip-type-label');
    const selectedDateText = document.getElementById('selected-date-text');
    let isRoundTrip = true;
    let startDate = null;
    let endDate = null;

    const handleTripTypeChange = () => {
        isRoundTrip = radioRound.checked;
        if (tripTypeLabel) tripTypeLabel.innerText = isRoundTrip ? '왕복' : '편도';
        if (!isRoundTrip) endDate = null;
        updateDateText();
        renderCalendar();
    };
    if (radioRound) radioRound.addEventListener('change', handleTripTypeChange);
    if (radioOneWay) radioOneWay.addEventListener('change', handleTripTypeChange);

    const updateDateText = () => {
        if (!selectedDateText) return;
        if (!startDate) {
            selectedDateText.innerText = '날짜를 선택해주세요';
            return;
        }
        const fm = (d) => `${d.getMonth()+1}.${d.getDate()}`;
        if (isRoundTrip) {
            if (startDate && endDate) selectedDateText.innerText = `${fm(startDate)} ~ ${fm(endDate)}`;
            else selectedDateText.innerText = `${fm(startDate)} ~ 선택 중`;
        } else {
            selectedDateText.innerText = fm(startDate);
        }
    };

    const btnOpenCalendar = document.getElementById('btn-open-calendar');
    const calendarModal = document.getElementById('calendar-modal');
    const btnCloseCalendar = document.getElementById('btn-close-calendar');
    const calendarOverlay = document.getElementById('calendar-overlay');
    const calendarContainer = document.getElementById('calendar-grid-container');
    const btnConfirmDate = document.getElementById('btn-confirm-date');

    const openCalendar = () => {
        calendarOverlay.style.display = 'block';
        setTimeout(() => calendarModal.classList.add('active'), 10);
        renderCalendar();
    };
    const closeCalendar = () => {
        calendarModal.classList.remove('active');
        setTimeout(() => calendarOverlay.style.display = 'none', 300);
    };

    if (btnOpenCalendar) btnOpenCalendar.addEventListener('click', openCalendar);
    if (btnCloseCalendar) btnCloseCalendar.addEventListener('click', closeCalendar);
    if (calendarOverlay) calendarOverlay.addEventListener('click', closeCalendar);
    if (btnConfirmDate) btnConfirmDate.addEventListener('click', () => {
        if (isRoundTrip && (!startDate || !endDate)) {
            alert('가는 날과 오는 날을 모두 선택해주세요.'); return;
        }
        if (!isRoundTrip && !startDate) {
            alert('가는 날을 선택해주세요.'); return;
        }
        updateDateText();
        closeCalendar();
    });

    const renderCalendar = () => {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '';
        const today = new Date();
        today.setHours(0,0,0,0);
        for (let i = 0; i < 3; i++) {
            const year = today.getFullYear();
            const month = today.getMonth() + i;
            const drawDate = new Date(year, month, 1);
            const monthTitle = document.createElement('div');
            monthTitle.className = 'month-title';
            monthTitle.innerText = `${drawDate.getFullYear()}년 ${drawDate.getMonth() + 1}월`;
            calendarContainer.appendChild(monthTitle);
            const grid = document.createElement('div');
            grid.className = 'calendar-grid';
            const firstDayIndex = drawDate.getDay();
            for(let j = 0; j < firstDayIndex; j++) { grid.innerHTML += `<div></div>`; }
            const lastDate = new Date(year, month + 1, 0).getDate();
            for(let d = 1; d <= lastDate; d++) {
                const currentDate = new Date(year, month, d);
                const cell = document.createElement('div');
                cell.className = 'cal-day';
                cell.innerText = d;
                if (currentDate < today) {
                    cell.classList.add('disabled');
                } else {
                    const timeCurrent = currentDate.getTime();
                    const timeStart = startDate ? startDate.getTime() : null;
                    const timeEnd = endDate ? endDate.getTime() : null;
                    if (timeStart === timeCurrent) cell.classList.add('selected');
                    if (timeEnd === timeCurrent) cell.classList.add('selected');
                    if (isRoundTrip && timeStart && timeEnd) {
                        if (timeCurrent > timeStart && timeCurrent < timeEnd) cell.classList.add('in-range');
                        if (timeCurrent === timeStart && timeStart !== timeEnd) cell.classList.add('range-start');
                        if (timeCurrent === timeEnd && timeStart !== timeEnd) cell.classList.add('range-end');
                    }
                    cell.addEventListener('click', () => handleDateClick(currentDate));
                }
                grid.appendChild(cell);
            }
            calendarContainer.appendChild(grid);
        }
    };

    const handleDateClick = (clickedDate) => {
        if (!isRoundTrip) {
            startDate = clickedDate;
        } else {
            if (!startDate || (startDate && endDate)) {
                startDate = clickedDate; endDate = null;
            } else if (startDate && !endDate) {
                if (clickedDate >= startDate) endDate = clickedDate;
                else startDate = clickedDate;
            }
        }
        renderCalendar(); updateDateText();
    };

    // 자동완성
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

    // 검색 버튼 클릭 -> 로딩 -> 결과 화면 전환 로직
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
            { name: '대한항공', color: '#0064DE', code: 'KE' },
            { name: '아시아나', color: '#C60C30', code: 'OZ' },
            { name: '제주항공', color: '#FF5000', code: '7C' },
            { name: '진에어', color: '#00B050', code: 'LJ' }
        ];
        
        let html = '';
        for(let i=0; i<4; i++) {
            const outAirline = airlines[Math.floor(Math.random() * airlines.length)];
            const inAirline = isRoundTrip ? airlines[Math.floor(Math.random() * airlines.length)] : null;
            const price = Math.floor(Math.random() * 30 + 15) * 10000;

            html += `
            <div class="ticket-card">
                <div class="ticket-leg">
                    <div class="airline-info">
                        <div class="airline-logo" style="background:${outAirline.color}">${outAirline.code}</div>
                        <span class="airline-name">${outAirline.name}</span>
                    </div>
                    <div class="flight-times">
                        <div class="time-block">
                            <span class="time">09:30</span>
                            <span class="code">ICN</span>
                        </div>
                        <div class="flight-duration">
                            <span class="duration-text">2시간 15분</span>
                            <div class="duration-line"></div>
                            <span class="duration-type">직항</span>
                        </div>
                        <div class="time-block">
                            <span class="time">11:45</span>
                            <span class="code">KIX</span>
                        </div>
                    </div>
                </div>
                
                ${isRoundTrip ? `
                <div class="ticket-divider"></div>
                <div class="ticket-leg">
                    <div class="airline-info">
                        <div class="airline-logo" style="background:${inAirline.color}">${inAirline.code}</div>
                        <span class="airline-name">${inAirline.name}</span>
                    </div>
                    <div class="flight-times">
                        <div class="time-block">
                            <span class="time">15:00</span>
                            <span class="code">KIX</span>
                        </div>
                        <div class="flight-duration">
                            <span class="duration-text">2시간 30분</span>
                            <div class="duration-line"></div>
                            <span class="duration-type">직항</span>
                        </div>
                        <div class="time-block">
                            <span class="time">17:30</span>
                            <span class="code">ICN</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="ticket-footer">
                    <span class="ticket-price">${price.toLocaleString()}원</span>
                    <button class="select-btn ripple-btn">선택하기</button>
                </div>
            </div>`;
        }
        flightListContainer.innerHTML = html;
        bindRipple(); 
    };

    const generateDateTabs = () => {
        let tabsHtml = '';
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        for(let i=-2; i<=2; i++) {
            let d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const isSelected = i === 0 ? 'active' : '';
            const priceStr = (Math.floor(Math.random() * 20) + 15) + '만';
            tabsHtml += `
                <div class="date-tab ${isSelected}">
                    <span class="d-date">${d.getMonth()+1}.${d.getDate()} (${days[d.getDay()]})</span>
                    <span class="d-price">${priceStr}</span>
                </div>
            `;
        }
        dateTabsContainer.innerHTML = tabsHtml;
    };

    if(btnSearchFlight) {
        btnSearchFlight.addEventListener('click', () => {
            const dep = depInput.value.split('(')[0].trim();
            const dest = destInput.value.split('(')[0].trim();
            
            if(!dep || !dest) { alert('출발지와 도착지를 입력해주세요.'); return; }
            if(!startDate) { alert('날짜를 선택해주세요.'); return; }

            resultRouteText.innerText = `${dep} ➔ ${dest}`;
            const fm = (d) => `${d.getMonth()+1}.${d.getDate()}`;
            resultDateText.innerText = isRoundTrip && endDate ? `${fm(startDate)} ~ ${fm(endDate)} · 성인 1명` : `${fm(startDate)} · 성인 1명`;

            generateDateTabs();
            generateMockFlights();

            loadingOverlay.classList.add('active');
            setTimeout(() => {
                loadingOverlay.classList.remove('active');
                resultScreen.classList.add('active');
            }, 1500);
        });
    }

    if(btnBackResult) {
        btnBackResult.addEventListener('click', () => {
            resultScreen.classList.remove('active');
        });
    }

    // 하단 네비 및 기타 버튼 처리 (마이 버튼 제외)
    const btnHotel = document.getElementById('btn-hotel');
    const btnItinerary = document.getElementById('btn-itinerary');
    const navHome = document.getElementById('nav-home');
    const recMonth = document.getElementById('rec-month');
    const recSns = document.getElementById('rec-sns');

    if(btnHotel) btnHotel.addEventListener('click', () => setTimeout(() => alert('🏨 숙소 검색 화면 (개발 예정)'), 200));
    if(btnItinerary) btnItinerary.addEventListener('click', () => setTimeout(() => alert('✨ AI 여행 일정 화면 (개발 예정)'), 200));
    if(recMonth) recMonth.addEventListener('click', () => setTimeout(() => alert(`🌴 ${currentMonth}월 추천 화면 (개발 예정)`), 200));
    if(recSns) recSns.addEventListener('click', () => setTimeout(() => alert('📸 핫플레이스 화면 (개발 예정)'), 200));

    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });

// ----------------------------------------------------
    // 🚀 8. AI 여행 일정 화면 제어 로직
    // ----------------------------------------------------
    const btnItineraryQuick = document.getElementById('btn-itinerary');
    const aiScreen = document.getElementById('ai-screen');
    const btnBackAi = document.getElementById('btn-back-ai');
    
    // AI 화면 열기/닫기
    if(btnItineraryQuick) btnItineraryQuick.addEventListener('click', () => {
        aiScreen.classList.add('active');
        resetAiFlow(); // 열 때마다 스텝 초기화
    });
    if(btnBackAi) btnBackAi.addEventListener('click', () => aiScreen.classList.remove('active'));

    // 스텝 제어 변수
    let currentAiStep = 1;
    const totalAiSteps = 2;
    const aiProgressBar = document.getElementById('ai-progress-bar');
    const btnAiNext = document.getElementById('btn-ai-next');
    
    const step1 = document.getElementById('ai-step-1');
    const step2 = document.getElementById('ai-step-2');
    
    // 선택된 데이터 저장용
    let aiData = { companion: null, styles: [] };

    // 스텝 초기화 함수
    const resetAiFlow = () => {
        currentAiStep = 1;
        aiProgressBar.style.width = '50%';
        btnAiNext.innerText = '다음으로';
        btnAiNext.disabled = true;
        
        step1.className = 'ai-step active';
        step2.className = 'ai-step';
        
        // 데이터 초기화
        aiData = { companion: null, styles: [] };
        document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('selected'));
    };

    // [스텝 1] 누구와 갈까요? (단일 선택)
    const optionCards = document.querySelectorAll('.ai-option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            // 다른 카드 선택 해제
            optionCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            aiData.companion = card.getAttribute('data-val');
            btnAiNext.disabled = false; // 다음 버튼 활성화
        });
    });

    // [스텝 2] 여행 스타일 (다중 선택, 최대 3개)
    const styleChips = document.querySelectorAll('.ai-chip');
    styleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.getAttribute('data-val');
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
                aiData.styles = aiData.styles.filter(s => s !== val);
            } else {
                if (aiData.styles.length >= 3) {
                    alert('최대 3개까지만 선택할 수 있어요!');
                    return;
                }
                chip.classList.add('selected');
                aiData.styles.push(val);
            }
            // 1개 이상 선택하면 버튼 활성화
            btnAiNext.disabled = aiData.styles.length === 0;
        });
    });

    // [다음으로 / 일정 생성] 버튼 로직
    const aiLoadingOverlay = document.getElementById('ai-loading-overlay');
    
    if(btnAiNext) {
        btnAiNext.addEventListener('click', () => {
            if (currentAiStep === 1) {
                // 스텝 1 -> 스텝 2 로 이동
                step1.classList.remove('active');
                step1.classList.add('exit');
                setTimeout(() => {
                    step2.classList.add('active');
                }, 100);
                
                currentAiStep = 2;
                aiProgressBar.style.width = '100%';
                btnAiNext.innerText = 'AI 일정 생성하기';
                // 스텝 2 선택 여부에 따라 버튼 상태 변경
                btnAiNext.disabled = aiData.styles.length === 0;
            } 
            else if (currentAiStep === 2) {
                // AI 일정 생성 시작 (서버 요청 전 로딩 연출)
                console.log("Gemini API로 보낼 데이터:", aiData);
                aiLoadingOverlay.classList.add('active');
                
                // 3초 뒤 가상 완료 처리
                setTimeout(() => {
                    aiLoadingOverlay.classList.remove('active');
                    alert(`[테스트 완료]\n동행: ${aiData.companion}\n스타일: ${aiData.styles.join(', ')}\n\n(다음 스텝에서 여기에 타임라인 결과 화면이 뜹니다!)`);
                    aiScreen.classList.remove('active');
                }, 3000);
            }
        });
    }
});