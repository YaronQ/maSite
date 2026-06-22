(function() {
  // ------ ДАННЫЕ ТРЕКОВ (с путями) ------
  const tracks = [
    { 
      title: 'Midnight Waves', 
      artist: 'Luna Echo', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
    },
    { 
      title: 'Neon Lights', 
      artist: 'Stellar Drift', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' 
    },
    { 
      title: 'Fading Embers', 
      artist: 'Aurora Borealis', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' 
    },
    { 
      title: 'Echo Park', 
      artist: 'Luna Echo', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' 
    },
    { 
      title: 'Velvet Sky', 
      artist: 'Arctic Bloom', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' 
    },
    { 
      title: 'Silent Shores', 
      artist: 'Midnight Collective', 
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' 
    }
  ];

  // ------ DOM ------
  const visualizerContainer = document.getElementById('visualizerContainer');
  const playBtn = document.getElementById('playBtn');
  const progressFill = document.getElementById('progressFill');
  const progressBar = document.getElementById('progressBar');
  const progressThumb = document.getElementById('progressThumb');
  const currentTrackName = document.getElementById('currentTrackName');
  const currentArtistName = document.getElementById('currentArtistName');
  const currentTimeLabel = document.getElementById('currentTime');
  const totalTimeLabel = document.getElementById('totalTime');
  const playlistContainer = document.getElementById('playlistContainer');

  // ------ АУДИО ЭЛЕМЕНТ ------
  const audio = new Audio();
  audio.preload = 'metadata';

  // ------ СОСТОЯНИЕ ------
  let currentTrackIndex = 0;
  let isPlaying = false;
  let isDragging = false;
  let isSeeking = false;
  let vizInterval = null;
  let barElements = [];

  // ------ СОЗДАНИЕ СТОЛБЦОВ ------
  const BAR_COUNT = 24;
  function createBars() {
    visualizerContainer.innerHTML = '';
    barElements = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = document.createElement('div');
      bar.className = 'visualizer-bar';
      const h = 6 + Math.random() * 10;
      bar.style.height = h + 'px';
      visualizerContainer.appendChild(bar);
      barElements.push(bar);
    }
  }
  createBars();

  // ------ ВИЗУАЛИЗАТОР (всегда активен, но с разной амплитудой) ------
  function animateVisualizer() {
    const time = Date.now() / 220;
    
    if (isPlaying) {
      barElements.forEach((bar, index) => {
        const phase = index * 0.9 + 0.7;
        const wave1 = Math.sin(time * 0.6 + phase * 1.2);
        const wave2 = Math.sin(time * 0.9 + index * 0.5 + 2.1);
        const wave3 = Math.sin(time * 0.3 + index * 1.7 + 0.8);
        const spike = Math.random() > 0.92 ? 0.7 + Math.random() * 0.6 : 0;
        
        let raw = (wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.2 + spike * 0.4);
        raw = (raw + 1.2) / 2.4;
        raw = Math.min(1, Math.max(0.15, raw));
        
        const jitter = 0.85 + 0.3 * Math.sin(time * 0.5 + index * 0.3 + 5.2);
        let height = 10 + 100 * raw * jitter;
        height = Math.min(122, Math.max(6, height));
        bar.style.height = height + 'px';
      });
    } else {
      barElements.forEach((bar, index) => {
        const phase = index * 0.7 + 1.2;
        const wave = Math.sin(time * 0.25 + phase * 1.1) * 0.5 + 
                     Math.sin(time * 0.4 + index * 0.3 + 2.3) * 0.3;
        const baseHeight = 8 + Math.random() * 4;
        const amplitude = 6 + Math.random() * 4;
        let height = baseHeight + wave * amplitude;
        height = Math.min(28, Math.max(5, height));
        bar.style.height = height + 'px';
      });
    }
  }

  function startVisualizer() {
    if (vizInterval) clearInterval(vizInterval);
    vizInterval = setInterval(animateVisualizer, 60);
  }

  // ------ ФОРМАТИРОВАНИЕ ВРЕМЕНИ ------
  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ------ ОБНОВЛЕНИЕ ПРОГРЕССА ------
  function updateProgress(percent) {
    percent = Math.min(100, Math.max(0, percent));
    progressFill.style.width = percent + '%';
    if (audio.duration && !isNaN(audio.duration)) {
      const curSec = (percent / 100) * audio.duration;
      currentTimeLabel.textContent = formatTime(curSec);
    }
  }

  // ------ ЗАГРУЗКА ТРЕКА ------
  function loadTrack(index) {
    const track = tracks[index];
    if (!track) return;

    currentTrackName.textContent = track.title;
    currentArtistName.textContent = track.artist;

    audio.src = track.src;
    audio.load();

    updateProgress(0);
    totalTimeLabel.textContent = '--:--';

    audio.onloadedmetadata = function() {
      if (audio.duration && !isNaN(audio.duration)) {
        totalTimeLabel.textContent = formatTime(audio.duration);
      }
    };

    document.querySelectorAll('.playlist-item').forEach((el, i) => {
      el.classList.toggle('active', i === index);
    });

    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  // ------ PLAY/PAUSE ------
  function togglePlay() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      playBtn.textContent = '▶';
    } else {
      audio.play().catch(err => {
        console.warn('Не удалось воспроизвести:', err);
      });
      isPlaying = true;
      playBtn.textContent = '⏸';
    }
  }

  // ------ ПЕРЕКЛЮЧЕНИЕ ТРЕКОВ ------
  function nextTrack() {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    currentTrackIndex = newIndex;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  function prevTrack() {
    const newIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    currentTrackIndex = newIndex;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  function selectTrack(index) {
    if (index === currentTrackIndex) {
      togglePlay();
      return;
    }
    currentTrackIndex = index;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }

  // ------ ОБНОВЛЕНИЕ ПРОГРЕССА ОТ AUDIO ------
  function updateFromAudio() {
    if (isDragging || isSeeking) return;
    if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      const percent = (audio.currentTime / audio.duration) * 100;
      updateProgress(percent);
      currentTimeLabel.textContent = formatTime(audio.currentTime);
    }
  }

  // ------ ПЕРЕТАСКИВАНИЕ ПОЛЗУНКА (МГНОВЕННОЕ) ------
  function setupDragging() {
    let isDraggingLocal = false;

    // Функция для обновления позиции по координатам
    function updatePosition(clientX) {
      const rect = progressBar.getBoundingClientRect();
      let percent = ((clientX - rect.left) / rect.width) * 100;
      percent = Math.min(100, Math.max(0, percent));
      
      progressFill.style.width = percent + '%';
      if (audio.duration && !isNaN(audio.duration)) {
        const curSec = (percent / 100) * audio.duration;
        currentTimeLabel.textContent = formatTime(curSec);
      }
      return percent;
    }

    function startDrag(e) {
      e.preventDefault();
      isDraggingLocal = true;
      isDragging = true;
      isSeeking = true;
      progressThumb.classList.add('hidden');
      document.body.style.cursor = 'grabbing';
      
      // Мгновенно перемещаем ползунок в позицию клика
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      if (clientX !== undefined) {
        updatePosition(clientX);
      }
    }

    function moveDrag(e) {
      if (!isDraggingLocal) return;
      e.preventDefault();

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      if (clientX === undefined) return;
      
      updatePosition(clientX);
    }

    function endDrag(e) {
      if (!isDraggingLocal) return;
      isDraggingLocal = false;
      isDragging = false;
      progressThumb.classList.remove('hidden');
      document.body.style.cursor = 'default';

      // Устанавливаем позицию в аудио
      const percent = parseFloat(progressFill.style.width) || 0;
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        audio.currentTime = (percent / 100) * audio.duration;
      }
      isSeeking = false;
    }

    // События для ползунка
    progressThumb.addEventListener('mousedown', startDrag);
    progressThumb.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrag(e);
    }, { passive: false });

    // Глобальные события для перемещения
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', endDrag);

    // КЛИК ПО ДОРОЖКЕ — мгновенное перемещение
    progressBar.addEventListener('mousedown', function(e) {
      // Если клик был по ползунку, не обрабатываем (уже обработано выше)
      if (e.target === progressThumb) return;
      
      const rect = this.getBoundingClientRect();
      let percent = ((e.clientX - rect.left) / rect.width) * 100;
      percent = Math.min(100, Math.max(0, percent));
      
      // Мгновенно обновляем UI
      updateProgress(percent);
      // Устанавливаем позицию в аудио
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        audio.currentTime = (percent / 100) * audio.duration;
      }
    });

    // Для тачей на дорожке
    progressBar.addEventListener('touchstart', function(e) {
      if (e.target === progressThumb) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      if (!touch) return;
      
      const rect = this.getBoundingClientRect();
      let percent = ((touch.clientX - rect.left) / rect.width) * 100;
      percent = Math.min(100, Math.max(0, percent));
      
      updateProgress(percent);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        audio.currentTime = (percent / 100) * audio.duration;
      }
    }, { passive: false });
  }

  // ------ РЕНДЕР ПЛЕЙЛИСТА ------
  function renderPlaylist() {
    playlistContainer.innerHTML = '';
    tracks.forEach((track, idx) => {
      const item = document.createElement('button');
      item.className = 'playlist-item' + (idx === currentTrackIndex ? ' active' : '');
      item.setAttribute('data-index', idx);
      item.innerHTML = `
        <span class="track-index">${String(idx + 1).padStart(2, '0')}</span>
        <span class="track-title">${track.title}</span>
        <span class="track-duration">${track.src ? '' : ''}</span>
        <span class="play-indicator"></span>
      `;
      item.addEventListener('click', () => selectTrack(idx));
      playlistContainer.appendChild(item);
    });
  }

  // ------ ИНИЦИАЛИЗАЦИЯ ------
  function init() {
    currentTrackIndex = 0;
    renderPlaylist();
    loadTrack(0);
    
    startVisualizer();

    audio.addEventListener('timeupdate', updateFromAudio);
    
    // Обработка окончания трека — автоматический переход к следующему
    audio.addEventListener('ended', () => {
      // Переключаем на следующий трек
      const newIndex = (currentTrackIndex + 1) % tracks.length;
      currentTrackIndex = newIndex;
      loadTrack(currentTrackIndex);
      // Продолжаем воспроизведение
      audio.play().catch(() => {});
      // Убеждаемся, что isPlaying и кнопка в правильном состоянии
      isPlaying = true;
      playBtn.textContent = '⏸';
    });

    audio.addEventListener('play', () => {
      isPlaying = true;
      playBtn.textContent = '⏸';
    });

    audio.addEventListener('pause', () => {
      // isPlaying обновляется в togglePlay
    });

    playBtn.addEventListener('click', togglePlay);
    document.getElementById('nextBtn').addEventListener('click', nextTrack);
    document.getElementById('prevBtn').addEventListener('click', prevTrack);

    setupDragging();

    audio.onerror = function() {
      console.warn('Ошибка загрузки аудио:', audio.src);
      totalTimeLabel.textContent = '--:--';
    };
  }

  init();
})();