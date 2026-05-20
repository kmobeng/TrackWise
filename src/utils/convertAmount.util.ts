export const toPesewas = (cedis: number): number => Math.round(cedis * 100);

export const toCedis = (pesewas: number): number => pesewas / 100;
