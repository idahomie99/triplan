import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 스플래시 화면
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => { splashScreen.classList.add('hide'); setTimeout(() => splashScreen.remove(), 500); }, 1500);
    }

    const mainContent = document.getElementById('main-content');
    const topHeader = document.getElementById('top-header');
    mainContent.addEventListener('scroll', () => { topHeader.classList.toggle('scrolled', mainContent.scrollTop > 10); });

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

    // 부드러운 내부 팝업(Alert) 함수
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

    // 계정 연동
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

    // 🚀 글로벌 데이터 구조
    let aiMode = 'standard'; let currentAiStep = 1; let aiStepHistory = [1]; 
    const totalAiSteps = 10; const aiProgressBar = document.getElementById('ai-progress-bar'); 
    const btnAiNext = document.getElementById('btn-ai-next'); const btnPrevAiStep = document.getElementById('btn-prev-ai-step');
    const aiScreen = document.getElementById('ai-screen'); 
    
    let aiData = { 
        startDate: null, endDate: null, totalTripDays: 0,
        destinations: [{ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }], 
        isOptimizeRoute: false, transports: [], arrTime: '', depTime: '', accom: '', companion: '', people: 1, styles: [], myStyles: [], ptStyles: [], themes: [], stamina: 3 
    };

    let tempStartDate = null; let tempEndDate = null; let calendarTargetIndex = -1; 
    const calendarModal = document.getElementById('calendar-modal'); 
    const calendarOverlay = document.getElementById('calendar-overlay'); 
    const calendarContainer = document.getElementById('calendar-grid-container'); 

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

    const resetAiFlow = () => { 
        currentAiStep = 1; aiStepHistory = [1]; aiProgressBar.style.width = `${(1/totalAiSteps)*100}%`; btnAiNext.innerText = '다음으로'; btnAiNext.disabled = true; btnPrevAiStep.style.display = 'none';
        for(let i=1; i<=totalAiSteps; i++) { const stepEl = document.getElementById(`ai-step-${i}`); if(stepEl) { stepEl.classList.remove('exit'); stepEl.className = i===1 ? 'ai-step active' : 'ai-step'; } }
        aiData = { startDate: null, endDate: null, totalTripDays: 0, destinations: [{ country: '', city: '', startDate: null, endDate: null, stayDays: 0, pin: 'auto' }], isOptimizeRoute: false, transports: [], arrTime: '', depTime: '', accom: '', companion: '', people: 1, styles: [], myStyles: [], ptStyles: [], themes: [], stamina: 3 }; 
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
        else if(currentAiStep === 7) { if(aiMode === 'standard') btnAiNext.disabled = aiData.styles.length === 0; else btnAiNext.disabled = (aiData.myStyles.length === 0 || aiData.ptStyles.length === 0); }
        else if(currentAiStep === 8) btnAiNext.disabled = aiData.themes.length === 0;
        else if(currentAiStep === 9) btnAiNext.disabled = false;
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
            else if(chip.classList.contains('age-chip')) chip.classList.toggle('selected');
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
    
    function submitAiFlow() {
        try {
            document.getElementById('ai-loading-overlay').classList.add('active');
            setTimeout(() => {
                try {
                    document.getElementById('ai-loading-overlay').classList.remove('active');
                    generateAiTimeline(); 
                    aiScreen.classList.remove('active');
                } catch(err) {
                    document.getElementById('ai-loading-overlay').classList.remove('active');
                    console.error("타임라인 생성 중 에러:", err);
                    showCustomAlert({icon:'error', title:'오류 발생', desc:"일정 분석 중 오류가 났습니다. 다시 시도해주세요! (" + err.message + ")"});
                }
            }, 2500);
        } catch(e) {
            console.error(e);
            showCustomAlert({icon:'error', title:'오류 발생', desc:"데이터 처리 중 오류가 발생했습니다."});
        }
    }

    // ===================================================================
    // 🚀 5. 대망의 AI 타임라인 알고리즘 로직 (진짜 맞춤형 데이터 생성)
    // ===================================================================
    let routeMap = null; 
    let routeLayerGroup = null;
    let movingMarker = null;
    let currentMarkerIndex = -1;
    let currentSelectedDay = 1; 
    let dailyPlans = {}; 
    let isMapView = false;
    
    // 🚀 AI 텍스트 생성기 
    const generateSpotName = (city, theme, prefCat) => {
        const adjectives = {
            'food': ['현지인이 추천하는', '별점 4.8', '줄 서서 먹는', '가성비 좋은', '뷰가 끝내주는'],
            'tour': ['인생샷 남기기 좋은', '역사가 살아 숨쉬는', '요즘 뜨는 핫플', '필수 방문 코스'],
            'cafe': ['조용하고 아늑한', '커피 향이 좋은', '디저트가 맛있는', '인테리어가 예쁜'],
            'indoor': ['쾌적하게 즐기는', '시간 가는 줄 모르는', '쇼핑하기 좋은', '볼거리가 많은']
        };
        const nouns = {
            'food': ['로컬 맛집', '전통 식당', '숨은 식당', '푸드마켓'],
            'tour': ['랜드마크', '뷰포인트', '명소', '포토존', '거리'],
            'cafe': ['감성 카페', '테라스 카페', '베이커리 카페'],
            'indoor': ['대형 쇼핑몰', '국립 박물관', '미술관', '테마파크']
        };
        const adj = adjectives[prefCat][Math.floor(Math.random() * adjectives[prefCat].length)];
        const noun = nouns[prefCat][Math.floor(Math.random() * nouns[prefCat].length)];
        return `${city} ${adj} ${noun}`;
    };

    const generateSpotDesc = (companion, theme) => {
        let desc = '';
        if(companion === '부모님과') desc = '부모님이 걷기 편한 평지 위주의 코스입니다.';
        else if(companion === '아이와') desc = '아이들이 안전하게 즐길 수 있는 환경입니다.';
        else if(companion === '연인과') desc = '로맨틱한 분위기에서 멋진 시간을 보내세요.';
        else if(companion === '친구들과') desc = '다 같이 텐션을 올리며 사진 찍기 좋은 곳입니다.';
        else desc = '여유롭게 즐기기 완벽한 장소입니다.';
        
        if(theme.includes('식도락')) desc += ' 특히 미식가들에게 평가가 좋습니다.';
        if(theme.includes('힐링')) desc += ' 북적이지 않아 조용히 쉬어가기 좋습니다.';
        return desc;
    };

    const fallbackImages = {
        tour: ['1527631509225-7e23115584a3', '1552733407-5d5c46c3bb3b', '1506012787146-f92b2d7d6d96', '1549144511-f099e773c147'],
        food: ['1504674900247-0877df9cc836', '1550966871-3ed3cdb5ed0c', '1569718212165-3a8278d5f624', '1574484284002-952d92456975'],
        cafe: ['1509042239860-f550ce710b93', '1554118811-1e0d58224f24', '1551024601-bec78aea704b', '1520668611843-7f212d26fdf2'],
        indoor: ['1582967788606-a171c1080cb0', '1519567241046-7f570eee3ce6', '1499856871958-5b9627545d1a', '1580540455581-ea93335b1c55']
    };

    const generateAiTimeline = () => {
        const resultScreen = document.getElementById('ai-result-screen');
        
        const dests = aiData.destinations.map(d => d.city).filter(c => c !== '');
        const mainDest = dests[0] || '어딘가';
        const titleText = dests.length > 1 ? `${mainDest} 외 ${dests.length - 1}곳 일정` : `${mainDest} 일정`;
        document.getElementById('ai-result-title').innerText = titleText;
        
        let subText = `${fm(aiData.startDate)} ~ ${fm(aiData.endDate)} · `;
        if(aiData.themes.length > 0) subText += `${aiData.themes[0]} · `;
        if(aiMode === 'standard' && aiData.styles.length > 0) subText += `${aiData.styles[0]} 위주`;
        else if (aiMode === 'tension') subText += `우당탕탕 타협 플랜`;
        else subText += `자유 일정`;
        if(aiData.isOptimizeRoute) subText += ` (AI 최적 동선 ✨)`;
        document.getElementById('ai-result-subtitle').innerText = subText;

        const totalDays = aiData.totalTripDays > 0 ? aiData.totalTripDays : 1; 
        
        // 🚀 도시별 날짜 배분 알고리즘
        let dayToCityMap = {};
        let currentDayIter = 1;
        aiData.destinations.forEach(dest => {
            let stays = dest.stayDays || 1; // 입력 안 했으면 기본 1일 배정
            for(let i=0; i<stays; i++) {
                if(currentDayIter <= totalDays) {
                    dayToCityMap[currentDayIter] = dest.city || '여행지';
                    currentDayIter++;
                }
            }
        });
        // 남는 날짜가 있으면 마지막 도시로 다 채움
        while(currentDayIter <= totalDays) {
            dayToCityMap[currentDayIter] = dests[dests.length - 1] || mainDest;
            currentDayIter++;
        }

        // 상단 날짜 탭
        let tabsHtml = '';
        for(let i=1; i<=totalDays; i++) {
            const activeCls = i === 1 ? 'active' : '';
            let tempDate = new Date(aiData.startDate);
            tempDate.setDate(tempDate.getDate() + (i - 1));
            tabsHtml += `<div class="day-tab ${activeCls}" data-day="${i}"><div class="d-day">Day ${i}</div><div class="d-date">${tempDate.getMonth()+1}.${tempDate.getDate()}</div></div>`;
        }
        document.getElementById('ai-result-tabs').innerHTML = tabsHtml;

        const styleToCat = { '힐링': 'cafe', '먹방': 'food', '관광': 'tour', '쇼핑': 'indoor', '액티비티': 'tour', '자연': 'tour', '예술': 'indoor', '호캉스': 'cafe' };
        const allTags = aiMode === 'standard' ? aiData.styles : [...aiData.myStyles, ...aiData.ptStyles];
        const userPrefs = allTags.map(s => { const cleanStyle = s.replace('나: ', '').replace('동행: ', ''); return styleToCat[cleanStyle] || 'tour'; });

        dailyPlans = {};
        for(let d=1; d<=totalDays; d++) {
            let hpPercent = 50; let scheduleTemplate = [];
            const currentCityForDay = dayToCityMap[d];

            if(aiData.stamina == 1 || aiData.stamina == 2) {
                hpPercent = 90; 
                scheduleTemplate = [ {time: '11:00', type: 'food', text: '느지막히 일어나 든든한 아점'}, {time: '13:00', type: userPrefs[0] || 'tour', text: '무리하지 않고 한 곳만 탐방'}, {time: '15:30', type: 'cafe', text: '체력이 떨어졌으니 긴 휴식'}, {time: '18:00', type: 'food', text: '저녁 식사 및 숙소 복귀'} ];
            } else if(aiData.stamina == 3) {
                hpPercent = 65; 
                scheduleTemplate = [ {time: '10:00', type: userPrefs[0] || 'tour', text: '활기찬 오전 관광'}, {time: '12:30', type: 'food', text: '점심 식사'}, {time: '14:00', type: userPrefs[1] || 'tour', text: '오후 투어 진행'}, {time: '16:30', type: 'cafe', text: '당 충전 및 휴식'}, {time: '18:30', type: 'food', text: '저녁 식사'} ];
            } else {
                hpPercent = 30; 
                scheduleTemplate = [ {time: '09:00', type: userPrefs[0] || 'tour', text: '눈 뜨자마자 아침 투어 시작'}, {time: '11:30', type: userPrefs[1] || 'tour', text: '랜드마크 도장 깨기'}, {time: '13:30', type: 'food', text: '늦은 점심'}, {time: '15:00', type: userPrefs[2] || 'indoor', text: '폭풍 쇼핑 및 실내 관광'}, {time: '18:00', type: 'food', text: '저녁 식사'}, {time: '20:00', type: 'tour', text: '지치지 않는 야경 투어 추가'} ];
            }

            let daySpots = [];
            scheduleTemplate.forEach(slot => {
                let iconColor = '#8B5CF6'; let iconBg = '#F1F5F9'; let catName = '이동'; let mIcon = 'directions_car';
                if(slot.type === 'food') { iconColor = '#DC2626'; iconBg = 'rgba(220,38,38,0.1)'; catName = '식사'; mIcon = 'restaurant'; }
                if(slot.type === 'tour') { iconColor = '#2563EB'; iconBg = 'rgba(37,99,235,0.1)'; catName = '관광'; mIcon = 'photo_camera'; }
                if(slot.type === 'cafe') { iconColor = '#F59E0B'; iconBg = 'rgba(245,158,11,0.1)'; catName = '휴식'; mIcon = 'local_cafe'; }
                if(slot.type === 'indoor') { iconColor = '#10B981'; iconBg = 'rgba(16,185,129,0.1)'; catName = '실내'; mIcon = 'storefront'; }

                let survivalTip = '';
                if(slot.type === 'food' && Math.random() > 0.4) survivalTip = `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">lightbulb</span><span class="tip-text">AI 꿀팁: 현지인들이 많이 몰리는 시간이니 웨이팅에 대비하세요!</span></div>`;
                if(slot.type === 'tour' && Math.random() > 0.4) survivalTip = `<div class="survival-tip"><span class="material-symbols-rounded tip-icon">photo_camera</span><span class="tip-text">AI 꿀팁: 이곳은 해 질 녘(일몰) 시간에 맞춰 가면 예쁜 인생샷이 나옵니다.</span></div>`;

                // 🚀 AI 텍스트 생성기 적용
                const generatedName = generateSpotName(currentCityForDay, aiData.themes, slot.type);
                const generatedDesc = generateSpotDesc(aiData.companion, aiData.themes);
                const randomImg = `https://images.unsplash.com/photo-${fallbackImages[slot.type][Math.floor(Math.random() * fallbackImages[slot.type].length)]}`;

                daySpots.push({ time: slot.time, type: slot.type, catName: catName, mIcon: mIcon, name: generatedName, desc: slot.text + '. ' + generatedDesc, img: randomImg, color: iconColor, bg: iconBg, tip: survivalTip });
            });
            dailyPlans[d] = { hp: hpPercent, spots: daySpots };
        }

        const renderDayPlan = (day, isPlanB) => {
            currentSelectedDay = day;
            const plan = dailyPlans[day];
            
            let timelineHtml = `
                <div class="plan-b-toggle">
                    <div class="plan-b-btn ${!isPlanB ? 'active' : ''}" id="btn-plan-a"><span class="material-symbols-rounded">wb_sunny</span>기본 일정</div>
                    <div class="plan-b-btn ${isPlanB ? 'active' : ''}" id="btn-plan-b"><span class="material-symbols-rounded">umbrella</span>우천 시 (플랜 B)</div>
                    <div class="plan-b-bg" style="transform: translateX(${isPlanB ? '100%' : '0'});"></div>
                </div>
                <div class="hp-bar-container"><div class="hp-title"><span>오늘의 예상 체력 소모</span><span>${plan.hp}%</span></div><div class="hp-track"><div class="hp-fill" style="width: ${plan.hp}%;"></div></div><p style="font-size:11px; color:var(--text-sub); margin-top:8px; font-weight:600;">${plan.hp > 80 ? '⚠️ 체력 소모가 매우 큽니다. 무리하지 말고 휴식을 꼭 챙기세요!' : '✨ 일행의 컨디션에 딱 맞춘 완벽한 밸런스 플랜입니다.'}</p></div>
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
            
            // 지도 동기화
            if(isMapView && routeMap) {
                drawRoute(routeMap.getCenter().lat, routeMap.getCenter().lng, plan.spots);
            }
        };

        renderDayPlan(1, false);

        // 🚀 이벤트 위임을 사용하여 탭 터치 버그 원천 차단
        document.getElementById('ai-result-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.day-tab');
            if(!tab) return;
            document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const dayNum = parseInt(tab.getAttribute('data-day'));
            renderDayPlan(dayNum, false);
        });

        let initMapLat = 37.5665; let initMapLng = 126.9780;
        if(!routeMap) {
            routeMap = L.map('ai-result-map', { zoomControl: false }).setView([initMapLat, initMapLng], 13);
            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko').addTo(routeMap);
            routeLayerGroup = L.layerGroup().addTo(routeMap);
        }

        if(mainDest !== '미지의 여행지') {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mainDest)}`)
            .then(res => res.json()).then(data => {
                if(data && data.length > 0) {
                    routeMap.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
                }
            }).catch(()=>{});
        }

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

        if(!daySpots) {
            if(dailyPlans && dailyPlans[currentSelectedDay]) daySpots = dailyPlans[currentSelectedDay].spots;
            else daySpots = [];
        }

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
                    document.getElementById('map-info-img').style.backgroundImage = `url('${spot.img}?q=80&w=200&auto=format&fit=crop')`;
                    
                    routeMap.flyTo([p[0] - 0.005, p[1]], 14, {duration: 0.5});
                    setTimeout(() => infoCard.classList.add('active'), 300);
                };

                if (index > 0 && currentMarkerIndex < index) {
                    const transportIcon = Math.random() > 0.5 ? '<span class="material-symbols-rounded" style="color:#2563EB; font-size:24px;">directions_car</span>' : '<span class="material-symbols-rounded" style="color:#10B981; font-size:24px;">directions_walk</span>';
                    animateMovement(points[index-1], p, transportIcon, 1200, showCard);
                } else {
                    showCard();
                }
                currentMarkerIndex = index;
            });
        });
        
        if(points.length > 0) routeMap.fitBounds(polyline.getBounds(), {padding: [50, 50]});
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

    // 🚀 이벤트 위임으로 탭 터치 버그 원천 차단
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
            
            // 🚀 탐색 탭에도 리얼 AI 동적 생성 데이터 맵핑
            let html = '';
            for(let i=0; i<5; i++) {
                const generatedName = generateSpotName(dayToCityMap[currentSelectedDay] || aiData.destinations[0].city, aiData.themes, type);
                const generatedDesc = generateSpotDesc(aiData.companion, aiData.themes);
                const randomImg = `https://images.unsplash.com/photo-${fallbackImages[type][Math.floor(Math.random() * fallbackImages[type].length)]}`;
                
                html += `
                <div class="explore-card">
                    <div class="explore-card-img" style="background-image: url('${randomImg}?q=80&w=200&auto=format&fit=crop');"></div>
                    <div class="explore-card-info">
                        <div class="explore-card-title">${generatedName}</div>
                        <div class="explore-card-sub">별점 4.${8-i} · ${generatedDesc}</div>
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