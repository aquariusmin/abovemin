// 1. 구글 시트 정보 설정
const SHEET_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const base_url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// 데이터를 담을 변수들
let albumsData = [];
let galleryData = [];
let productsData = [];

// 사이트 초기화 (데이터 로드 후 시작)
window.onload = async function() {
    await loadAllData(); // 시트에서 데이터 가져오기
    
    // 갤러리 페이지인 경우
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        renderAlbumList();
    }

    // 쇼핑 페이지인 경우
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        renderProductList();
    }
};

/* --- 구글 시트에서 데이터 가져오는 핵심 함수 --- */
async function loadAllData() {
    try {
        // 각 탭(albums, photos, products)에서 데이터 병렬로 가져오기
        const [albumsRes, photosRes, productsRes] = await Promise.all([
            fetch(`${base_url}&sheet=albums`),
            fetch(`${base_url}&sheet=photos`),
            fetch(`${base_url}&sheet=products`)
        ]);

        const albumsJson = await parseSheetJson(await albumsRes.text());
        const photosJson = await parseSheetJson(await photosRes.text());
        const productsJson = await parseSheetJson(await productsRes.text());

        // 가져온 데이터를 우리 형식에 맞게 변환
        albumsData = albumsJson;
        galleryData = photosJson.map(p => ({
            ...p,
            // 시트의 카테고리(텍스트)를 배열로 변환
            categories: p.categories ? p.categories.split(',').map(c => c.trim()) : []
        }));
        productsData = productsJson;

        console.log("Data loaded successfully:", { albumsData, galleryData, productsData });
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}

// 구글 시트 JSON 응답을 깔끔한 배열 객체로 변환해주는 함수
async function parseSheetJson(text) {
    const jsonData = JSON.parse(text.substring(47, text.length - 2));
    const cols = jsonData.table.cols.map(col => col.label);
    return jsonData.table.rows.map(row => {
        const item = {};
        row.c.forEach((cell, i) => {
            if (cols[i]) {
                item[cols[i]] = cell ? cell.v : "";
            }
        });
        return item;
    });
}

/* --- 화면 렌더링 함수들 (이전 로직 유지 + 데이터 연동) --- */

function renderAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    
    albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByAlbum('${album.title}')" style="cursor:pointer;">
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

function filterByAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = "";

    const backBtn = document.createElement('div');
    backBtn.style.gridColumn = "1 / -1";
    backBtn.innerHTML = `<button onclick="renderAlbumList()" class="back-btn">← BACK TO ARCHIVE</button>`;
    grid.appendChild(backBtn);

    const filtered = galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const locationInfo = (p.location || p.year) 
            ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` 
            : "";

        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <div class="img-wrapper"><img src="${p.src}" class="gallery-img" loading="lazy"></div>
            <div class="photo-info">
                <span class="photo-title">${p.title}</span>
                <span class="photo-meta">${locationInfo}</span>
            </div>`;
        
        grid.appendChild(item);
        
        item.querySelector('img').onclick = function() {
            const modal = document.getElementById("imageModal");
            const modalImg = document.getElementById("img01");
            const captionText = document.getElementById("caption");
            modalImg.src = this.src;
            captionText.innerHTML = p.title;
            modal.style.display = "flex";
        };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderProductList() {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = ""; 
    productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${p.img}" alt="${p.name}"></div>
            <h3>${p.name}</h3>
            <p class="price">${p.price}</p>
            <button class="view-btn" onclick="showDetail(${p.id})">VIEW INFO</button>
        `;
        productGrid.appendChild(card);
    });
}

// 모달 및 기타 기능 유지...
function closeModal() { document.getElementById("imageModal").style.display = "none"; }
function showDetail(id) {
    const p = productsData.find(item => String(item.id) === String(id));
    if (!p) return;
    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-price').innerText = p.price;
    document.getElementById('detail-description').innerText = p.desc;
    document.getElementById('order-item').value = p.name;
    document.getElementById('product-detail').style.display = 'block';
    document.getElementById('product-detail').scrollIntoView({ behavior: 'smooth' });
}