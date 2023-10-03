export default function findValue(foodNutrients: Food['foodNutrients'], nutrientId: FoodNutrient['nutrientId']) {
  const result = foodNutrients.find((nutrient: FoodNutrient) => {
  return nutrient.nutrientId === nutrientId
  })
  if (result) return result.value
  return 'N/a';
}