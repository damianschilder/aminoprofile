export type DataType = 'Branded' | 'SR Legacy' | 'Survey (FNDDS)' | 'Foundation';

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

export interface SearchFoodDataResponse {
  foods: Food[];
}
