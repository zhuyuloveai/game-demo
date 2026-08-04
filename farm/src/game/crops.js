// ===== 作物定义（单一种植源，UI 与田地共用）=====
// growTime: 成熟所需秒数（实时生长）；price: 收获所得金币
export const CROPS = [
  { id: "carrot", name: "胡萝卜", emoji: "🥕", growTime: 12, price: 5 },
  { id: "tomato", name: "番茄", emoji: "🍅", growTime: 30, price: 18 },
  { id: "corn", name: "玉米", emoji: "🌽", growTime: 60, price: 40 },
];

export const cropById = (id) => CROPS.find((c) => c.id === id);
