import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. 스플래시 & 로비
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

    // 1. 구글 로그인 및 마이페이지
    const btnAccount = document.getElementById('nav-account');
    const btnTopProfile = document.getElementById('btn-top-profile'); 
    const profilePic = document.querySelector('.profile-pic');
    const greeting = document.querySelector('.greeting');
    const accountScreen = document.getElementById('account-screen');
    const btnBackAccount = document.getElementById('btn-back-account');
    
    const defaultProfileSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394A3B8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>')`;

    onAuthStateChanged(auth, (user) => {
        if (user) { 
            greeting.innerText = `${user.displayName}님,\n어디로 떠나시나요?`; 
            profilePic.style.backgroundImage = `url('${user.photoURL}')`; 
            document.getElementById('account-name').innerText = user.displayName; 
            document.getElementById('account-email').innerText = user.email; 
            document.getElementById('account-profile-pic').style.backgroundImage = `url('${user.photoURL}')`;
        } else { 
            greeting.innerText = `어디로 떠나시나요?`; 
            profilePic.style.backgroundImage = defaultProfileSvg; 
            document.getElementById('account-name').innerText = '로그인이 필요합니다'; 
            document.getElementById('account-email').innerText = '이메일 정보 없음'; 
            document.getElementById('account-profile-pic').style.backgroundImage = defaultProfileSvg;
            accountScreen.classList.remove('active');
        }
    });

    const handleLoginOrMyPage = () => { if (auth.currentUser) accountScreen.classList.add('active'); else signInWithPopup(auth, provider).catch(err => alert("로그인 에러")); };
    if(btnTopProfile) btnTopProfile.addEventListener('click', handleLoginOrMyPage);
    if(btnAccount) btnAccount.addEventListener('click', handleLoginOrMyPage);
    if(btnBackAccount) btnBackAccount.addEventListener('click', () => accountScreen.classList.remove('active'));

    // 2. 달력 로직 
    let aiStartDate = null; let aiEndDate = null;
    const fm = (d) => {
        if(!d) return '';
        if(typeof d === 'string') return d;
        return `${d.getMonth()+1}.${d.getDate()}`;
    };

    const updateDateTexts = () => {
        const aiText = document.getElementById('ai-date-text');
        if(aiText) aiText.innerText = (!aiStartDate) ? '날짜를 선택해주세요' : (aiEndDate ? `${fm(aiStartDate)} ~ ${fm(aiEndDate)}` : `${fm(aiStartDate)} ~ 선택 중`);
        const labelArrDate = document.getElementById('label-arr-date'); const labelDepDate = document.getElementById('label-dep-date');
        if(labelArrDate) labelArrDate.innerText = aiStartDate ? `(${aiStartDate.getMonth()+1}/${aiStartDate.getDate()})` : ''; 
        if(labelDepDate) labelDepDate.innerText = aiEndDate ? `(${aiEndDate.getMonth()+1}/${aiEndDate.getDate()})` : ''; 
        if(typeof validateAiStep === 'function') validateAiStep();
    };

    const calendarModal = document.getElementById('calendar-modal'); 
    const calendarOverlay = document.getElementById('calendar-overlay'); 
    const calendarContainer = document.getElementById('calendar-grid-container'); 
    let tempStartDate = null; let tempEndDate = null;

    document.getElementById('btn-open-calendar-ai')?.addEventListener('click', () => {
        tempStartDate = aiStartDate; tempEndDate = aiEndDate;
        calendarOverlay.style.display = 'block'; setTimeout(() => calendarModal.classList.add('active'), 10); renderCalendar();
    });
    
    const closeCalendar = () => { calendarModal.classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); };
    document.getElementById('btn-close-calendar')?.addEventListener('click', closeCalendar); 
    calendarOverlay.addEventListener('click', closeCalendar);
    
    document.getElementById('btn-confirm-date')?.addEventListener('click', () => {
        if (!tempStartDate || !tempEndDate) { alert('시작일과 종료일을 모두 선택해주세요.'); return; }
        aiStartDate = tempStartDate; aiEndDate = tempEndDate;
        updateDateTexts(); closeCalendar();
    });

    const renderCalendar = () => {
        if (!calendarContainer) return; calendarContainer.innerHTML = '';
        const today = new Date(); today.setHours(0,0,0,0);
        for (let i = 0; i < 3; i++) {
            const year = today.getFullYear(); const month = today.getMonth() + i; const drawDate = new Date(year, month, 1);
            const monthTitle = document.createElement('div'); monthTitle.className = 'month-title'; monthTitle.innerText = `${drawDate.getFullYear()}년 ${drawDate.getMonth() + 1}월`; calendarContainer.appendChild(monthTitle);
            const grid = document.createElement('div'); grid.className = 'calendar-grid';
            for(let j = 0; j < drawDate.getDay(); j++) { grid.innerHTML += `<div></div>`; }
            const lastDate = new Date(year, month + 1, 0).getDate();
            for(let d = 1; d <= lastDate; d++) {
                const currentDate = new Date(year, month, d); const cell = document.createElement('div'); cell.className = 'cal-day'; cell.innerText = d;
                if (currentDate < today) { cell.classList.add('disabled'); } else {
                    const timeCur = currentDate.getTime(); const timeStart = tempStartDate ? tempStartDate.getTime() : null; const timeEnd = tempEndDate ? tempEndDate.getTime() : null;
                    if (timeStart === timeCur || timeEnd === timeCur) cell.classList.add('selected');
                    if (timeStart && timeEnd) { if (timeCur > timeStart && timeCur < timeEnd) cell.classList.add('in-range'); if (timeCur === timeStart && timeStart !== timeEnd) cell.classList.add('range-start'); if (timeCur === timeEnd && timeStart !== timeEnd) cell.classList.add('range-end'); }
                    cell.addEventListener('click', () => {
                        if (!tempStartDate || (tempStartDate && tempEndDate)) { tempStartDate = currentDate; tempEndDate = null; }
                        else if (tempStartDate && !tempEndDate) { if (currentDate >= tempStartDate) tempEndDate = currentDate; else tempStartDate = currentDate; }
                        renderCalendar(); updateDateTexts();
                    });
                }
                grid.appendChild(cell);
            }
            calendarContainer.appendChild(grid);
        }
    };

    // 3. AI 일정 생성기 
    let aiMode = 'standard'; 
    const aiScreen = document.getElementById('ai-screen'); 
    
    document.getElementById('btn-ai-standard')?.addEventListener('click', () => { aiMode = 'standard'; aiScreen.classList.add('active'); resetAiFlow(); });
    document.getElementById('btn-ai-tension')?.addEventListener('click', () => { aiMode = 'tension'; aiScreen.classList.add('active'); resetAiFlow(); });
    
    // 🚀 뒤로가기 클릭 시 경고 팝업
    document.getElementById('btn-back-ai')?.addEventListener('click', () => { 
        if(confirm("일정 짜기를 그만두시겠습니까? 진행 중인 정보는 저장되지 않습니다.")) {
            aiScreen.classList.remove('active'); 
        }
    });

    let currentAiStep = 1; const totalAiSteps = 8;
    const aiProgressBar = document.getElementById('ai-progress-bar'); const btnAiNext = document.getElementById('btn-ai-next');
    let aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, styles: [], myStyles: [], ptStyles: [], stamina: 3 };

    let map = null; let marker = null; 
    const tryGeolocation = () => { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 13); }, () => { }); } };
    const initMap = () => {
        if(!map) { 
            map = L.map('map-container').setView([37.5665, 126.9780], 13); 
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko').addTo(map); 
            map.on('click', function(e) { 
                if(marker) map.removeLayer(marker); marker = L.marker(e.latlng).addTo(map); 
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`).then(res => res.json()).then(data => { const placeName = data.name || data.address.suburb || data.display_name.split(',')[0]; document.getElementById('map-selected-address').innerText = placeName; document.getElementById('ai-input-accom').value = placeName; }).catch(() => {}); 
            }); 
        }
        setTimeout(() => { map.invalidateSize(); const destCity = document.getElementById('ai-input-dest').value.trim(); if (destCity) { fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destCity)}`).then(res => res.json()).then(data => { if (data && data.length > 0) map.setView([data[0].lat, data[0].lon], 12); else tryGeolocation(); }).catch(() => tryGeolocation()); } else { tryGeolocation(); } }, 100);
    };
    document.getElementById('btn-open-map')?.addEventListener('click', () => { calendarOverlay.style.display = 'block'; document.getElementById('map-modal').classList.add('active'); setTimeout(() => initMap(), 300); });
    const closeMap = () => { document.getElementById('map-modal').classList.remove('active'); setTimeout(() => calendarOverlay.style.display = 'none', 300); }; 
    document.getElementById('btn-close-map')?.addEventListener('click', closeMap); document.getElementById('btn-confirm-map')?.addEventListener('click', closeMap);

    const resetAiFlow = () => { 
        currentAiStep = 1; aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`; btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true; 
        for(let i=1; i<=totalAiSteps; i++) {
            const stepEl = document.getElementById(`ai-step-${i}`);
            if(stepEl) stepEl.className = i===1 ? 'ai-step active' : 'ai-step'; 
        }
        aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, styles: [], myStyles: [], ptStyles: [], stamina: 3 }; 
        aiStartDate = null; aiEndDate = null; updateDateTexts(); 
        document.getElementById('ai-input-dest').value = ''; document.getElementById('ai-input-arr-time').value = ''; document.getElementById('ai-input-dep-time').value = ''; document.getElementById('ai-input-accom').value = ''; document.getElementById('people-count').innerText = '1명'; 
        
        document.getElementById('ai-input-stamina').value = 3; 
        document.getElementById('stamina-emoji').innerHTML = '<span class="material-symbols-rounded" style="font-size: 48px; color: #10B981; transition: color 0.3s ease;">battery_5_bar</span>';
        
        document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); 
        document.querySelectorAll('.ai-chip').forEach(c => c.classList.remove('selected')); 
        
        if(aiMode === 'standard') { document.getElementById('step-7-standard').style.display = 'block'; document.getElementById('step-7-tension').style.display = 'none'; } 
        else { document.getElementById('step-7-standard').style.display = 'none'; document.getElementById('step-7-tension').style.display = 'block'; }
    };
    
    const validateAiStep = () => { 
        if(!btnAiNext) return; 
        if(currentAiStep === 1) btnAiNext.disabled = document.getElementById('ai-input-dest').value.trim() === ''; 
        else if(currentAiStep === 2) btnAiNext.disabled = !(aiStartDate && aiEndDate); 
        else if(currentAiStep === 3 || currentAiStep === 4) btnAiNext.disabled = false; 
        else if(currentAiStep === 5) btnAiNext.disabled = aiData.companion === ''; 
        else if(currentAiStep === 6) btnAiNext.disabled = false; 
        else if(currentAiStep === 7) {
            if(aiMode === 'standard') btnAiNext.disabled = aiData.styles.length === 0;
            else btnAiNext.disabled = (aiData.myStyles.length === 0 || aiData.ptStyles.length === 0);
        }
        else if(currentAiStep === 8) btnAiNext.disabled = false;
    };
    
    document.getElementById('ai-input-dest')?.addEventListener('input', validateAiStep);
    
    document.querySelectorAll('.ai-option-card').forEach(card => { 
        card.addEventListener('click', () => { 
            document.querySelectorAll('.ai-option-card').forEach(c => c.classList.remove('selected')); card.classList.add('selected'); aiData.companion = card.getAttribute('data-val'); validateAiStep(); 
        }); 
    });
    
    document.getElementById('btn-minus-people')?.addEventListener('click', () => { if(aiData.people > 1) { aiData.people--; document.getElementById('people-count').innerText = `${aiData.people}명`; }}); 
    document.getElementById('btn-plus-people')?.addEventListener('click', () => { if(aiData.people < 20) { aiData.people++; document.getElementById('people-count').innerText = `${aiData.people}명`; }});

    document.querySelectorAll('.ai-chip').forEach(chip => { 
        chip.addEventListener('click', () => { 
            if(chip.classList.contains('age-chip')) {
                chip.classList.toggle('selected');
            } 
            else if(chip.classList.contains('std-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.styles = aiData.styles.filter(s => s !== val); } 
                else { if(aiData.styles.length >= 3) { alert('최대 3개까지만!'); return; } chip.classList.add('selected'); aiData.styles.push(val); }
            }
            else if(chip.classList.contains('my-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.myStyles = aiData.myStyles.filter(s => s !== val); } 
                else { if(aiData.myStyles.length >= 2) { alert('내 스타일은 2개까지만!'); return; } chip.classList.add('selected'); aiData.myStyles.push(val); }
            }
            else if(chip.classList.contains('pt-chip')) {
                const val = chip.getAttribute('data-val');
                if(chip.classList.contains('selected')) { chip.classList.remove('selected'); aiData.ptStyles = aiData.ptStyles.filter(s => s !== val); } 
                else { if(aiData.ptStyles.length >= 2) { alert('동행자 스타일은 2개까지만!'); return; } chip.classList.add('selected'); aiData.ptStyles.push(val); }
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

    // 🚀 수정됨: 뻗는 버그 완벽 방어 (Try-Catch)
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
                try {
                    aiData.startDate = fm(aiStartDate); aiData.endDate = fm(aiEndDate);
                    document.getElementById('ai-loading-overlay').classList.add('active');
                    
                    setTimeout(() => {
                        try {
                            document.getElementById('ai-loading-overlay').classList.remove('active');
                            generateAiTimeline(); 
                            aiScreen.classList.remove('active');
                        } catch(err) {
                            document.getElementById('ai-loading-overlay').classList.remove('active');
                            console.error(err);
                            alert("앗, 일정 분석 중 오류가 났습니다. 다시 시도해주세요! (" + err.message + ")");
                        }
                    }, 2500);
                } catch(e) {
                    console.error(e);
                    alert("데이터 처리 중 오류가 발생했습니다.");
                }
            }
        });
    }

    // ===================================================================
    // 🚀 4. 알고리즘 로직 & 실제 사진/데이터 렌더링 & Day 연동
    // ===================================================================
    let routeMap = null; 
    let routeLayerGroup = null;
    let movingMarker = null;
    let currentMarkerIndex = -1;
    let currentSelectedDay = 1; 
    let dailyPlans = {}; // 생성된 일정을 담아두는 전역 객체
    let isMapView = false;
    
    // 여행지 데이터베이스 (사진 URL 연동 포함 - Unsplash 리얼 이미지)
    const spotDB = {
        '오사카': {
            tour: [ {n: '유니버셜 스튜디오 재팬', d: '해리포터와 닌텐도 월드는 필수 코스입니다.', img: 'https://images.unsplash.com/photo-1590559899731-a382839cecdf'}, {n: '오사카 성', d: '일본을 대표하는 웅장한 역사 건축물', img: 'https://images.unsplash.com/photo-1590252973167-27e1f4d90ce3'}, {n: '우메다 공중정원', d: '오사카 시내가 한눈에 들어오는 최고의 야경 뷰', img: 'https://images.unsplash.com/photo-1520668611843-7f212d26fdf2'}, {n: '츠텐카쿠 전망대', d: '레트로한 분위기의 신세카이 중심', img: 'https://images.unsplash.com/photo-1590559899731-a382839cecdf'} ],
            food: [ {n: '도톤보리 타코야키', d: '입천장 데여도 포기할 수 없는 겉바속촉', img: 'https://images.unsplash.com/photo-1574484284002-952d92456975'}, {n: '쿠시카츠 다루마', d: '원조 튀김 꼬치와 시원한 생맥주의 조합', img: 'https://images.unsplash.com/photo-1583339824000-60eaeb00f40d'}, {n: '이치란 라멘', d: '한국인 입맛에 가장 잘 맞는 독서실 라멘', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624'} ],
            cafe: [ {n: '나카자키초 카페거리', d: '골목골목 숨겨진 빈티지 감성 카페 탐방', img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24'}, {n: '리버뷰 테라스 카페', d: '강가를 바라보며 마시는 여유로운 커피 한 잔', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93'} ],
            indoor: [ {n: '가이유칸 수족관', d: '고래상어를 볼 수 있는 세계 최대 규모의 수족관', img: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0'}, {n: '파르코 백화점', d: '지브리 스토어와 짱구 샵이 있는 쇼핑 천국', img: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6'} ]
        },
        '파리': {
            tour: [ {n: '에펠탑 피크닉', d: '마르스 광장에서 와인과 함께 즐기는 로맨틱 피크닉', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'}, {n: '몽마르뜨 언덕', d: '예술가들의 숨결이 느껴지는 파리 시내 전경', img: 'https://images.unsplash.com/photo-1549144511-f099e773c147'}, {n: '센 강 유람선', d: '바토무슈를 타고 감상하는 파리의 야경', img: 'https://images.unsplash.com/photo-1509356843151-3e7d96a6443c'} ],
            food: [ {n: '테라스 미슐랭', d: '분위기 좋은 노천 레스토랑에서 즐기는 정찬', img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c'}, {n: '현지 바게트 맛집', d: '갓 구운 크루아상과 바게트 샌드위치', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff'} ],
            cafe: [ {n: '마레지구 테라스 카페', d: '파리지앵처럼 에스프레소 마시기', img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24'}, {n: '파티세리 앙젤리나', d: '꾸덕한 쇼콜라쇼와 몽블랑 디저트', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b'} ],
            indoor: [ {n: '루브르 박물관', d: '모나리자를 비롯한 세계 최고의 예술품들', img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a'}, {n: '오르세 미술관', d: '기차역을 개조한 인상파 화가들의 성지', img: 'https://images.unsplash.com/photo-1580540455581-ea93335b1c55'} ]
        }
    };

    // 대체용 무작위 사진들
    const fallbackImages = {
        tour: ['1527631509225-7e23115584a3', '1552733407-5d5c46c3bb3b', '1506012787146-f92b2d7d6d96', '1519567241046-7f570eee3ce6', '1549144511-f099e773c147'],
        food: ['1504674900247-0877df9cc836', '1550966871-3ed3cdb5ed0c', '1569718212165-3a8278d5f624', '1574484284002-952d92456975', '1583339824000-60eaeb00f40d'],
        cafe: ['1509042239860-f550ce710b93', '1554118811-1e0d58224f24', '1497935586351-b67a49e012bf', '1551024601-bec78aea704b', '1520668611843-7f212d26fdf2'],
        indoor: ['1582967788606-a171c1080cb0', '1519567241046-7f570eee3ce6', '1499856871958-5b9627545d1a', '1580540455581-ea93335b1c55', '1590252973167-27e1f4d90ce3']
    };

    const getSpots = (city, type) => {
        const validCity = city || '여행지';
        const dbCity = Object.keys(spotDB).find(k => validCity.includes(k));
        if(dbCity && spotDB[dbCity][type]) return spotDB[dbCity][type];
        
        // DB에 없으면 유저의 입력값을 바탕으로 그럴싸한 데이터 즉석 생성 (Unsplash 실제 이미지 매핑)
        if(type === 'tour') return [
            {n: `${validCity} 대표 랜드마크`, d: '여행자 필수 방문 코스', img: `https://images.unsplash.com/photo-${fallbackImages.tour[0]}`},
            {n: `${validCity} 야경 뷰포인트`, d: '로맨틱한 밤을 보내는 곳', img: `https://images.unsplash.com/photo-${fallbackImages.tour[1]}`},
            {n: `${validCity} 전통 시장`, d: '현지 느낌 물씬 나는 시장', img: `https://images.unsplash.com/photo-${fallbackImages.tour[2]}`},
            {n: `${validCity} 역사 유적지`, d: '오랜 역사를 간직한 곳', img: `https://images.unsplash.com/photo-${fallbackImages.tour[3]}`}
        ];
        if(type === 'food') return [
            {n: `${validCity} 평점 4.8 로컬 맛집`, d: '현지인들이 더 많이 찾는 숨은 명소', img: `https://images.unsplash.com/photo-${fallbackImages.food[0]}`},
            {n: `${validCity} 현지인 추천 식당`, d: '실패 없는 완벽한 한 끼', img: `https://images.unsplash.com/photo-${fallbackImages.food[1]}`},
            {n: `${validCity} 야시장 먹거리`, d: '다양한 길거리 음식 탐방', img: `https://images.unsplash.com/photo-${fallbackImages.food[2]}`}
        ];
        if(type === 'cafe') return [
            {n: `${validCity} 감성 충만 카페`, d: '조용하고 분위기 좋은 휴식 공간', img: `https://images.unsplash.com/photo-${fallbackImages.cafe[0]}`},
            {n: `${validCity} 뷰 좋은 테라스`, d: '멋진 풍경을 보며 마시는 커피', img: `https://images.unsplash.com/photo-${fallbackImages.cafe[1]}`}
        ];
        if(type === 'indoor') return [
            {n: `${validCity} 대형 쇼핑몰`, d: '기념품과 특산품 쇼핑하기 좋은 곳', img: `https://images.unsplash.com/photo-${fallbackImages.indoor[0]}`},
            {n: `${validCity} 국립 박물관`, d: '도시의 역사와 예술을 한눈에', img: `https://images.unsplash.com/photo-${fallbackImages.indoor[1]}`}
        ];
        
        return [{n: `${validCity} 명소`, d: '즐거운 여행지', img: `https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96`}];
    };

    const generateAiTimeline = () => {
        const resultScreen = document.getElementById('ai-result-screen');
        const dest = aiData.dest || '새로운 여행지';
        const totalDays = 3; // 기본 3일치 고정 생성
        
        // 화면 타이틀 세팅
        document.getElementById('ai-result-title').innerText = `${dest} 일정`;
        let subText = `${aiData.startDate || '미정'} ~ ${aiData.endDate || '미정'} · `;
        if(aiMode === 'standard' && aiData.styles.length > 0) subText += `${aiData.styles[0]} 위주`;
        else if (aiMode === 'tension') subText += `우당탕탕 타협 플랜`;
        else subText += `자유 여행`;
        document.getElementById('ai-result-subtitle').innerText = subText;

        // 탭 세팅
        let tabsHtml = '';
        for(let i=1; i<=totalDays; i++) {
            const activeCls = i === 1 ? 'active' : '';
            tabsHtml += `<div class="day-tab ${activeCls}" data-day="${i}"><div class="d-day">Day ${i}</div><div class="d-date">8.${20+i}</div></div>`;
        }
        document.getElementById('ai-result-tabs').innerHTML = tabsHtml;

        // 유저 취향 태그 분석
        const styleToCat = { '힐링': 'cafe', '먹방': 'food', '관광': 'tour', '쇼핑': 'indoor', '액티비티': 'tour', '자연': 'tour', '예술': 'indoor', '호캉스': 'cafe' };
        const allTags = aiMode === 'standard' ? aiData.styles : [...aiData.myStyles, ...aiData.ptStyles];
        const userPrefs = allTags.map(s => {
            const cleanStyle = s.replace('나: ', '').replace('동행: ', '');
            return styleToCat[cleanStyle] || 'tour';
        });

        // Day별 일정 데이터 뼈대 만들기
        dailyPlans = {};
        for(let d=1; d<=totalDays; d++) {
            let hpPercent = 50; let scheduleTemplate = [];
            if(aiData.stamina == 1 || aiData.stamina == 2) {
                hpPercent = 90; // 저질체력 소모도 높음 (느긋한 일정)
                scheduleTemplate = [ {time: '11:00', type: 'food', text: '느지막히 일어나 든든한 아점'}, {time: '13:00', type: userPrefs[0] || 'tour', text: '메인 목적지 한 곳만 가볍게 탐방'}, {time: '15:30', type: 'cafe', text: '체력이 떨어졌으니 긴 휴식'}, {time: '18:00', type: 'food', text: '저녁 식사 및 숙소 복귀'} ];
            } else if(aiData.stamina == 3) {
                hpPercent = 65; // 보통 체력
                scheduleTemplate = [ {time: '10:00', type: userPrefs[0] || 'tour', text: '활기찬 오전 관광'}, {time: '12:30', type: 'food', text: '점심 식사'}, {time: '14:00', type: userPrefs[1] || 'tour', text: '오후 메인 투어'}, {time: '16:30', type: 'cafe', text: '당 충전 및 휴식'}, {time: '18:30', type: 'food', text: '저녁 식사'} ];
            } else {
                hpPercent = 30; // 강철체력 (타이트한 일정)
                scheduleTemplate = [ {time: '09:00', type: userPrefs[0] || 'tour', text: '눈 뜨자마자 아침 투어 시작'}, {time: '11:30', type: userPrefs[1] || 'tour', text: '랜드마크 도장 깨기'}, {time: '13:30', type: 'food', text: '늦은 점심'}, {time: '15:00', type: userPrefs[2] || 'indoor', text: '폭풍 쇼핑 및 실내 관광'}, {time: '18:00', type: 'food', text: '저녁 식사'}, {time: '20:00', type: 'tour', text: '지치지 않는 야경 투어 추가'} ];
            }

            let daySpots = [];
            scheduleTemplate.forEach(slot => {
                const spots = getSpots(dest, slot.type);
                const randomSpot = spots[Math.floor(Math.random() * spots.length)];
                
                let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9'; let catName = '이동';
                if(slot.type === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; catName = '식사'; }
                if(slot.type === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; catName = '관광'; }
                if(slot.type === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; catName = '휴식'; }
                if(slot.type === 'indoor') { iconColor = '#10B981'; iconBg = 'rgba(16,185,129,0.1)'; catName = '실내'; }

                let survivalTip = '';
                if(slot.type === 'food' && Math.random() > 0.4) survivalTip = `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">lightbulb</span><span class="tip-text">꿀팁: 영어가 안 통할 수 있으니 파파고 번역기를 켜두세요!</span></div>`;
                if(slot.type === 'tour' && Math.random() > 0.4) survivalTip = `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">photo_camera</span><span class="tip-text">꿀팁: 해 질 녘(일몰) 시간에 맞춰 가면 예쁜 인생샷이 나옵니다.</span></div>`;

                daySpots.push({ time: slot.time, type: slot.type, catName: catName, name: randomSpot.n, desc: slot.text, img: randomSpot.img, color: iconColor, bg: iconBg, tip: survivalTip });
            });
            dailyPlans[d] = { hp: hpPercent, spots: daySpots };
        }

        // 🚀 특정 Day 렌더링 함수
        const renderDayPlan = (day, isPlanB) => {
            currentSelectedDay = day;
            const plan = dailyPlans[day];
            
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
                if(isPlanB && spot.type === 'tour') currentCat = '실내 대체'; // 우천시 텍스트 변경
                
                let imgHtml = spot.img ? `<div class="tc-img" style="background-image: url('${spot.img}?q=80&w=400&auto=format&fit=crop');"></div>` : '';

                timelineHtml += `
                <div class="timeline-item">
                    <div class="timeline-time">${spot.time}</div>
                    <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                    <div class="timeline-card">
                        <div class="timeline-card-header"><h3 class="tc-title">${spot.name}</h3><span class="tc-category" style="color:${spot.color}; background:${spot.bg};">${currentCat}</span></div>
                        <p class="tc-desc">${spot.desc}</p>
                        ${imgHtml}
                        ${spot.tip}
                    </div>
                </div>`;
            });
            document.getElementById('ai-timeline-container').innerHTML = timelineHtml;
            
            document.getElementById('btn-plan-a')?.addEventListener('click', () => { if(isPlanB) renderDayPlan(day, false); });
            document.getElementById('btn-plan-b')?.addEventListener('click', () => { if(!isPlanB) { alert('☔ 비 오는 날 맞춤 실내 일정으로 전면 수정됩니다!'); renderDayPlan(day, true); }});
            
            // 지도를 켜둔 상태라면 마커 다시 그리기
            if(isMapView && routeMap) {
                drawRoute(routeMap.getCenter().lat, routeMap.getCenter().lng, plan.spots);
            }
        };

        // 초기 렌더링
        renderDayPlan(1, false);

        // 🚀 상단 Day 탭 클릭 시 이벤트 연동
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const dayNum = parseInt(tab.getAttribute('data-day'));
                renderDayPlan(dayNum, false);
            });
        });

        // 지도 렌더링
        if(!routeMap) {
            routeMap = L.map('ai-result-map', { zoomControl: false }).setView([37.5665, 126.9780], 13);
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko').addTo(routeMap);
            routeLayerGroup = L.layerGroup().addTo(routeMap);
        }

        if(dest !== '새로운 여행지') {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest)}`)
            .then(res => res.json()).then(data => {
                if(data && data.length > 0) {
                    routeMap.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
                }
            }).catch(()=>{});
        }

        // 상태 초기화
        isMapView = false; currentMarkerIndex = -1;
        document.getElementById('ai-timeline-container').style.display = 'flex';
        document.getElementById('ai-explore-container').style.display = 'none';
        document.getElementById('ai-result-map').style.display = 'none';
        document.getElementById('top-map-icon').innerText = 'map';
        document.getElementById('map-info-card').classList.remove('active');
        
        document.querySelectorAll('.explore-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.explore-chip[data-type="timeline"]')?.classList.add('active');

        resultScreen.classList.add('active');
    };

    // 🚀 뒤로가기 클릭 시 경고 팝업 (저장 유도)
    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { 
        if(confirm("저장하지 않고 홈 화면으로 돌아가시겠습니까?\n작성된 일정은 모두 사라집니다.")) {
            document.getElementById('ai-result-screen').classList.remove('active'); 
        }
    });

    // 🚀 애니메이션 (자동차/사람 마커 이동)
    const animateMovement = (startLatLng, endLatLng, iconHtml, duration, callback) => {
        if(movingMarker) routeMap.removeLayer(movingMarker);
        const icon = L.divIcon({ className: 'moving-transport', html: iconHtml, iconSize: [36, 36], iconAnchor: [18, 18] });
        movingMarker = L.marker(startLatLng, {icon, zIndexOffset: 1000}).addTo(routeMap);

        const startTime = performance.now();
        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const lat = startLatLng[0] + (endLatLng[0] - startLatLng[0]) * ease;
            const lng = startLatLng[1] + (endLatLng[1] - startLatLng[1]) * ease;
            movingMarker.setLatLng([lat, lng]);

            if(progress < 1) requestAnimationFrame(animate);
            else {
                routeMap.removeLayer(movingMarker); movingMarker = null;
                if(callback) callback();
            }
        };
        requestAnimationFrame(animate);
    };

    const drawRoute = (lat, lng, daySpots) => {
        routeLayerGroup.clearLayers();
        currentMarkerIndex = -1;
        document.getElementById('map-info-card').classList.remove('active');

        if(!daySpots) daySpots = dailyPlans[currentSelectedDay].spots;

        const pointOffsets = [ [0.005, -0.005], [0.015, 0.002], [-0.002, 0.015], [-0.010, -0.008], [-0.015, 0.005], [0.01, -0.015] ];
        const points = daySpots.map((_, i) => [lat + pointOffsets[i%6][0], lng + pointOffsets[i%6][1]]);
        
        const polyline = L.polyline(points, {color: '#8B5CF6', weight: 4, dashArray: '8, 8'}).addTo(routeLayerGroup);
        
        points.forEach((p, index) => {
            const icon = L.divIcon({ className: 'custom-route-marker', html: `<div>${index + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
            const marker = L.marker(p, {icon}).addTo(routeLayerGroup);

            marker.on('click', () => {
                const infoCard = document.getElementById('map-info-card');
                infoCard.classList.remove('active');

                const showCard = () => {
                    const spot = daySpots[index];
                    document.getElementById('map-info-title').innerText = spot.name;
                    document.getElementById('map-info-desc').innerText = spot.desc;
                    document.getElementById('map-info-badge').innerText = spot.catName;
                    
                    let bgImg = spot.img || 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b';
                    document.getElementById('map-info-img').style.backgroundImage = `url('${bgImg}?q=80&w=200&auto=format&fit=crop')`;
                    
                    routeMap.flyTo([p[0] - 0.005, p[1]], 14, {duration: 0.5});
                    setTimeout(() => infoCard.classList.add('active'), 300);
                };

                if (index > 0 && currentMarkerIndex < index) {
                    // 🚀 예쁜 머티리얼 아이콘으로 자동차/사람 이동 애니메이션
                    const transportIcon = Math.random() > 0.5 ? '<span class="material-symbols-rounded" style="color:#2563EB; font-size:24px;">directions_car</span>' : '<span class="material-symbols-rounded" style="color:#10B981; font-size:24px;">directions_walk</span>';
                    animateMovement(points[index-1], p, transportIcon, 1200, showCard);
                } else {
                    showCard();
                }
                currentMarkerIndex = index;
            });
        });
        routeMap.fitBounds(polyline.getBounds(), {padding: [50, 50]});
    };

    // 우측 상단 지도 토글
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
                setTimeout(() => routeMap.invalidateSize(), 100);
                drawRoute(routeMap.getCenter().lat, routeMap.getCenter().lng, dailyPlans[currentSelectedDay].spots);
            }
        } else {
            const activeTab = document.querySelector('.explore-chip.active')?.getAttribute('data-type') || 'timeline';
            if(activeTab === 'timeline') timelineContainer.style.display = 'flex'; else exploreContainer.style.display = 'flex';
            resultMap.style.display = 'none'; mapIcon.innerText = 'map'; 
            document.getElementById('map-info-card').classList.remove('active');
        }
    });

    // 🚀 탐색 카테고리 칩 (실제 사진 연동 및 내용 잘림 완벽 방지)
    document.querySelectorAll('.explore-chip').forEach(chip => {
        chip.addEventListener('click', () => {
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
                
                const spots = getSpots(aiData.dest || '도시', type);
                let html = '';
                
                spots.forEach((spot, i) => {
                    let imgUrl = spot.img || `https://images.unsplash.com/photo-${fallbackImages.tour[0]}`;
                    let spotName = spot.n || spot;
                    let spotDesc = spot.d || '멋진 여행지입니다.';
                    
                    html += `
                    <div class="explore-card">
                        <div class="explore-card-img" style="background-image: url('${imgUrl}?q=80&w=200&auto=format&fit=crop');"></div>
                        <div class="explore-card-info">
                            <div class="explore-card-title">${spotName}</div>
                            <div class="explore-card-sub">별점 4.${8-i} · ${spotDesc}</div>
                            <button class="explore-add-btn ripple-btn" onclick="alert('내 일정에 추가되었습니다! 😆')">+ 내 일정에 추가/교체</button>
                        </div>
                    </div>`;
                });
                exploreContainer.innerHTML = html;
            }
        });
    });

    const navHome = document.getElementById('nav-home'); 
    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
});