export type DataType = 'Branded' | 'SR Legacy' | 'Survey (FNDDS)' | 'Foundation';
export interface DataTypeObject {
  Branded: number
  "Survey (FNDDS)": number
  "SR Legacy": number
  Foundation: number
  Experimental: number
}

export interface FoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  derivationCode: string;
  derivationDescription: string;
  derivationId: number;
  value: number;
  foodNutrientSourceId: number;
  foodNutrientSourceCode: string;
  foodNutrientSourceDescription: string;
  rank: number;
  indentLevel: number;
  foodNutrientId: number;
  dataPoints?: number;
  min?: number;
  max?: number;
  median?: number;
}

export interface Food {
  fdcId: number;
  description: string;
  commonNames: string;
  additionalDescriptions: string;
  dataType: DataType;
  ndbNumber: number;
  publishedDate: string;
  foodCategory: string;
  mostRecentAcquisitionDate: string;
  allHighlightFields: string;
  score: number;
  microbes: any[];
  foodNutrients: FoodNutrient[];
  finalFoodInputFoods: any[];
  foodMeasures: any[];
  foodAttributes: any[];
  foodAttributeTypes: any[];
  foodVersionIds: any[];
}

export interface FoodSearchCriteria {
  dataType: string[];
  query: string;
  generalSearchInput: string;
  pageNumber: number;
  numberOfResultsPerPage: number;
  pageSize: number;
  requireAllWords: boolean;
  foodTypes: string[];
}

export interface Aggregations {
  dataType: DataTypeObject;
  nutrients: {};
}
export interface SearchFoodDataResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  pageList: number[]
  foodSearchCriteria: FoodSearchCriteria
  foods: Food[]
  aggregations: Aggregations
}