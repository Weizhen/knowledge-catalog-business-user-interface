# Knowledge Catalog Buisness Interface - backend
built on node js and express to communicate with GCP Knowledge Catalog

Just open this directory to terminal
set the GOOGLE_CLOUD_PROJECT_ID to your project ID in .env.test file
you can change the GCP_LOCATION as per the preference

## Steward writes (UpdateEntry)

Set `ENABLE_ENTRY_WRITES=true` to enable:

- `POST /api/v1/check-entry-write-access`
- `POST /api/v1/update-entry`

When unset/false, write routes refuse updates (safe default). Pair with frontend `VITE_FEATURE_STEWARD_EDIT=true` and steward IAM (`dataplex.entries.update` or `dataplex.entryGroups.updateEntries`).

then just run
```shell
npm install -f 
npm start || npm run start
```
