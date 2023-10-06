export const useFoodsStore = defineStore('foods', () => {
  const loading = ref<Boolean>(false)
  const error = ref<Boolean>(false)
  const searchQuery = ref<String>('');
  const results = ref<Food[]>([]);
  const shownFoods = ref<Food[]>([]);
  const selectedFoods = ref<Array<Food['fdcId']>>([]);
  const responseHits = ref<SearchFoodDataResponse['totalHits']>(null)

  async function searchFoods(query: string, key: string) {
    loading.value = true;
    searchQuery.value = query;
    try {
      const response: SearchFoodDataResponse = await $fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
        method: 'POST',
        body: {
          query, 
          dataType: ["Foundation"], 
        }
      });
      results.value = response.foods
      responseHits.value = response.totalHits
      error.value = false;
    } catch (e) {
      error.value = true;
    } finally {
      loading.value = true;
    }
  }
  return { loading, error, results, shownFoods, selectedFoods, responseHits, searchFoods }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFoodsStore as any, import.meta.hot))
}