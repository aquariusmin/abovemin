export default function Home() {
  // 포인트 컬러: 차분한 포레스트 카키 (#4A5D4E)
  const accentColor = "text-[#4A5D4E]";
  const accentBg = "bg-[#4A5D4E]";

  return (
    // 배경: 따뜻한 종이 질감의 오프화이트 (#FAF9F6)
    <main className="min-h-screen bg-[#FAF9F6] text-[#333] px-8 py-12 font-serif">

      {/* 2. 히어로 섹션: 카키색 오버레이 적용 */}
      <div className="max-w-6xl mx-auto mb-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-8 aspect-[16/10] bg-gray-200 relative overflow-hidden rounded-sm shadow-xl shadow-gray-200/40">
          <img 
            src="https://images.unsplash.com/photo-1493246507139-91e8bef99c02" 
            className="object-cover w-full h-full grayscale-[10%]"
            alt="Hero"
          />
          {/* 사진 위에 얹은 카키색 오버레이 (부드러운 느낌) */}
          <div className="absolute inset-0 bg-[#4A5D4E]/10 mix-blend-multiply"></div>
        </div>
        
        <div className="md:col-span-4 space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Collecting<br />
            the <span className={accentColor}>Greenery</span>
          </h2>
          <p className="font-sans text-sm text-gray-500 leading-relaxed">
            무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록. <br />
            phorage는 자연과 일상이 교차하는 지점을 기록합니다.
          </p>
        </div>
      </div>

      {/* 3. 소품샵 미리보기 */}
      <section className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h3 className="text-2xl font-bold">New Collectibles</h3>
            <p className="text-xs text-gray-400 mt-2 font-sans">주인장이 엄선한 이달의 소품</p>
          </div>
          <a href="/shop" className={`px-6 py-2 font-sans text-[10px] uppercase tracking-widest text-white ${accentBg} rounded-sm shadow-md`}>
            Explore All
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { id: 1, name: "Olive Leaf Poster", price: "18,000" },
            { id: 2, name: "Sage Pencil Set", price: "8,000" },
            { id: 3, name: "Forest Postcard Pack", price: "12,000" },
            { id: 4, name: "Khaki Canvas Bag", price: "24,000" },
          ].map((item) => (
            <div key={item.id} className="space-y-4 group cursor-pointer">
              <div className="aspect-square bg-white rounded-sm overflow-hidden border border-gray-100 group-hover:border-[#4A5D4E]/50 transition-all">
                {/* 굿즈 이미지가 들어갈 자리 */}
                <div className={`w-full h-full opacity-5 ${accentBg}`}></div>
              </div>
              <p className="font-sans text-sm font-medium">{item.name}</p>
              <p className={`font-sans text-xs ${accentColor}`}>₩ {item.price}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}