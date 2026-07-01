    (function() {
        // ============================================================
        //  ★★★  ЗДЕСЬ ВЫ ПРОПИСЫВАЕТЕ СВОИ ТРЕКИ  ★★★
        // ============================================================
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
        const progressSlider = document.getElementById('progressSlider');
        const currentTimeLabel = document.getElementById('currentTimeLabel');
        const durationLabel = document.getElementById('durationLabel');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeLabel = document.getElementById('volumeLabel');

        // ----- Аудио -----
        let audioCtx = null;
        let sourceNode = null;
        let analyser = null;
        let gainNode = null;        // для громкости
        let isPlaying = false;
        let isPaused = false;
        let animationFrame = null;
        let currentAudioBuffer = null;
        let currentTrackIndex = 0;
        let isSeeking = false;
        let seekTargetTime = 0;
        let isRestarting = false;
        let isSwitchingTrack = false; // флаг для переключения треков

        // Параметры спектра
        const FFT_SIZE = 1024;
        const SMOOTHING = 0.85;

        // ---- Заполняем select списком треков ----
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

        // ---- Размеры canvas ----
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
        });

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

                const red = Math.min(255, Math.floor(20 + value * 200));
                const green = Math.min(255, Math.floor(10 + value * 180));
                const blue = Math.min(255, Math.floor(80 + (1 - value) * 140));

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
                // Создаём gain-узел для громкости
                gainNode = audioCtx.createGain();
                gainNode.gain.value = parseFloat(volumeSlider.value);
                gainNode.connect(audioCtx.destination);
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            return audioCtx;
        }

        // ---- Загрузка трека по индексу ----
        async function loadTrack(index, autoPlay = false) {
            if (index < 0 || index >= TRACKS.length) return;
            currentTrackIndex = index;
            const track = TRACKS[index];

            try {
                const response = await fetch(track.url);
                if (!response.ok) throw new Error('File not found');
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                currentAudioBuffer = audioBuffer;

                const duration = currentAudioBuffer.duration;
                durationLabel.textContent = formatTime(duration);
                progressSlider.max = duration;
                progressSlider.value = 0;
                currentTimeLabel.textContent = '0:00';

                trackSelect.value = index;

                statusText.textContent = 'Ready for playback';
                statusBadge.className = 'status-badge';

                preparePlayback();
                ctx.clearRect(0, 0, canvasW, canvasH);

                if (autoPlay || isPlaying) {
                    startPlayback();
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

            sourceNode.onended = () => {
                // Если это не ручная остановка и не перемотка и не переключение трека
                if (isPlaying && !isRestarting && !isSwitchingTrack) {
                    // Автоматически переключаем на следующий трек
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
            
            isSwitchingTrack = true;
            const nextIndex = (currentTrackIndex + 1) % TRACKS.length;
            
            // Останавливаем текущий
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch(e) {}
                sourceNode = null;
            }
            
            // Загружаем следующий
            loadTrack(nextIndex, true);
        }

        // ---- Переключение на предыдущий трек ----
        function playPreviousTrack() {
            if (TRACKS.length === 0) return;
            
            isSwitchingTrack = true;
            const prevIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
            
            if (sourceNode) {
                try {
                    sourceNode.stop();
                    sourceNode.disconnect();
                } catch(e) {}
                sourceNode = null;
            }
            
            loadTrack(prevIndex, true);
        }

        // ---- Перезапуск с новой позиции (для перемотки) ----
        function restartAtPosition(position) {
            if (!currentAudioBuffer || !audioCtx) return;
            
            isRestarting = true;
            const wasPlaying = isPlaying;
            
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
            
            sourceNode.onended = () => {
                if (isPlaying && !isRestarting && !isSwitchingTrack) {
                    playNextTrack();
                }
                isRestarting = false;
                isSwitchingTrack = false;
            };
            
            if (wasPlaying) {
                sourceNode.start(0, position);
                isPlaying = true;
                isPaused = false;
                statusText.textContent = 'Play';
                statusBadge.className = 'status-badge';
                updatePlayButton(true);
                startAnimation();
            } else {
                isPlaying = false;
                isPaused = true;
                statusText.textContent = 'on pause';
                statusBadge.className = 'status-badge idle';
                updatePlayButton(false);
            }
            
            progressSlider.value = position;
            currentTimeLabel.textContent = formatTime(position);
        }

        // ---- Старт ----
        function startPlayback() {
            if (!currentAudioBuffer) {
                statusText.textContent = 'No tracks';
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
                statusText.textContent = 'Preparation error';
                return;
            }

            let startTime = 0;
            if (seekTargetTime > 0 && seekTargetTime < currentAudioBuffer.duration) {
                startTime = seekTargetTime;
            }
            
            sourceNode.start(0, startTime);
            isPlaying = true;
            isPaused = false;
            statusText.textContent = 'Plays';
            statusBadge.className = 'status-badge';
            updatePlayButton(true);
            startAnimation();
            updateProgressLoop();
        }

        // ---- Пауза ----
        function pausePlayback() {
            if (!isPlaying) return;
            if (sourceNode) {
                try {
                    const pausedTime = parseFloat(progressSlider.value) || 0;
                    seekTargetTime = pausedTime;
                    sourceNode.stop();
                    sourceNode.disconnect();
                    sourceNode = null;
                } catch(e) {}
                isPlaying = false;
                isPaused = true;
                statusText.textContent = 'on pause';
                statusBadge.className = 'status-badge idle';
                updatePlayButton(false);
                stopAnimation();
                drawSpectrogram();
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
            stopAnimation();
            updatePlayButton(false);
            progressSlider.value = 0;
            currentTimeLabel.textContent = '0:00';
            ctx.clearRect(0, 0, canvasW, canvasH);
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
                if (!isPlaying) return;
                if (!sourceNode || !currentAudioBuffer) return;
                if (isSeeking) return;

                let currentVal = parseFloat(progressSlider.value) || 0;
                currentVal += 0.1;
                if (currentVal > currentAudioBuffer.duration) {
                    currentVal = currentAudioBuffer.duration;
                }
                progressSlider.value = currentVal;
                currentTimeLabel.textContent = formatTime(currentVal);
            }, 100);
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

        // ---- Перемотка ----
        progressSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            currentTimeLabel.textContent = formatTime(val);
            seekTargetTime = val;
            isSeeking = true;
        });

        progressSlider.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            seekTargetTime = val;
            isSeeking = false;

            if (isPlaying && currentAudioBuffer) {
                restartAtPosition(val);
            } else if (isPaused && currentAudioBuffer) {
                progressSlider.value = val;
                currentTimeLabel.textContent = formatTime(val);
                seekTargetTime = val;
                
                if (sourceNode) {
                    try {
                        sourceNode.stop();
                        sourceNode.disconnect();
                    } catch(ex) {}
                    sourceNode = null;
                }
                preparePlayback();
                isPaused = true;
                statusText.textContent = 'on pause';
                statusBadge.className = 'status-badge idle';
                ctx.clearRect(0, 0, canvasW, canvasH);
            } else if (!isPlaying && !isPaused && currentAudioBuffer) {
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

        // ---- Обработчики событий ----
        playBtn.addEventListener('click', () => {
            if (!currentAudioBuffer && TRACKS.length > 0) {
                initAudioContext();
                loadTrack(currentTrackIndex);
                setTimeout(() => startPlayback(), 100);
                return;
            }
            initAudioContext();
            if (!isPlaying) {
                if (parseFloat(progressSlider.value) >= currentAudioBuffer.duration - 0.1) {
                    progressSlider.value = 0;
                    currentTimeLabel.textContent = '0:00';
                    seekTargetTime = 0;
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

        // ---- Инициализация ----
        populateTrackList();
        ctx.clearRect(0, 0, canvasW, canvasH);
        statusText.textContent = 'Load track';
        statusBadge.className = 'status-badge idle';
        durationLabel.textContent = '0:00';
        progressSlider.value = 0;

        // Устанавливаем начальную громкость
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
        }, 50);

        // Добавляем поддержку клавиш для навигации (опционально)
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

    })();