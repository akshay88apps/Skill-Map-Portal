targetScope = 'resourceGroup'

@description('Deployment environment name used for tags and resource naming.')
@minLength(2)
@maxLength(12)
param environmentName string = 'dev'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Initial image. The deployment script replaces this with the image built in ACR.')
param imageUri string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('PostgreSQL administrator login.')
param postgresAdminUser string = 'skillmapadmin'

@secure()
@minLength(16)
param postgresAdminPassword string

@secure()
@minLength(32)
param authSecret string

param entraClientId string

@secure()
param entraClientSecret string

@description('Microsoft Entra issuer, for example https://login.microsoftonline.com/<tenant-id>/v2.0')
param entraIssuer string

param adminGroupId string
param leaderGroupId string = ''

@secure()
@minLength(24)
param cronSecret string

var suffix = take(uniqueString(subscription().id, resourceGroup().id), 10)
var prefix = 'skillmap-${environmentName}'
var containerRegistryName = 'skillmap${environmentName}${suffix}'
var storageAccountName = 'sm${take(environmentName, 6)}${suffix}'
var certificationsContainerName = 'certifications'
var postgresServerName = 'skillmap-${environmentName}-${suffix}'
var keyVaultName = 'sm-${environmentName}-${suffix}'
var emailServiceName = 'skillmap-${environmentName}-${suffix}-email'
var communicationServiceName = 'skillmap-${environmentName}-${suffix}-communication'
var databaseName = 'skillportal'
var postgresConnectionString = 'postgresql://${postgresAdminUser}:${uriComponent(postgresAdminPassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/${databaseName}?schema=public&sslmode=require'
var commonTags = {
  application: 'skill-map-portal'
  environment: environmentName
  managedBy: 'bicep'
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-identity'
  location: location
  tags: commonTags
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  tags: commonTags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource registryPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, 'acrpull')
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storage
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource certificationsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: certificationsContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'storage-blob-data-contributor')
  scope: storage
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: emailServiceName
  location: 'global'
  tags: commonTags
  properties: {
    dataLocation: 'India'
  }
}

resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  name: 'AzureManagedDomain'
  parent: emailService
  location: 'global'
  tags: commonTags
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: commonTags
  properties: {
    dataLocation: 'India'
    linkedDomains: [
      emailDomain.id
    ]
  }
}

resource network 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${prefix}-vnet'
  location: location
  tags: commonTags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.42.0.0/16'
      ]
    }
  }
}

resource appSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  name: 'container-apps'
  parent: network
  properties: {
    addressPrefix: '10.42.0.0/23'
    delegations: [
      {
        name: 'container-apps-delegation'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
  }
}

resource databaseSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  name: 'postgresql'
  parent: network
  properties: {
    addressPrefix: '10.42.10.0/28'
    delegations: [
      {
        name: 'postgresql-delegation'
        properties: {
          serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
        }
      }
    ]
  }
}

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'skillmap.${environmentName}.postgres.database.azure.com'
  location: 'global'
  tags: commonTags
}

resource privateDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  name: '${prefix}-postgres-link'
  parent: privateDnsZone
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: network.id
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: databaseSubnet.id
      privateDnsZoneArmResourceId: privateDnsZone.id
      publicNetworkAccess: 'Disabled'
    }
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
  }
  dependsOn: [
    privateDnsLink
  ]
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: databaseName
  parent: postgres
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: identity.properties.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'database-url'
  parent: vault
  properties: {
    value: postgresConnectionString
  }
  dependsOn: [
    database
  ]
}

resource authSecretValue 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'auth-secret'
  parent: vault
  properties: {
    value: authSecret
  }
}

resource entraClientSecretValue 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'entra-client-secret'
  parent: vault
  properties: {
    value: entraClientSecret
  }
}

resource cronSecretValue 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'cron-secret'
  parent: vault
  properties: {
    value: cronSecret
  }
}

