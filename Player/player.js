(function() {
    const TRACKS = [
        { name: 'C418 — Aria Math (Synthwave)', url: '../music/C418 — Aria Math (Synthwave).mp3' },
        { name: 'Re-Logic - Terraria Soundtrack Corruption', url: '../music/Re-Logic - Terraria Soundtrack Corruption.mp3' },

            // Добавьте свои файлы по образцу:
            // { name: 'Мой трек', url: '../music/my_song.mp3' },
    ];
    // ============================================================

    // ----- DOM -----
    const canvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const playLabel = document.getElementById('playLabel');
    const trackSelect = document.getElementById('trackSelect');
    const statusText = document.getElementById('statusText');
    const statusBadge = document.getElementById('statusBadge');
    const currentTimeLabel = document.getElementById('currentTimeLabel');
    const durationLabel = document.getElementById('durationLabel');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeLabel = document.getElementById('volumeLabel');

    // Вейформа
    const waveformCanvas = document.getElementById('waveformCanvas');
    const waveformCtx = waveformCanvas.getContext('2d');
    const waveformContainer = document.getElementById('waveformContainer');
    const waveformProgress = document.getElementById('waveformProgress');
    const waveformTime = document.getElementById('waveformTime');
    const waveformTooltip = document.getElementById('waveformTooltip');

    // ----- Аудио -----
    let audioCtx = null;
    let sourceNode = null;
    let analyser = null;
    let gainNode = null;
    let isPlaying = false;
    let isPaused = false;
    let animationFrame = null;
    let currentAudioBuffer = null;
    let currentTrackIndex = 0;
    let isSeeking = false;
    let seekTargetTime = 0;
    let isRestarting = false;
    let isSwitchingTrack = false;
    
    // Для точного отслеживания времени
    let currentPlayTime = 0;

    // Данные вейформы
    let waveformData = null;
    let waveformWidth = 0;
    let waveformHeight = 0;

    const FFT_SIZE = 1024;
    const SMOOTHING = 0.85;

    // ---- Заполняем select ----
    function populateTrackList() {
        trackSelect.innerHTML = '';
        TRACKS.forEach((track, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = track.name;
            trackSelect.appendChild(option);
        });
        if (TRACKS.length > 0) {
            trackSelect.value = 0;
            currentTrackIndex = 0;
        }
    }

    // ---- Размеры canvas спектра ----
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width || 800;
        const height = rect.height || 200;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
        return { width, height };
    }

    let { width: canvasW, height: canvasH } = resizeCanvas();

    window.addEventListener('resize', () => {
        const size = resizeCanvas();
        canvasW = size.width;
        canvasH = size.height;
        if (!isPlaying && !isPaused) {
            ctx.clearRect(0, 0, canvasW, canvasH);
        }
        resizeWaveform();
        if (waveformData) drawWaveform();
    });

    // ---- Размеры вейформы ----
    function resizeWaveform() {
        const rect = waveformContainer.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        waveformWidth = rect.width;
        waveformHeight = rect.height;
        waveformCanvas.width = waveformWidth * dpr;
        waveformCanvas.height = waveformHeight * dpr;
        waveformCanvas.style.width = waveformWidth + 'px';
        waveformCanvas.style.height = waveformHeight + 'px';
        waveformCtx.scale(dpr, dpr);
    }

    // ---- Отрисовка объёмной вейформы ----
    function drawWaveform() {
        if (!waveformData || waveformData.length === 0) {
            waveformCtx.clearRect(0, 0, waveformWidth, waveformHeight);
            return;
        }

        waveformCtx.clearRect(0, 0, waveformWidth, waveformHeight);

        const step = Math.max(1, Math.floor(waveformData.length / waveformWidth));
        const halfHeight = waveformHeight / 2;

        waveformCtx.beginPath();
        waveformCtx.strokeStyle = '#ad375ac7';
        waveformCtx.lineWidth = 3;
        waveformCtx.shadowColor = '#7c2b4349';
        waveformCtx.shadowBlur = 8;

        for (let i = 0; i < waveformWidth; i++) {
            const index = Math.floor(i * step);
            if (index >= waveformData.length) break;
            const value = waveformData[index];
            const x = i;
            const y = halfHeight - value * halfHeight * 0.85;

            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }
        }
        waveformCtx.stroke();
        waveformCtx.shadowBlur = 0;

        waveformCtx.beginPath();
        waveformCtx.strokeStyle = '#ad375a57';
        waveformCtx.lineWidth = 2;

        for (let i = 0; i < waveformWidth; i++) {
            const index = Math.floor(i * step);
            if (index >= waveformData.length) break;
            const value = waveformData[index];
            const x = i;
            const y = halfHeight + value * halfHeight * 0.85;

            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }
        }
        waveformCtx.stroke();

        waveformCtx.beginPath();
        for (let i = 0; i < waveformWidth; i++) {
            const index = Math.floor(i * step);
            if (index >= waveformData.length) break;
            const value = waveformData[index];
            const x = i;
            const y = halfHeight - value * halfHeight * 0.85;
            
            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }
        }
        
        for (let i = waveformWidth - 1; i >= 0; i--) {
            const index = Math.floor(i * step);
            if (index >= waveformData.length) break;
            const value = waveformData[index];
            const x = i;
            const y = halfHeight + value * halfHeight * 0.85;
            waveformCtx.lineTo(x, y);
        }
        waveformCtx.closePath();
        
        const gradient = waveformCtx.createLinearGradient(0, 0, 0, waveformHeight);
        gradient.addColorStop(0, '#ad375a4b');
        gradient.addColorStop(0.5, '#ad375a17');
        gradient.addColorStop(1, '#ad375a34');
        waveformCtx.fillStyle = gradient;
        waveformCtx.fill();

        waveformCtx.beginPath();
        waveformCtx.strokeStyle = '#dd6589';
        waveformCtx.lineWidth = 1;
        
        for (let i = 0; i < waveformWidth; i++) {
            const index = Math.floor(i * step);
            if (index >= waveformData.length) break;
            const value = waveformData[index];
            const x = i;
            const y = halfHeight - value * halfHeight * 0.5;
            
            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }
        }
        waveformCtx.stroke();
    }

    // ---- Генерация вейформы ----
    function generateWaveform(audioBuffer) {
        const channelData = audioBuffer.getChannelData(0);
        const samples = channelData.length;
        const maxSamples = 10000;
        const step = Math.max(1, Math.floor(samples / maxSamples));

        waveformData = [];
        for (let i = 0; i < samples; i += step) {
            let sum = 0;
            for (let j = 0; j < step && i + j < samples; j++) {
                sum += Math.abs(channelData[i + j]);
            }
            waveformData.push(sum / step);
        }

        let max = 0;
        for (let i = 0; i < waveformData.length; i++) {
            if (waveformData[i] > max) max = waveformData[i];
        }
        if (max > 0) {
            for (let i = 0; i < waveformData.length; i++) {
                waveformData[i] = waveformData[i] / max;
            }
        }

        resizeWaveform();
        drawWaveform();
    }

    // ---- Обновление прогресса на вейформе ----
    function updateWaveformProgress(progress) {
        const percent = Math.min(100, Math.max(0, progress * 100));
        waveformProgress.style.width = percent + '%';
        
        if (currentAudioBuffer) {
            const time = progress * currentAudioBuffer.duration;
            waveformTime.textContent = formatTime(time);
        }
    }

    // ---- Отрисовка спектрограммы ----
    function drawSpectrogram() {
        if (!analyser) {
            ctx.clearRect(0, 0, canvasW, canvasH);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvasW, canvasH);

        const barWidth = canvasW / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] / 255;

            const red = Math.min(255, Math.floor(80 + value * 200));
            const green = Math.min(255, Math.floor(10 + value * 180));
            const blue = Math.min(255, Math.floor(40 + (1 - value) * 140));

            const barHeight = value * canvasH * 0.85 + 2;
            const y0 = canvasH - barHeight;

            const grad = ctx.createLinearGradient(0, y0, 0, canvasH);
            grad.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 1.0)`);
            grad.addColorStop(0.6, `rgba(${red*0.8}, ${green*0.8}, ${blue*0.9}, 1.0)`);
            grad.addColorStop(1, `rgba(20, 40, 80, 0.0)`);

            ctx.fillStyle = grad;
            ctx.fillRect(x, y0, barWidth + 0.5, barHeight);

            if (value > 0.04) {
                ctx.fillStyle = `rgba(255, 255, 255, ${value * 0.3})`;
                ctx.fillRect(x, y0, barWidth + 0.5, 1.5);
            }

            x += barWidth;
        }

        ctx.shadowColor = 'rgba(80, 180, 255, 0.04)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1, 1);
        ctx.shadowBlur = 0;
    }

    // ---- Анимация ----
    function animateSpectrum() {
        if (!isPlaying && !isPaused) return;
        drawSpectrogram();
        animationFrame = requestAnimationFrame(animateSpectrum);
    }

    function startAnimation() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animateSpectrum();
    }

    function stopAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        ctx.clearRect(0, 0, canvasW, canvasH);
    }

    // ---- Аудио контекст ----
    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.gain.value = parseFloat(volumeSlider.value);
            gainNode.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // ---- Загрузка трека ----
    async function loadTrack(index, autoPlay = false) {
        if (index < 0 || index >= TRACKS.length) return;
        currentTrackIndex = index;
        const track = TRACKS[index];

        try {
            const response = await fetch(track.url);
            if (!response.ok) throw new Error('Файл не найден');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            currentAudioBuffer = audioBuffer;

            // СБРАСЫВАЕМ ВРЕМЯ ПРИ ЗАГРУЗКЕ НОВОГО ТРЕКА
            currentPlayTime = 0;
            seekTargetTime = 0;
            
            const duration = currentAudioBuffer.duration;
            durationLabel.textContent = formatTime(duration);
            currentTimeLabel.textContent = '0:00';
            updateWaveformProgress(0);

            trackSelect.value = index;

            generateWaveform(audioBuffer);

            statusText.textContent = 'Ready for playback';
            statusBadge.className = 'status-badge';

            preparePlayback();
            ctx.clearRect(0, 0, canvasW, canvasH);

            if (autoPlay) {
                setTimeout(() => {
                    startPlayback();
                }, 50);
            }
        } catch (error) {
            console.error('Track loading error:', error);
            statusText.textContent = 'Error: ' + track.name;
            statusBadge.className = 'status-badge idle';
        }
    }

    // ---- Подготовка ----
    function preparePlayback() {
        if (!currentAudioBuffer) return false;
        if (!audioCtx) {
            initAudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SMOOTHING;

        if (sourceNode) {
            try { 
                sourceNode.disconnect(); 
                sourceNode.stop();
            } catch(e) {}
            sourceNode = null;
        }

        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = currentAudioBuffer;
        sourceNode.connect(analyser);
        analyser.connect(gainNode);

        sourceNode.onended = function() {
            if (isPlaying && !isRestarting && !isSwitchingTrack) {
                if (progressInterval) clearInterval(progressInterval);
                playNextTrack();
            }
            isRestarting = false;
            isSwitchingTrack = false;
        };

        return true;
    }

    // ---- Переключение на следующий трек ----
    function playNextTrack() {
        if (TRACKS.length === 0) return;
        
        const nextIndex = (currentTrackIndex + 1) % TRACKS.length;
        isSwitchingTrack = true;
        isPlaying = false;
        
        if (sourceNode) {
            try {
                sourceNode.stop();
                sourceNode.disconnect();
            } catch(e) {}
            sourceNode = null;
        }
        
        stopAnimation();
        loadTrack(nextIndex, true);
    }

    // ---- Переключение на предыдущий трек ----
    function playPreviousTrack() {
        if (TRACKS.length === 0) return;
        
        const prevIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
        isSwitchingTrack = true;
        isPlaying = false;
        
        if (sourceNode) {
            try {
                sourceNode.stop();
                sourceNode.disconnect();
            } catch(e) {}
            sourceNode = null;
        }
        
        stopAnimation();
        loadTrack(prevIndex, true);
    }

    // ---- Перезапуск с позиции ----
    function restartAtPosition(position) {
        if (!currentAudioBuffer || !audioCtx) return;
        
        isRestarting = true;
        const wasPlaying = isPlaying;
        currentPlayTime = position;
        
        if (sourceNode) {
            try {
                sourceNode.stop();
                sourceNode.disconnect();
            } catch(e) {}
            sourceNode = null;
        }
        
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SMOOTHING;
        
        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = currentAudioBuffer;
        sourceNode.connect(analyser);
        analyser.connect(gainNode);
        
        sourceNode.onended = function() {
            if (isPlaying && !isRestarting && !isSwitchingTrack) {
                if (progressInterval) clearInterval(progressInterval);
                playNextTrack();
            }
            isRestarting = false;
            isSwitchingTrack = false;
        };
        
        if (wasPlaying) {
            sourceNode.start(0, position);
            isPlaying = true;
            isPaused = false;
            statusText.textContent = 'Is playng';
            statusBadge.className = 'status-badge';
            updatePlayButton(true);
            startAnimation();
        } else {
            isPlaying = false;
            isPaused = true;
            statusText.textContent = 'On Pause';
            statusBadge.className = 'status-badge idle';
            updatePlayButton(false);
        }
        
        const progress = position / currentAudioBuffer.duration;
        updateWaveformProgress(progress);
        currentTimeLabel.textContent = formatTime(position);
        
        if (progressInterval) clearInterval(progressInterval);
        if (isPlaying) {
            updateProgressLoop();
        }
    }

    // ---- Старт ----
    function startPlayback() {
        if (!currentAudioBuffer) {
            statusText.textContent = 'No track';
            statusBadge.className = 'status-badge idle';
            return;
        }
        if (isPlaying) {
            pausePlayback();
            return;
        }

        if (!audioCtx || audioCtx.state === 'closed') {
            initAudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (isPaused && sourceNode) {
            try { 
                sourceNode.stop();
                sourceNode.disconnect();
            } catch(e) {}
            sourceNode = null;
            isPaused = false;
            preparePlayback();
        }

        if (!sourceNode) {
            preparePlayback();
        }

        if (!sourceNode) {
            statusText.textContent = 'Load error';
            return;
        }

        let startTime = 0;
        if (seekTargetTime > 0 && seekTargetTime < currentAudioBuffer.duration) {
            startTime = seekTargetTime;
            currentPlayTime = seekTargetTime;
        } else {
            currentPlayTime = 0;
        }
        
        sourceNode.start(0, startTime);
        isPlaying = true;
        isPaused = false;
        statusText.textContent = 'is playing';
        statusBadge.className = 'status-badge';
        updatePlayButton(true);
        startAnimation();
        
        if (progressInterval) clearInterval(progressInterval);
        updateProgressLoop();
    }

    // ---- Pause ----
    function pausePlayback() {
        if (!isPlaying) return;
        if (sourceNode) {
            try {
                seekTargetTime = currentPlayTime;
                sourceNode.stop();
                sourceNode.disconnect();
                sourceNode = null;
            } catch(e) {}
            isPlaying = false;
            isPaused = true;
            statusText.textContent = 'On Pause';
            statusBadge.className = 'status-badge idle';
            updatePlayButton(false);
            stopAnimation();
            drawSpectrogram();
            if (progressInterval) clearInterval(progressInterval);
        }
    }

    // ---- Остановка ----
    function stopPlayback() {
        if (sourceNode) {
            try { 
                sourceNode.stop();
                sourceNode.disconnect();
            } catch(e) {}
            sourceNode = null;
        }
        isPlaying = false;
        isPaused = false;
        currentPlayTime = 0;
        stopAnimation();
        updatePlayButton(false);
        updateWaveformProgress(0);
        currentTimeLabel.textContent = '0:00';
        ctx.clearRect(0, 0, canvasW, canvasH);
        if (progressInterval) clearInterval(progressInterval);
    }

    // ---- Кнопка ----
    function updatePlayButton(playing) {
        if (playing) {
            playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />';
            playLabel.textContent = 'Pause';
        } else {
            playIcon.innerHTML = '<polygon points="6,3 20,12 6,21" />';
            playLabel.textContent = 'Play';
        }
    }

    // ---- Формат времени ----
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ---- Обновление прогресса ----
    let progressInterval = null;

    function updateProgressLoop() {
        if (progressInterval) clearInterval(progressInterval);
        
        progressInterval = setInterval(() => {
            if (!isPlaying || !currentAudioBuffer) {
                return;
            }
            
            if (isSeeking) return;
            
            currentPlayTime += 0.05;
            
            if (currentPlayTime >= currentAudioBuffer.duration) {
                currentPlayTime = currentAudioBuffer.duration;
                const progress = currentPlayTime / currentAudioBuffer.duration;
                updateWaveformProgress(progress);
                currentTimeLabel.textContent = formatTime(currentPlayTime);
                return;
            }
            
            const progress = currentPlayTime / currentAudioBuffer.duration;
            updateWaveformProgress(progress);
            currentTimeLabel.textContent = formatTime(currentPlayTime);
            
        }, 50);
    }

    // ---- Громкость ----
    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const percent = Math.round(val * 100);
        volumeLabel.textContent = percent + '%';
        if (gainNode) {
            gainNode.gain.value = val;
        }
    });

    // ---- Клик по вейформе (перемотка) ----
    waveformContainer.addEventListener('click', (e) => {
        if (!currentAudioBuffer) return;
        
        const rect = waveformContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        const time = progress * currentAudioBuffer.duration;
        
        seekTargetTime = time;
        currentPlayTime = time;
        
        if (isPlaying) {
            restartAtPosition(time);
        } else if (isPaused) {
            updateWaveformProgress(progress);
            currentTimeLabel.textContent = formatTime(time);
            seekTargetTime = time;
            
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch(ex) {}
                sourceNode = null;
            }
            preparePlayback();
            isPaused = true;
            statusText.textContent = 'On Pause';
            statusBadge.className = 'status-badge idle';
            ctx.clearRect(0, 0, canvasW, canvasH);
        } else {
            updateWaveformProgress(progress);
            currentTimeLabel.textContent = formatTime(time);
            seekTargetTime = time;
            
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch(ex) {}
                sourceNode = null;
            }
            preparePlayback();
            statusText.textContent = 'Ready';
            statusBadge.className = 'status-badge idle';
            ctx.clearRect(0, 0, canvasW, canvasH);
        }
    });

    // ---- Ховер на вейформе ----
    waveformContainer.addEventListener('mousemove', (e) => {
        if (!currentAudioBuffer) {
            waveformTooltip.classList.remove('visible');
            return;
        }
        
        const rect = waveformContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        const time = progress * currentAudioBuffer.duration;
        
        waveformTooltip.textContent = formatTime(time);
        waveformTooltip.style.left = x + 'px';
        waveformTooltip.classList.add('visible');
    });

    waveformContainer.addEventListener('mouseleave', () => {
        waveformTooltip.classList.remove('visible');
    });

    // ---- Обработчики ----
    playBtn.addEventListener('click', () => {
        if (!currentAudioBuffer && TRACKS.length > 0) {
            initAudioContext();
            loadTrack(currentTrackIndex);
            setTimeout(() => startPlayback(), 100);
            return;
        }
        initAudioContext();
        if (!isPlaying) {
            if (currentAudioBuffer) {
                if (currentPlayTime >= currentAudioBuffer.duration - 0.1) {
                    currentPlayTime = 0;
                    updateWaveformProgress(0);
                    currentTimeLabel.textContent = '0:00';
                    seekTargetTime = 0;
                }
            }
            startPlayback();
        } else {
            pausePlayback();
        }
    });

    trackSelect.addEventListener('change', (e) => {
        const index = parseInt(e.target.value);
        if (isPlaying || isPaused) {
            isSwitchingTrack = true;
            stopPlayback();
        }
        if (progressInterval) clearInterval(progressInterval);
        initAudioContext();
        loadTrack(index);
    });

    // ---- Горячие клавиши ----
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'SELECT') return;
        if (e.key === ' ' || e.key === 'Space') {
            e.preventDefault();
            playBtn.click();
        }
        if (e.key === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            const next = (currentTrackIndex + 1) % TRACKS.length;
            trackSelect.value = next;
            trackSelect.dispatchEvent(new Event('change'));
        }
        if (e.key === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            const prev = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
            trackSelect.value = prev;
            trackSelect.dispatchEvent(new Event('change'));
        }
    });

    // ---- Инициализация ----
    populateTrackList();
    resizeWaveform();
    ctx.clearRect(0, 0, canvasW, canvasH);
    statusText.textContent = 'Select a track';
    statusBadge.className = 'status-badge idle';
    durationLabel.textContent = '0:00';
    volumeLabel.textContent = '20%';

    if (TRACKS.length > 0) {
        initAudioContext();
        loadTrack(0);
    }

    window.addEventListener('beforeunload', () => {
        if (progressInterval) clearInterval(progressInterval);
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close();
        }
        if (animationFrame) cancelAnimationFrame(animationFrame);
    });

    setTimeout(() => {
        ctx.clearRect(0, 0, canvasW, canvasH);
        resizeWaveform();
        if (waveformData) drawWaveform();
    }, 100);

})();