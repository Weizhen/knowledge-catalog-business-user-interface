#!/bin/sh

ASSETS_DIR=/app/dist/assets

echo "Steward edit env: ENABLE_ENTRY_WRITES=${ENABLE_ENTRY_WRITES:-unset} VITE_FEATURE_STEWARD_EDIT=${VITE_FEATURE_STEWARD_EDIT:-unset}"

find $ASSETS_DIR -type f -name "*.js" -print0 | while IFS= read -r -d $'\0' file; do
  echo "Processing $file ..."
  # Replace placeholders with actual environment variable values
  sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
  sed -i "s|__VITE_API_VERSION__|${VITE_API_VERSION}|g" "$file"
  sed -i "s|__VITE_ADMIN_EMAIL__|${VITE_ADMIN_EMAIL}|g" "$file"
  sed -i "s|__VITE_GOOGLE_PROJECT_ID__|${VITE_GOOGLE_PROJECT_ID}|g" "$file"
  sed -i "s|__VITE_GOOGLE_CLIENT_ID__|${VITE_GOOGLE_CLIENT_ID}|g" "$file"
  sed -i "s|__VITE_GOOGLE_REDIRECT_URI__|${VITE_GOOGLE_REDIRECT_URI}|g" "$file"
  sed -i "s|__VITE_IS_SERVICE_ACCOUNT__|${VITE_IS_SERVICE_ACCOUNT}|g" "$file"
  sed -i "s|__VITE_FEATURE_STEWARD_EDIT__|${VITE_FEATURE_STEWARD_EDIT:-false}|g" "$file"
done

# Start backend directly (avoid `npm start` → `--env-file=.env.test`, which can
# load local ENABLE_ENTRY_WRITES=false and confuse Cloud Run rollouts).
echo "env setup done; starting node server.js"
exec node server.js
