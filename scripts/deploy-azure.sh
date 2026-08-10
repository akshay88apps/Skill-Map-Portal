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
deployment_environment="${AZURE_DEPLOY_ENVIRONMENT:-prod}"
deployment_group="${AZURE_RESOURCE_GROUP:-rg-skillmap-${deployment_environment}}"
deployment_name="skillmap-${deployment_environment}"
leader_group_id="${AZURE_LEADER_GROUP_ID:-}"
image_tag="${AZURE_IMAGE_TAG:-$(git rev-parse --short HEAD)}"

if [ "$deployment_environment" != "prod" ]; then
  echo "Refusing to deploy a second Azure environment. AZURE_DEPLOY_ENVIRONMENT must be prod." >&2
  exit 1
fi

existing_image="$(az containerapp show \
  --name "skillmap-${deployment_environment}-web" \
  --resource-group "$deployment_group" \
  --query properties.template.containers[0].image \
  --output tsv 2>/dev/null || true)"
infrastructure_image="${existing_image:-mcr.microsoft.com/azuredocs/containerapps-helloworld:latest}"

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
    imageUri="$infrastructure_image" \
  --output none

registry_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerRegistryName.value -o tsv)"
registry_server="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerRegistryLoginServer.value -o tsv)"
container_app_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerAppName.value -o tsv)"
container_environment_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.containerAppEnvironmentName.value -o tsv)"
notification_job_name="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.notificationJobName.value -o tsv)"
application_url="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.applicationUrl.value -o tsv)"
redirect_uri="$(az deployment group show --name "$deployment_name" --resource-group "$deployment_group" --query properties.outputs.entraRedirectUri.value -o tsv)"
image_uri="${registry_server}/skillmap:${image_tag}"

echo "Updating the Microsoft Entra application URLs"
existing_redirects="$(az ad app show --id "$AZURE_ENTRA_CLIENT_ID" --query web.redirectUris -o tsv)"
if printf '%s\n' "$existing_redirects" | grep -Fqx "$redirect_uri"; then
  set -- $existing_redirects
else
  set -- $existing_redirects "$redirect_uri"
fi
az ad app update \
  --id "$AZURE_ENTRA_CLIENT_ID" \
  --web-home-page-url "$application_url" \
  --web-redirect-uris "$@" \
  --output none

echo "Building the image remotely in Azure Container Registry"
az acr build \
  --registry "$registry_name" \
  --image "skillmap:${image_tag}" \
  --file Dockerfile \
  .

echo "Preparing an isolated Container Apps candidate revision"
az containerapp revision set-mode \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --mode multiple \
  --output none
stable_revision="$(az containerapp show --name "$container_app_name" --resource-group "$deployment_group" --query 'properties.configuration.ingress.traffic[?weight == `100`].revisionName | [0]' -o tsv)"
if [ -z "$stable_revision" ]; then
  stable_revision="$(az containerapp show --name "$container_app_name" --resource-group "$deployment_group" --query properties.latestRevisionName -o tsv)"
fi
stable_image="$(az containerapp revision show --name "$container_app_name" --resource-group "$deployment_group" --revision "$stable_revision" --query properties.template.containers[0].image -o tsv)"
az containerapp ingress traffic set \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --revision-weight "${stable_revision}=100" \
  --output none
revision_suffix="candidate-$(printf '%s' "$image_tag" | tr '[:upper:]_' '[:lower:]-' | tr -cd 'a-z0-9-' | cut -c1-24)-$(date +%s)"
az containerapp update \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --image "$image_uri" \
  --revision-suffix "$revision_suffix" \
  --set-env-vars "APP_BASE_URL=$application_url" "AUTH_URL=$application_url" \
  --output none

candidate_revision="$(az containerapp show --name "$container_app_name" --resource-group "$deployment_group" --query properties.latestRevisionName -o tsv)"
environment_domain="$(az containerapp env show --name "$container_environment_name" --resource-group "$deployment_group" --query properties.defaultDomain -o tsv)"
candidate_url="https://${candidate_revision}.${environment_domain}"

echo "Waiting for the zero-traffic candidate health check: $candidate_revision"
health_attempt=1
while [ "$health_attempt" -le 30 ]; do
  if curl --fail --silent --show-error "$candidate_url/api/health"; then
    echo
    break
  fi
  if [ "$health_attempt" -eq 30 ]; then
    echo "Candidate failed health checks; stable revision remains at 100% traffic." >&2
    exit 1
  fi
  health_attempt=$((health_attempt + 1))
  sleep 10
done

echo "Deploying the image to the scheduled notification job"
az containerapp job update \
  --name "$notification_job_name" \
  --resource-group "$deployment_group" \
  --image "$image_uri" \
  --output none

echo "Promoting the verified candidate to 100% traffic"
az containerapp ingress traffic set \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --revision-weight "${candidate_revision}=100" \
  --output none

echo "Waiting for the database-backed health check"
health_attempt=1
while [ "$health_attempt" -le 30 ]; do
  if curl --fail --silent --show-error "$application_url/api/health"; then
    echo
    if [ "$stable_revision" != "$candidate_revision" ]; then
      az containerapp revision deactivate \
        --name "$container_app_name" \
        --resource-group "$deployment_group" \
        --revision "$stable_revision" \
        --output none
    fi
    echo "Deployment is healthy: $application_url"
    echo "Microsoft Entra callback: $redirect_uri"
    exit 0
  fi
  health_attempt=$((health_attempt + 1))
  sleep 10
done

echo "Promoted revision failed the canonical health check; rolling traffic and the notification job back." >&2
az containerapp ingress traffic set \
  --name "$container_app_name" \
  --resource-group "$deployment_group" \
  --revision-weight "${stable_revision}=100" \
  --output none
az containerapp job update \
  --name "$notification_job_name" \
  --resource-group "$deployment_group" \
  --image "$stable_image" \
  --output none
echo "Inspect logs with: az containerapp logs show --name $container_app_name --resource-group $deployment_group --follow" >&2
exit 1
