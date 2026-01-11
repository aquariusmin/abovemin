// 1. 설정 (이 ID는 상민님 시트 ID입니다)
const SHEET_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const base_url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// 2. 변수 이름을 유니크하게 변경 (중복 에러 방지)
let gsAlbumsData = [];
let gsGalleryData = [];
let gsProductsData = [];

window.onload = async function() {
    console.log("시작: 데이터 로드 중...");
    await fetchSheetData();
    
    // 페이지에 따라 렌더링
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

        console.log("데이터 로드 완료!", { gsAlbumsData, gsGalleryData });
    } catch (err) {
        console.error("로드 에러:", err);
    }
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
            <div class="album-info"><h3>${album.title}</h3></div>
        `;
        grid.appendChild(card);
    });
}

function showGSPhotos(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `<div style="grid-column:1/-1"><button onclick="renderGSAlbums()" class="back-btn">← BACK</button></div>`;

    const filtered = gsGalleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src}" class="gallery-img" loading="lazy"></div>
            <div class="photo-info"><span class="photo-title">${p.title}</span></div>
        `;
        grid.appendChild(item);
    });
    window.scrollTo(0,0);
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
            <h3>${p.name}</h3><p class="price">${p.price}</p>
        `;
        grid.appendChild(card);
    });
}