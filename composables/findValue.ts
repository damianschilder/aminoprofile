export default function findValue(foodNutrients: Food['foodNutrients'], nutrientId: FoodNutrient['nutrientId']) {
  const result = foodNutrients.find((nutrient: FoodNutrient) => {
  return nutrient.nutrientId === nutrientId
  })
  if (result) return Math.round((result.value + Number.EPSILON) * 100) / 100
  return 'N/a';
}