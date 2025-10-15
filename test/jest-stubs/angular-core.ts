// Minimál Angular core stub – csak annyi, hogy a dekorátorok lefussanak.

export function Component(_meta?: any): any {
  return function (target: any) { return target; };
}
export function Injectable(_meta?: any): any {
  return function (target: any) { return target; };
}
export function NgModule(_meta?: any): any {
  return function (target: any) { return target; };
}

export function ViewChild(_sel?: any, _opts?: any): any {
  return function (_target: any, _key: string) {};
}
export function ViewChildren(_sel?: any, _opts?: any): any {
  return function (_target: any, _key: string) {};
}

export class ElementRef<T = any> {
  constructor(public nativeElement?: T) {}
}
export class QueryList<T> {
  toArray(): T[] { return []; }
  forEach(_fn: (v: T) => void) {}
}

// Életciklus „interfészek” (üres jelölők)
export interface OnInit {}
export interface OnDestroy {}
