import { defineStore, acceptHMRUpdate } from 'pinia'

export const useFoodsStore = defineStore('foods', () => {
  const loading = ref(false)
  const searchQuery = ref();
  const foods = ref([]);
  const selectedFoods = ref(new Map());

  async function searchFoods(query, key) {
    loading.value = true;
    searchQuery.value = query;
    try {
      const response = await $fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}`, {
        method: 'POST',
        body: {
          query: query, 
          dataType: ["Foundation"], 
          // "sortBy": "foodNutrients", 
          // "sortOrder": "desc"
        }
      });
      foods.value = response.foods
    } catch (error) {
    } finally {
      loading.value = true;
    }
  }
  return { loading, foods, selectedFoods, searchFoods }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFoodsStore as any, import.meta.hot))
}