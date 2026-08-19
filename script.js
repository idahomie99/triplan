import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. 스플래시 화면
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
        const rippleBtns = document.querySelectorAll('.ripple-btn, .small-ripple-btn, .main-action-card, .rec-list-item');
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
    document.getElementById('btn-logout')?.addEventListener('click', () => { if(confirm("정말 로그아웃 하시겠습니까?")) signOut(auth).then(() => alert("성공적으로 로그아웃 되었습니다.")); });

    // 2. 서브 화면 (항공권, 숙소) 닫기 전용
    const btnBackFlight = document.getElementById('btn-back-flight');
    if (btnBackFlight) btnBackFlight.addEventListener('click', () => document.getElementById('flight-screen').classList.remove('active'));
    const btnBackHotel = document.getElementById('btn-back-hotel');
    if (btnBackHotel) btnBackHotel.addEventListener('click', () => document.getElementById('hotel-screen').classList.remove('active'));

    // 3. 달력 공용 로직 
    let aiStartDate = null; let aiEndDate = null;
    const fm = (d) => `${d.getMonth()+1}.${d.getDate()}`;
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

    // 🚀 4. AI 일정 생성기 
    let aiMode = 'standard'; 
    const aiScreen = document.getElementById('ai-screen'); 
    
    document.getElementById('btn-ai-standard')?.addEventListener('click', () => { aiMode = 'standard'; aiScreen.classList.add('active'); resetAiFlow(); });
    document.getElementById('btn-ai-tension')?.addEventListener('click', () => { aiMode = 'tension'; aiScreen.classList.add('active'); resetAiFlow(); });
    document.getElementById('btn-back-ai')?.addEventListener('click', () => aiScreen.classList.remove('active'));

    let currentAiStep = 1; const totalAiSteps = 8;
    const aiProgressBar = document.getElementById('ai-progress-bar'); const btnAiNext = document.getElementById('btn-ai-next');
    let aiData = { dest: '', startDate: null, endDate: null, arrTime: '', depTime: '', accom: '', companion: '', people: 1, styles: [], myStyles: [], ptStyles: [], stamina: 3 };

    // 무료 지도 (GPS 연동)
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
        document.getElementById('ai-input-stamina').value = 3; document.getElementById('stamina-emoji').innerText = '🔋';
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
            if(aiData.stamina == 1) staminaEmoji.innerText = '🪫';
            else if(aiData.stamina == 5) staminaEmoji.innerText = '🏃‍♂️';
            else staminaEmoji.innerText = '🔋';
        });
    }

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
                    generateAiTimeline(); 
                    aiScreen.classList.remove('active');
                }, 2500);
            }
        });
    }

    // 🚀 5. 대망의 타임라인 생성
    const generateAiTimeline = () => {
        const resultScreen = document.getElementById('ai-result-screen');
        document.getElementById('ai-result-title').innerText = `${aiData.dest} 일정`;
        
        let subText = `${aiData.startDate} ~ ${aiData.endDate} · `;
        if(aiMode === 'standard') subText += `${aiData.styles[0]} 위주`;
        else subText += `우당탕탕 타협 플랜`;
        document.getElementById('ai-result-subtitle').innerText = subText;

        let tabsHtml = '';
        for(let i=1; i<=3; i++) {
            const activeCls = i === 1 ? 'active' : '';
            tabsHtml += `<div class="date-tab ${activeCls}"><span class="d-date">Day ${i}</span><span class="d-price" style="font-size:14px; font-weight:800;">8.${20+i}</span></div>`;
        }
        document.getElementById('ai-result-tabs').innerHTML = tabsHtml;

        let hpPercent = 60;
        if(aiData.stamina == 1) hpPercent = 95; 
        if(aiData.stamina == 5) hpPercent = 30; 

        const timelineHtml = `
            <div class="plan-b-toggle">
                <div class="plan-b-btn active">☀️ 기본 일정</div>
                <div class="plan-b-btn">☔ 비 올 때 (플랜 B)</div>
                <div class="plan-b-bg"></div>
            </div>

            <div class="hp-bar-container">
                <div class="hp-title"><span>오늘의 예상 체력 소모</span><span>${hpPercent}%</span></div>
                <div class="hp-track"><div class="hp-fill" style="width: ${hpPercent}%;"></div></div>
                <p style="font-size:11px; color:var(--text-sub); margin-top:8px; font-weight:600;">
                    ${hpPercent > 80 ? '⚠️ 일정이 빡셉니다. 중간중간 달달한 당 충전이 필수입니다!' : '✨ 여유로운 페이스로 산책하기 딱 좋은 일정입니다.'}
                </p>
            </div>

            <div class="timeline-item">
                <div class="timeline-time">10:00</div>
                <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <div class="timeline-card">
                    <div class="timeline-card-header"><h3 class="tc-title">여유로운 출발</h3><span class="tc-category" style="color:#64748B; background:#F1F5F9;">이동</span></div>
                    <p class="tc-desc">${aiData.accom || '숙소'}에서 나갈 채비를 하고, 근처에서 가볍게 커피를 마십니다.</p>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="timeline-time">11:30</div>
                <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <div class="timeline-card">
                    <div class="timeline-card-header"><h3 class="tc-title">로컬 감성 식당</h3><span class="tc-category" style="color:#DC2626; background:rgba(220,38,38,0.1);">식사</span></div>
                    <p class="tc-desc">현지인들이 줄 서서 먹는 평점 4.5 찐 맛집에서 점심을 해결합니다.</p>
                    
                    <div class="survival-tip">
                        <span class="material-symbols-rounded tip-icon">lightbulb</span>
                        <span class="tip-text">현지어 꿀팁: 고수를 못 드신다면 주문할 때 꼭 "부야오 샹차이(不要香菜)"라고 말해보세요!</span>
                    </div>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="timeline-time">13:30</div>
                <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <div class="timeline-card">
                    <div class="timeline-card-header"><h3 class="tc-title">${aiData.dest} 핵심 랜드마크</h3><span class="tc-category">관광</span></div>
                    <p class="tc-desc">${aiData.dest}에서 무조건 가야 하는 핫플레이스! 인생샷을 남겨보세요.</p>
                    <div class="tc-img" style="background-image: url('https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?q=80&w=400&auto=format&fit=crop');"></div>
                    
                    <div class="survival-tip">
                        <span class="material-symbols-rounded tip-icon">lightbulb</span>
                        <span class="tip-text">사진 꿀팁: 오후 2시쯤엔 역광이니 입구 반대편 조각상 앞에서 찍는 게 훨씬 예쁩니다.</span>
                    </div>
                </div>
            </div>

            <div class="timeline-item">
                <div class="timeline-time">16:00</div>
                <div class="timeline-line-container"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
                <div class="timeline-card">
                    <div class="timeline-card-header"><h3 class="tc-title">휴식 및 텐션 조율</h3><span class="tc-category" style="color:#F59E0B; background:rgba(245,158,11,0.1);">휴식</span></div>
                    <p class="tc-desc">다리가 아파올 타이밍입니다. 감성 카페에서 시원한 아메리카노로 HP를 회복하세요.</p>
                </div>
            </div>
        `;
        document.getElementById('ai-timeline-container').innerHTML = timelineHtml;
        resultScreen.classList.add('active');

        const planBtns = document.querySelectorAll('.plan-b-btn');
        const planBg = document.querySelector('.plan-b-bg');
        planBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                planBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if(index === 0) planBg.style.transform = 'translateX(0)';
                else planBg.style.transform = 'translateX(100%)';
                if(index === 1) setTimeout(() => alert('비가 오네요! 미술관과 쇼핑몰 중심의 실내 일정으로 동선을 전면 수정합니다 ☔'), 300);
            });
        });
    };

    document.getElementById('btn-back-ai-result')?.addEventListener('click', () => { document.getElementById('ai-result-screen').classList.remove('active'); });
    const navHome = document.getElementById('nav-home'); 
    if(navHome) navHome.addEventListener('click', () => { navHome.classList.add('active'); if(btnAccount) btnAccount.classList.remove('active'); });
});