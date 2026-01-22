function renderGSInvestList() {
    const body = document.getElementById('invest-body');
    if (!body) return;
    body.innerHTML = "";

    const sorted = [...gs_investData].sort((a, b) => (parseFloat(b.change) || 0) - (parseFloat(a.change) || 0));

    sorted.forEach(item => {
        // --- 데이터 전처리 ---
        const price = parseFloat(item.price) || 0;
        const changeVal = parseFloat(item.change) || 0;
        const pe = parseFloat(item.pe) || 0;
        const beta = parseFloat(item.beta) || 0;
        const high52 = parseFloat(item.h52) || 0;
        const low52 = parseFloat(item.l52) || 0;
        
        // 1. 52주 가격 위치 계산 (현재가가 최저~최고 중 어디쯤인지 %)
        // 수식: (현재가 - 최저가) / (최고가 - 최저가) * 100
        const rangePercent = high52 !== low52 ? ((price - low52) / (high52 - low52)) * 100 : 0;

        // 2. 조건부 서식 로직
        const peClass = (pe > 0 && pe < 10) ? "good" : ""; // PER 10미만 저평가 초록색
        const betaClass = (beta > 1.3) ? "warning" : ""; // 베타 1.3이상 고변동 오렌지색
        const colorClass = changeVal > 0 ? "up" : (changeVal < 0 ? "down" : "");

        const currency = item.curr === "KRW" ? "₩" : (item.curr === "USD" ? "$" : "");
        const marketCap = item.mc ? (parseFloat(item.mc) / 1000000000000).toFixed(1) + "조" : "-";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="stock-name">${item.title}</span>
                <span class="badge">${item.sector || "기타"}</span>
            </td>
            <td>
                <div class="stock-price">${currency}${item.price}</div>
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
                <div style="font-size:0.65rem; color:#555; display:flex; justify-content:space-between;">
                    <span>${low52}</span><span>${high52}</span>
                </div>
                <div class="range-container">
                    <div class="range-bar" style="width: 100%;"></div>
                    <div class="current-dot" style="left: ${rangePercent}%;"></div>
                </div>
                <div style="font-size:0.6rem; color:#444; margin-top:4px; text-align:center;">52주 범위 내 위치</div>
            </td>
            <td><div style="color:#666; font-size:0.75rem; line-height:1.4;">${item.note}</div></td>
        `;
        body.appendChild(tr);
    });
}