resource communicationConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'acs-email-connection-string'
  parent: vault
  properties: {
    value: communicationService.listKeys().primaryConnectionString
  }
}

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  tags: commonTags
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource containerEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-environment'
  location: location
  tags: commonTags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: appSubnet.id
      internal: false
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-web'
  location: location
  tags: union(commonTags, {
    'azd-env-name': environmentName
    'azd-service-name': 'web'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    environmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
        }
      ]
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: databaseUrlSecret.properties.secretUri
          identity: identity.id
        }
        {
          name: 'auth-secret'
          keyVaultUrl: authSecretValue.properties.secretUri
          identity: identity.id
        }
        {
          name: 'entra-client-secret'
          keyVaultUrl: entraClientSecretValue.properties.secretUri
          identity: identity.id
        }
        {
          name: 'cron-secret'
          keyVaultUrl: cronSecretValue.properties.secretUri
          identity: identity.id
        }
        {
          name: 'acs-email-connection-string'
          keyVaultUrl: communicationConnectionStringSecret.properties.secretUri
          identity: identity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: imageUri
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'AUTH_SECRET'
              secretRef: 'auth-secret'
            }
            {
              name: 'AUTH_MICROSOFT_ENTRA_ID_ID'
              value: entraClientId
            }
            {
              name: 'AUTH_MICROSOFT_ENTRA_ID_SECRET'
              secretRef: 'entra-client-secret'
            }
            {
              name: 'AUTH_MICROSOFT_ENTRA_ID_ISSUER'
              value: entraIssuer
            }
            {
              name: 'AUTH_ADMIN_GROUP_ID'
              value: adminGroupId
            }
            {
              name: 'AUTH_LEADER_GROUP_ID'
              value: leaderGroupId
            }
            {
              name: 'AUTH_TRUST_HOST'
              value: 'true'
            }
            {
              name: 'CRON_SECRET'
              secretRef: 'cron-secret'
            }
            {
              name: 'ACS_EMAIL_CONNECTION_STRING'
              secretRef: 'acs-email-connection-string'
            }
            {
              name: 'ACS_EMAIL_SENDER_ADDRESS'
              value: 'DoNotReply@${emailDomain.properties.fromSenderDomain}'
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: identity.properties.clientId
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storage.name
            }
            {
              name: 'AZURE_STORAGE_CERTIFICATIONS_CONTAINER'
              value: certificationsContainerName
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
  dependsOn: [
    registryPull
    storageBlobContributor
    certificationsContainer
  ]
}

resource notificationJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${prefix}-notifications'
  location: location
  tags: union(commonTags, {
    'azd-env-name': environmentName
    'azd-service-name': 'notifications'
  })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    environmentId: containerEnvironment.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 300
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: '*/15 * * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
        }
      ]
      secrets: [
        {
          name: 'cron-secret'
          keyVaultUrl: cronSecretValue.properties.secretUri
          identity: identity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'notifications'
          image: imageUri
          command: [
            'sh'
            '-c'
          ]
          args: [
            'wget -q -O - --header="Authorization: Bearer $CRON_SECRET" --post-data="" "$APP_BASE_URL/api/notifications/run"'
          ]
          env: [
            {
              name: 'APP_BASE_URL'
              value: 'https://${containerApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'CRON_SECRET'
              secretRef: 'cron-secret'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
  dependsOn: [
    registryPull
  ]
}

output containerAppName string = containerApp.name
output notificationJobName string = notificationJob.name
output containerRegistryName string = registry.name
output containerRegistryLoginServer string = registry.properties.loginServer
output applicationUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output entraRedirectUri string = 'https://${containerApp.properties.configuration.ingress.fqdn}/api/auth/callback/microsoft-entra-id'
output keyVaultName string = vault.name
output postgresServerName string = postgres.name
output emailServiceName string = emailService.name
output communicationServiceName string = communicationService.name
output emailSenderAddress string = 'DoNotReply@${emailDomain.properties.fromSenderDomain}'
output storageAccountName string = storage.name
output certificationsContainerName string = certificationsContainerName
