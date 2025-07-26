#!/bin/bash

# Update all pages to use AppLayout instead of Sidebar

files=(
  "src/app/settings/page.tsx"
  "src/app/recommendations/page.tsx"
  "src/app/positions/page.tsx"
  "src/app/analytics/forecast/page.tsx"
  "src/app/analytics/targets/page.tsx"
  "src/app/analytics/dividends/page.tsx"
)

for file in "${files[@]}"; do
  echo "Updating $file..."
  
  # Replace import statement
  sed -i '' "s/import { Sidebar } from '@\/components\/layout\/Sidebar';/import { AppLayout } from '@\/components\/layout\/AppLayout';/g" "$file"
  
  # Replace the wrapping div structure
  # Pattern 1: <div className="min-h-screen ..."> <Sidebar /> <main className="ml-64 ...">
  sed -i '' ':a; N; $!ba; s/<div className="min-h-screen[^>]*">\n[[:space:]]*<Sidebar \/>\n[[:space:]]*<main className="ml-[0-9]* [^>]*">/<AppLayout>\n      <div>/g' "$file"
  
  # Replace closing tags
  sed -i '' ':a; N; $!ba; s/<\/main>\n[[:space:]]*<\/div>\n[[:space:]]*);/<\/div>\n    <\/AppLayout>\n  );/g' "$file"
  
  echo "Done updating $file"
done

echo "All files updated!"