#!/bin/sh
set -eu

: "${AZURE_POSTGRES_ADMIN_PASSWORD:?Missing required environment variable: AZURE_POSTGRES_ADMIN_PASSWORD}"
: "${AZURE_AUTH_SECRET:?Missing required environment variable: AZURE_AUTH_SECRET}"
: "${AZURE_ENTRA_CLIENT_ID:?Missing required environment variable: AZURE_ENTRA_CLIENT_ID}"
: "${AZURE_ENTRA_CLIENT_SECRET:?Missing required environment variable: AZURE_ENTRA_CLIENT_SECRET}"
: "${AZURE_ENTRA_ISSUER:?Missing required environment variable: AZURE_ENTRA_ISSUER}"
: "${AZURE_ADMIN_GROUP_ID:?Missing required environment variable: AZURE_ADMIN_GROUP_ID}"
: "${AZURE_CRON_SECRET:?Missing required environment variable: AZURE_CRON_SECRET}"

deployment_location="${AZURE_DEPLOY_LOCATION:-centralindia}"
deployment_environment="${AZURE_DEPLOY_ENVIRONMENT:-dev}"
deployment_group="${AZURE_RESOURCE_GROUP:-rg-skillmap-${deployment_environment}}"
deployment_name="skillmap-${deployment_environment}"
leader_group_id="${AZURE_LEADER_GROUP_ID:-}"
image_tag="${AZURE_IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "Using subscription: $(az account show --query name -o tsv)"
echo "Registering the Azure Communication Services resource provider"
az provider register --namespace Microsoft.Communication --wait
echo "Registering the Azure Storage resource provider"
az provider register --namespace Microsoft.Storage --wait
echo "Preparing resource group $deployment_group in $deployment_location"
az group create --name "$deployment_group" --location "$deployment_location" --output none

echo "Provisioning Azure infrastructure"
az deployment group create \
  --name "$deployment_name" \
  --resource-group "$deployment_group" \
  --template-file infra/azure/main.bicep \
  --parameters \
    environmentName="$deployment_environment" \
    location="$deployment_location" \
    postgresAdminPassword="$AZURE_POSTGRES_ADMIN_PASSWORD" \
    authSecret="$AZURE_AUTH_SECRET" \
    entraClientId="$AZURE_ENTRA_CLIENT_ID" \
    entraClientSecret="$AZURE_ENTRA_CLIENT_SECRET" \
    entraIssuer="$AZURE_ENTRA_ISSUER" \
    adminGroupId="$AZURE_ADMIN_GROUP_ID" \
    leaderGroupId="$leader_group_id" \
    cronSecret="$AZURE_CRON_SECRET" \
  --output none

registry_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerRegistryName.value -o tsv)"
registry_server="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerRegistryLoginServer.value -o tsv)"
container_app_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerAppName.value -o tsv)"
notification_job_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.notificationJobName.value -o tsv)"
application_url="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.applicationUrl.value -o tsv)"
redirect_uri="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.entraRedirectUri.value -o tsv)"
image_uri="${registry_server}/skillmap:${image_tag}"

echo "Updating the Microsoft Entra application URLs"
az ad app update \
  --id "$AZURE_ENTRA_CLIENT_ID" \
  --web-home-page-url "$application_url" \
  --web-redirect-uris "$redirect_uri" \
  --output none

echo "Building the image remotely in Azure Container Registry"
az acr build \
  --registry "$registry_name" \
  --image "skillmap:${image_tag}" \
  --file Dockerfile \
  .

echo "Deploying image to Azure Container Apps"
az containerapp update \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --image "$image_uri" \
  --set-env-vars "APP_BASE_URL=$application_url" "AUTH_URL=$application_url" \
  --output none

echo "Deploying the image to the scheduled notification job"
az containerapp job update \
  --name "$notification_job_name" \
  --resource-group "$deployment_group" \
  --image "$image_uri" \
  --output none

echo "Waiting for the database-backed health check"
health_attempt=1
while [ "$health_attempt" -le 30 ]; do
  if curl --fail --silent --show-error "$application_url/api/health"; then
    echo
    echo "Deployment is healthy: $application_url"
    echo "Microsoft Entra callback: $redirect_uri"
    exit 0
  fi
  health_attempt=$((health_attempt + 1))
  sleep 10
done

echo "Deployment completed, but the health endpoint did not become ready." >&2
echo "Inspect logs with: az containerapp logs show --name $container_app_name --resource-group $deployment_group --follow" >&2
exit 1
