// 1. 구글 시트 및 기본 설정
const GS_ID = '1XgMTnGMx3Q441Ky9-jeDNAfnu-slemlfGYZxyoigbqA';
const GS_URL = `https://docs.google.com/spreadsheets/d/${GS_ID}/gviz/tq?tqx=out:json`;

let gs_albumsData = [];
let gs_galleryData = [];
let gs_productsData = [];
let gs_investData = [];

// 페이지 로드 시 실행
window.onload = async function() {
    await loadDataFromSheet();
    
    // 현재 페이지에 특정 요소가 있는지 확인 후 해당 기능 실행
    if (document.getElementById('gallery-grid')) renderGSAlbumList();
    if (document.getElementById('product-grid')) renderGSProductList();
    if (document.getElementById('invest-body')) renderGSInvestList();
};

/* --- [공통] 성능 최적화: Cloudinary 주소 변환 --- */
function optimizeCloudinary(url, width = 800) {
    if (!url || !url.includes("cloudinary.com")) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* --- [데이터 로드] 4개 시트 통합 호출 --- */
async function loadDataFromSheet() {
    try {
        const [aRes, gRes, pRes, iRes] = await Promise.all([
            fetch(`${GS_URL}&sheet=albums`),
            fetch(`${GS_URL}&sheet=photos`),
            fetch(`${GS_URL}&sheet=products`),
            fetch(`${GS_URL}&sheet=invest`)
        ]);
        
        gs_albumsData = parseGS(await aRes.text());
        gs_galleryData = parseGS(await gRes.text()).map(p => ({
            ...p,
            categories: p.categories ? String(p.categories).split(',').map(c => c.trim()) : []
        }));
        gs_productsData = parseGS(await pRes.text());
        gs_investData = parseGS(await iRes.text());
        
        console.log("Invest 데이터 로드 완료:", gs_investData);
    } catch (e) {
        console.error("데이터 로드 중 오류 발생:", e);
    }
}

/* --- [파싱] 구글 시트 JSON 변환 로직 --- */
function parseGS(text) {
    try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        const cols = json.table.cols.map(c => c.label);
        return json.table.rows.map(row => {
            const item = {};
            row.c.forEach((cell, i) => { 
                if (cols[i]) {
                    // 셀 값이 있으면 가져오고, 없으면 빈 문자열 처리
                    item[cols[i]] = cell ? (cell.f ? cell.f : cell.v) : "";
                }
            });
            return item;
        });
    } catch (e) {
        return [];
    }
}

/* --- [Invest] 투자 리스트 렌더링 (정렬, 게이지, 조건부 서식) --- */
function renderGSInvestList() {
    const body = document.getElementById('invest-body');
    if (!body) return;
    body.innerHTML = "";

    if (!gs_investData || gs_investData.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#444;">데이터를 불러오는 중입니다...</td></tr>`;
        return;
    }

    // 상승률(change) 기준 내림차순 정렬
    const sorted = [...gs_investData].sort((a, b) => {
        const aVal = parseFloat(a.change) || 0;
        const bVal = parseFloat(b.change) || 0;
        return bVal - aVal;
    });

    sorted.forEach(item => {
        // 숫자 데이터 안전하게 변환
        const price = item.price || "0";
        const priceNum = parseFloat(price.toString().replace(/,/g, '')) || 0;
        const changeVal = parseFloat(item.change) || 0;
        const pe = (item.pe && item.pe !== "#N/A") ? parseFloat(item.pe) : null;
        const beta = (item.beta && item.beta !== "#N/A") ? parseFloat(item.beta) : null;
        const high52 = parseFloat(item.h52) || 0;
        const low52 = parseFloat(item.l52) || 0;

        // 52주 게이지 위치 계산
        let rangePercent = 0;
        if (high52 > low52) {
            rangePercent = ((priceNum - low52) / (high52 - low52)) * 100;
            rangePercent = Math.max(0, Math.min(100, rangePercent));
        }

        // 조건부 클래스
        const colorClass = changeVal > 0 ? "up" : (changeVal < 0 ? "down" : "");
        const peClass = (pe && pe > 0 && pe < 12) ? "good" : "";
        const betaClass = (beta && beta > 1.3) ? "warning" : "";
        
        const currency = item.curr === "KRW" ? "₩" : (item.curr === "USD" ? "$" : "");
        const marketCap = item.mc ? (parseFloat(item.mc) / 1000000000000).toFixed(1) + "조" : "-";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="stock-name">${item.title || "Unknown"}</span>
                <span class="badge">${item.sector || "General"}</span>
            </td>
            <td>
                <div class="stock-price">${currency}${price}</div>
                <div class="${colorClass}" style="font-size:0.75rem; font-weight:600;">
                    ${changeVal > 0 ? "+" : ""}${(changeVal * 100).toFixed(2)}%
                </div>
            </td>
            <td>
                <div><span class="meta-label">PE</span><span class="meta-value ${peClass}">${item.pe || "-"}</span></div>
                <div><span class="meta-label">BETA</span><span class="meta-value ${betaClass}">${item.beta || "-"}</span></div>
                <div><span class="meta-label">시총</span><span class="meta-value">${marketCap}</span></div>
            </td>
            <td>
                <div class="range-container">
                    <div class="range-bar" style="width: 100%;"></div>
                    <div class="current-dot" style="left: ${rangePercent}%;"></div>
                </div>
                <div style="font-size:0.6rem; color:#444; margin-top:5px; text-align:center;">52주 범위</div>
            </td>
            <td><div style="color:#666; font-size:0.75rem; line-height:1.4;">${item.note || ""}</div></td>
        `;
        body.appendChild(tr);
    });
}

/* --- [Gallery] 앨범 및 사진 렌더링 --- */
function renderGSAlbumList() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_albumsData.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <div class="img-wrapper" onclick="filterByGSAlbum('${album.title}')" style="cursor:pointer;">
                <img src="${optimizeCloudinary(album.cover, 800)}" class="album-cover" loading="lazy" style="width:100%; display:block;">
                <div class="album-overlay">
                    <span style="color:#fff; font-size:0.75rem; letter-spacing:2px;">VIEW ALBUM</span>
                </div>
            </div>
            <div class="album-info" style="margin-top:15px;">
                <h3 style="font-weight:300; letter-spacing:2px; font-size:1.1rem; margin:0;">${album.title}</h3>
                <p style="color:#555; font-size:0.8rem; margin-top:5px; letter-spacing:1px;">${album.desc}</p>
            </div>`;
        grid.appendChild(card);
        const w = card.querySelector('.img-wrapper');
        w.onmouseenter = () => w.querySelector('.album-overlay').style.opacity = '1';
        w.onmouseleave = () => w.querySelector('.album-overlay').style.opacity = '0';
    });
}

