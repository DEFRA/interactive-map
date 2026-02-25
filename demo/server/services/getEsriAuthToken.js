import { ApplicationCredentialsManager } from '@esri/arcgis-rest-request'

export default async function getToken({ clientId, clientSecret }) {
  const appManager = ApplicationCredentialsManager.fromCredentials({
    clientId,
    clientSecret
  })

  const token = await appManager.getToken()
  const expires_in = appManager.expires
    ? Math.floor((appManager.expires.getTime() - Date.now()) / 1000)
    : 7170

  return { token, expires_in }
}