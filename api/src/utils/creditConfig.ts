import CreditConfig, { ICreditConfig } from "../models/creditConfig.model";


let _cache: ICreditConfig | null = null;
let _cacheTime = 0;
const TTL = 30_000;


export async function getCreditConfig(): Promise<ICreditConfig> {
    const now = Date.now();
    if (_cache && now - _cacheTime < TTL) return _cache;


    let cfg = await CreditConfig.findOne();
    if (!cfg) {
        cfg = await CreditConfig.create({});
    }
    _cache = cfg;
    _cacheTime = now;
    return cfg;
}


export function invalidateCreditConfigCache() {
    _cache = null;
    _cacheTime = 0;
}