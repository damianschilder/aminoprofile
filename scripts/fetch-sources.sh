#!/usr/bin/env bash
# Downloads the food composition sources that can be fetched directly into data/sources/ (not
# committed). BLS 4.0 and Frida 5.5 come with one-time links and are placed there by hand:
#   data/sources/bls/BLS_4_0_2025_DE/BLS_4_0_Daten_2025_DE.xlsx  (https://blsdb.de/bls)
#   data/sources/frida/Frida_5.5_Dataset.xlsx                     (https://doi.org/10.11583/DTU.29500682)
# Prints a SHA-256 of every file, so a build can say exactly which release it used.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/sources/usda data/sources/mext

# USDA FoodData Central: SR Legacy (final release, April 2018) and the newest Foundation Foods.
curl -fsSL -o data/sources/usda/sr_legacy_csv.zip \
  https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
foundation=$(curl -fsSL https://fdc.nal.usda.gov/download-datasets \
  | grep -o 'fdc-datasets/FoodData_Central_foundation_food_csv_[0-9-]*\.zip' | sort -u | tail -1)
echo "Foundation Foods: $foundation"
curl -fsSL -o data/sources/usda/foundation_csv.zip "https://fdc.nal.usda.gov/$foundation"

# MEXT, Standard Tables of Food Composition in Japan 2020, amino acids, enlarged 2023, revised
# 27 March 2026. Table 1: per 100 g edible portion. The other tables include the one per gram of
# reference nitrogen, needed to know each food's nitrogen.
base=https://www.mext.go.jp/content/20260327-mxt_kagsei-mext-000029402
for n in 04 05 06 07; do
  curl -fsSL -o "data/sources/mext/table_${n}.xlsx" "${base}_${n}.xlsx"
done

sha256sum data/sources/usda/*.zip data/sources/mext/*.xlsx
