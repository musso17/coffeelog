export function cupsPerBag(bag_weight_g: number, dose_g: number) {
  return bag_weight_g && dose_g ? bag_weight_g / dose_g : 0;
}

export function costPerCup(
  purchase_price: number,
  bag_weight_g: number,
  dose_g: number,
) {
  if (!purchase_price || !bag_weight_g || !dose_g) return null;
  return +(purchase_price / (bag_weight_g / dose_g)).toFixed(2);
}
