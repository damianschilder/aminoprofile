export const useFoodsStore = defineStore('foods', () => {
  const loading = ref<Boolean>(false)
  const error = ref<Boolean>(false)
  const searchQuery = ref<String>('');
  const results = ref<Food[]>([]);
  const shownFoods = ref<Food[]>([]);
  const selectedFoods = ref<Array<Food['fdcId']>>([]);
  const responseHits = ref<SearchFoodDataResponse['totalHits']>(null)

  async function searchFoods(query: string) {
    loading.value = true;
    searchQuery.value = query;
    try {
      // The server route asks FoodData Central with the private API key (server/api/foods/search.get.ts).
      const response: SearchFoodDataResponse = await $fetch('/api/foods/search', {
        query: { query },
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