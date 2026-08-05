export type StoreProductKey =
  | "temple_incense"
  | "blessing_month"
  | "blessing_100days"
  | "blessing_year"
  | "fortune_draw"
  | "fortune_divination"
  | "fortune_bazi"
  | "fortune_naming"
  | "fortune_palmistry";

export type StoreProduct = {
  key: StoreProductKey;
  title: string;
  amount: number;
  url: string;
};

/**
 * 链动小铺的公开商品链接。只有在商品上架后才向用户开放。
 * 支付后的权益开通必须由回调或后台核验完成，前端不能自行标记已支付。
 */
export const STORE_PRODUCTS: Record<StoreProductKey, StoreProduct> = {
  temple_incense: { key: "temple_incense", title: "一炷清香·30分钟心愿记录", amount: 2.9, url: "https://pay.ldxp.cn/item/mtsdjs" },
  blessing_month: { key: "blessing_month", title: "一月供灯·心愿记录保管", amount: 2.9, url: "https://pay.ldxp.cn/item/nekzww" },
  blessing_100days: { key: "blessing_100days", title: "百日供灯·心愿记录保管", amount: 6.9, url: "https://pay.ldxp.cn/item/y9jwxx" },
  blessing_year: { key: "blessing_year", title: "一年供灯·心愿记录保管", amount: 9.9, url: "https://pay.ldxp.cn/item/esuz9d" },
  fortune_draw: { key: "fortune_draw", title: "灵签完整解读", amount: 2.9, url: "https://pay.ldxp.cn/item/dzxifh" },
  fortune_divination: { key: "fortune_divination", title: "六爻完整卦解", amount: 2.9, url: "https://pay.ldxp.cn/item/4wx0jb" },
  fortune_bazi: { key: "fortune_bazi", title: "八字精批完整解读", amount: 19.9, url: "https://pay.ldxp.cn/item/ww0vq9" },
  fortune_naming: { key: "fortune_naming", title: "宝宝起名完整方案", amount: 29.9, url: "https://pay.ldxp.cn/item/8y6tv3" },
  fortune_palmistry: { key: "fortune_palmistry", title: "手面相完整解读", amount: 29.9, url: "https://pay.ldxp.cn/item/rbt42x" },
};

export function blessingProductKey(duration: string): StoreProductKey | null {
  if (duration === "month") return "blessing_month";
  if (duration === "100days") return "blessing_100days";
  if (duration === "year") return "blessing_year";
  return null;
}

export function resolveStoreProduct(type: string, amount?: number, duration?: string): StoreProduct | null {
  if (type === "blessing_lamp") {
    const key = blessingProductKey(duration || (amount === 6.9 ? "100days" : amount === 9.9 ? "year" : "month"));
    return key === "blessing_100days" || key === "blessing_year" ? STORE_PRODUCTS[key] : null;
  }
  return null;
}
