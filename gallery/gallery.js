// ===== ГАЛЕРЕЯ СКРИНШОТОВ =====
const screenshots = [
    // Minecraft
    { title: 'Mountains', game: 'minecraft', date: '2024-12-07', image: 'gallery/img/minecraft/2024-12-07_11-54-42.png' },
    { title: 'Mountains', game: 'minecraft', date: '2024-12-07', image: 'gallery/img/minecraft/2024-12-07_12-00-04.png' },
    { title: 'Night Taiga', game: 'minecraft', date: '2025-02-22', image: 'gallery/img/minecraft/2025-02-22_21-15-11.png' },
    { title: 'Snowy Mountains', game: 'minecraft', date: '2025-10-18', image: 'gallery/img/minecraft/2025-10-18_20.55.20.png' },
    { title: 'Night Snowy Mountains', game: 'minecraft', date: '2025-10-19', image: 'gallery/img/minecraft/2025-10-19_12.22.39.png' },
    { title: 'Sunset', game: 'minecraft', date: '2025-10-21', image: 'gallery/img/minecraft/2025-10-21_20.37.59.png' },
    { title: 'The End?', game: 'minecraft', date: '2025-11-02', image: 'gallery/img/minecraft/2025-11-02_22.26.39.jpg' },
    { title: 'Underwater', game: 'minecraft', date: '2026-01-29', image: 'gallery/img/minecraft/2026-01-29_22.402.png' },
    
    // Arknights Enfield
    { title: 'Waterfall', game: 'enfield', date: '', image: 'gallery/img/endfield/1.png' },
    { title: 'Live tree', game: 'enfield', date: '', image: 'gallery/img/endfield/2.png' },
    { title: 'Live tree', game: 'enfield', date: '', image: 'gallery/img/endfield/3.png' },
    { title: 'Waterfall', game: 'enfield', date: '', image: 'gallery/img/endfield/4.png' },
    { title: 'Big waterfall', game: 'enfield', date: '', image: 'gallery/img/endfield/5.png' },
    { title: 'Small waerfall', game: 'enfield', date: '', image: 'gallery/img/endfield/6.png' },
    { title: 'Water wheel', game: 'enfield', date: '', image: 'gallery/img/endfield/7.png' },
    { title: 'Qinbo', game: 'enfield', date: '', image: 'gallery/img/endfield/8.png' },
    { title: 'Under', game: 'enfield', date: '', image: 'gallery/img/endfield/9.png' },
    { title: 'Under', game: 'enfield', date: '', image: 'gallery/img/endfield/10.png' },
    { title: 'Tree', game: 'enfield', date: '', image: 'gallery/img/endfield/11.png' },
    { title: 'Memories', game: 'enfield', date: '', image: 'gallery/img/endfield/12.png' },
    { title: 'M. Stone', game: 'enfield', date: '', image: 'gallery/img/endfield/13.png' },
    { title: 'Tianshi', game: 'enfield', date: '', image: 'gallery/img/endfield/14.png' },
    { title: 'Lun', game: 'enfield', date: '', image: 'gallery/img/endfield/15.png' },
    { title: 'M. Stone Estella', game: 'enfield', date: '', image: 'gallery/img/endfield/16.png' },
];

// Названия игр для отображения
const gameNames = {
    minecraft: 'Minecraft',
    enfield: 'Arknights Enfield'
};

// DOM элементы
const galleryGrid = document.getElementById('galleryGrid');
const filterBtns = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('galleryModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalGame = document.getElementById('modalGame');
const modalDate = document.getElementById('modalDate');
const modalClose = document.getElementById('modalClose');

// ---- Отрисовка галереи ----
function renderGallery(filter = 'all') {
    galleryGrid.innerHTML = '';
    
    const filtered = filter === 'all' 
        ? screenshots 
        : screenshots.filter(s => s.game === filter);
    
    filtered.forEach((screenshot, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.setAttribute('data-game', screenshot.game);
        item.setAttribute('data-index', index);
        
        item.innerHTML = `
            <img src="${screenshot.image}" alt="${screenshot.title}" loading="lazy">
            <div class="gallery-item-info">
                <span class="gallery-item-title">${screenshot.title}</span>
                <span class="gallery-item-game">${gameNames[screenshot.game] || screenshot.game}</span>
                <span class="gallery-item-date">${screenshot.date}</span>
            </div>
        `;
        
        item.addEventListener('click', () => openModal(index, filter));
        galleryGrid.appendChild(item);
    });
}

// ---- Открытие модального окна ----
function openModal(index, filter = 'all') {
    const filtered = filter === 'all' 
        ? screenshots 
        : screenshots.filter(s => s.game === filter);
    
    const screenshot = filtered[index];
    if (!screenshot) return;
    
    modalImage.src = screenshot.image;
    modalImage.alt = screenshot.title;
    modalTitle.textContent = screenshot.title;
    modalGame.textContent = gameNames[screenshot.game] || screenshot.game;
    modalDate.textContent = screenshot.date;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ---- Закрытие модального окна ----
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ---- Фильтрация ----
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.getAttribute('data-game');
        renderGallery(filter);
    });
});

// ---- Закрытие модального окна по клику на фон ----
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// ---- Закрытие по Escape ----
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ---- Закрытие по кнопке ----
modalClose.addEventListener('click', closeModal);

// ---- Инициализация ----
renderGallery('all');