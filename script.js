const SHEET_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const base_url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let gsAlbumsData = [];
let gsGalleryData = [];
let gsProductsData = [];

window.onload = async function() {
    await fetchSheetData();
    if (document.getElementById('gallery-grid')) renderGSAlbums();
    if (document.getElementById('product-grid')) renderGSProducts();
};

async function fetchSheetData() {
    try {
        const [aRes, gRes, pRes] = await Promise.all([
            fetch(`${base_url}&sheet=albums`),
            fetch(`${base_url}&sheet=photos`),
            fetch(`${base_url}&sheet=products`)
        ]);
        gsAlbumsData = await parseGSJson(await aRes.text());
        gsGalleryData = await parseGSJson(await gRes.text());
        gsProductsData = await parseGSJson(await pRes.text());
    } catch (err) { console.error("Fetch Error:", err); }
}

async function parseGSJson(text) {
    try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        const cols = json.table.cols.map(c => c.label);
        return json.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => { if (cols[i]) item[cols[i]] = cell ? cell.v : ""; });
            return item;
        });
    } catch (e) { return []; }
}

function renderGSAlbums() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gsAlbumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="showGSPhotos('${album.title}')">
                <img src="${album.cover}" class="album-cover" loading="lazy">
                <div class="album-overlay"><span>VIEW ALBUM</span></div>
            </div>
            <div class="album-info">
                <h3>${album.title}</h3>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* --- 개별 사진 리스트 (상민님의 원래 구조와 100% 일치) --- */
function showGSPhotos(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `
        <div class="back-btn-container">
            <button onclick="renderGSAlbums()" class="back-btn">← BACK TO ARCHIVE</button>
        </div>`;

    const filtered = gsGalleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const locationInfo = (p.location || p.year) 
            ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` 
            : "";
            
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // 이 부분이 상민님의 .photo-info 스타일을 그대로 먹는 구조입니다
        item.innerHTML = `
            <div class="img-wrapper">
                <img src="${p.src}" class="gallery-img" loading="lazy" onclick="openModal('${p.src}', '${p.title}')">
            </div>
            <div class="photo-info">
                <span class="photo-title">${p.title}</span>
                <span class="photo-meta">${locationInfo}</span>
            </div>
        `;
        grid.appendChild(item);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderGSProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gsProductsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${p.img}" alt="${p.name}"></div>
            <div class="photo-info">
                <h3 class="photo-title">${p.name}</h3>
                <p class="photo-meta">${p.price}</p>
                <button class="btn-outline" style="width:100%; margin-top:20px;" onclick="showDetail('${p.id}')">VIEW INFO</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openModal(src, title) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("img01");
    modalImg.src = src;
    modal.style.display = "flex";
}

function closeModal() { document.getElementById("imageModal").style.display = "none"; }