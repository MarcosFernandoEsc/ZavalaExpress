#!/bin/bash
# Script para actualizar URL en ambas apps rápidamente
# Uso: ./update-url.sh "https://tu-url-aqui"

if [ -z "$1" ]; then
  echo "Uso: ./update-url.sh \"https://tu-url-aqui\""
  echo "Ejemplo: ./update-url.sh \"https://zavala.empresa.com\""
  exit 1
fi

URL=$1

echo "Actualizando URL a: $URL"

# Actualizar desktop
sed -i "s|\"appUrl\": \".*\"|\"appUrl\": \"$URL\"|g" desktop/config.json
echo "✓ Actualizado: desktop/config.json"

# Actualizar mobile
sed -i "s|\"url\": \".*\"|\"url\": \"$URL\"|g" mobile/capacitor.config.json
echo "✓ Actualizado: mobile/capacitor.config.json"

echo ""
echo "URL configurada en ambas apps:"
grep -r "appUrl\|\"url\"" desktop/config.json mobile/capacitor.config.json

echo ""
echo "Listo para compilar."