function filterByGSAlbum(albumName) {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;"><button onclick="renderGSAlbumList()" style="background:none; border:none; color:#888; cursor:pointer; padding:20px 0; letter-spacing:2px; font-size:0.75rem;">← BACK TO ARCHIVE</button></div>`;
    const filtered = gs_galleryData.filter(p => p.album === albumName);
    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        const tags = p.categories.map(cat => `<span class="tag" style="font-size:0.65rem; color:#444; margin-right:8px;">#${cat}</span>`).join("");
        const loc = (p.location || p.year) ? `${p.location || ""} ${p.location && p.year ? "/" : ""} ${p.year || ""}` : "";
        item.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.src, 1000)}" class="gallery-img" loading="lazy" style="width:100%; cursor:pointer;" onclick="openGSModal('${optimizeCloudinary(p.src, 2000)}')"></div>
            <div class="photo-info" style="margin-top:10px; display:flex; justify-content:space-between; align-items:flex-start;">
                <div><span class="photo-title" style="font-size:0.9rem; letter-spacing:1px;">${p.title}</span><div class="photo-tags" style="display:flex; gap:5px; margin-top:5px;">${tags}</div></div>
                <span class="photo-meta" style="color:#444; font-size:0.75rem;">${loc}</span>
            </div>`;
        grid.appendChild(item);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --- [Shop] 상품 리스트 및 상세 정보 --- */
function renderGSProductList() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = "";
    gs_productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="img-wrapper"><img src="${optimizeCloudinary(p.img, 800)}" loading="lazy" style="width:100%"></div>
            <h3>${p.name}</h3>
            <p style="color:#d4a373; font-size:0.9rem; margin-bottom:15px;">${p.price}</p>
            <button class="view-btn" style="width:100%; padding:12px; background:none; border:1px solid #333; color:#fff; cursor:pointer; font-size:0.75rem;" onclick="showGSDetail('${p.id}')">VIEW INFO</button>
        `;
        grid.appendChild(card);
    });
}

function showGSDetail(id) {
    const p = gs_productsData.find(item => String(item.id) === String(id));
    if (!p) return;
    document.getElementById('detail-title').innerText = p.name;
    document.getElementById('detail-price').innerText = p.price;
    document.getElementById('detail-description').innerText = p.desc;
    document.getElementById('order-item').value = p.name;
    const submitBtn = document.getElementById('submitBtn');
    
    if (p.price === "-원" || p.desc.includes("준비중")) {
        submitBtn.disabled = true;
        submitBtn.innerText = "NOT AVAILABLE";
        submitBtn.style.background = "#333";
    } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "PLACE ORDER";
        submitBtn.style.background = "#fff";
    }
    document.getElementById('product-detail').style.display = 'block';
    document.getElementById('product-detail').scrollIntoView({ behavior: 'smooth' });
}

/* --- [기능] 주소 찾기 및 모달 --- */
function findAddr() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById("address").value = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            document.getElementById("detailAddress").focus();
        }
    }).open();
}

function openGSModal(src) { 
    document.getElementById("img01").src = src; 
    document.getElementById("imageModal").style.display = "flex"; 
}
function closeModal() { 
    document.getElementById("imageModal").style.display = "none"; 
}