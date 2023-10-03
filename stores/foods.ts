export const useFoodsStore = defineStore('foods', () => {
  const loading = ref<Boolean>(false)
  const error = ref<Boolean>(false)
  const searchQuery = ref<String>('');
  const foods = ref<Food[]>([]);
  const selectedFoods = ref<Map<string, Food>>(new Map());

  async function searchFoods(query: string, key: string) {
    loading.value = true;
    searchQuery.value = query;
    try {
      const response: SearchFoodDataResponse= await $fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
        method: 'POST',
        body: {
          query, 
          dataType: ["Foundation"], 
          // "sortBy": "foodNutrients", 
          // "sortOrder": "desc"
        }
      });
      foods.value = response.foods
      error.value = false;
    } catch (e) {
      error.value = true;
    } finally {
      loading.value = true;
    }
  }
  return { loading, error, foods, selectedFoods, searchFoods }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFoodsStore as any, import.meta.hot))
}